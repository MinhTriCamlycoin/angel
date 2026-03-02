/**
 * useMintSubmit — Hook for Admin to submit multisig-signed requests on-chain
 * 
 * Flow:
 * 1. Verify nonce on-chain matches DB nonce
 * 2. Gather 3 signatures in order [WILL, WISDOM, LOVE]
 * 3. Call lockWithPPLP(user, action, amount, evidenceHash, [sig1, sig2, sig3])
 * 4. Update status: submitted → confirmed/failed
 */

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { supabase } from "@/integrations/supabase/client";
import { useWeb3WalletContext } from "@/contexts/Web3WalletContext";
import { FUN_MONEY_ABI, FUN_MONEY_ADDRESSES } from "@/lib/funMoneyABI";
import { SIGNATURE_ORDER, GovGroupName } from "@/lib/govGroups";
import { toast } from "sonner";
import { getActiveProvider } from "@/lib/walletProviders";

const BSC_TESTNET_CHAIN_ID = 97;

export function useMintSubmit() {
  const { isConnected } = useWeb3WalletContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Verify on-chain nonce matches DB nonce */
  const verifyNonce = useCallback(
    async (recipientAddress: string, dbNonce: number): Promise<boolean> => {
      try {
        const activeProvider = getActiveProvider();
        if (!activeProvider) throw new Error("No wallet provider");

        const provider = new ethers.BrowserProvider(activeProvider);
        const contractAddress = FUN_MONEY_ADDRESSES[BSC_TESTNET_CHAIN_ID];
        if (!contractAddress) throw new Error("Contract not deployed on this network");

        const contract = new ethers.Contract(contractAddress, FUN_MONEY_ABI, provider);
        const onChainNonce = await contract.nonces(recipientAddress);

        const matches = BigInt(dbNonce) === onChainNonce;
        if (!matches) {
          toast.error(
            `Nonce không khớp! DB: ${dbNonce}, On-chain: ${onChainNonce.toString()}. Cần tạo lại request.`
          );
        }
        return matches;
      } catch (err: any) {
        console.error("Nonce verification failed:", err);
        toast.error(`Lỗi kiểm tra nonce: ${err?.message}`);
        return false;
      }
    },
    []
  );

  /** Submit a fully-signed (3/3) request on-chain */
  const submitMint = useCallback(
    async (request: {
      id: string;
      recipient_address: string;
      action_hash: string;
      amount_wei: string;
      evidence_hash: string;
      nonce: number;
      multisig_signatures: Record<string, any>;
    }) => {
      if (!isConnected) {
        toast.error("Vui lòng kết nối ví trước");
        return false;
      }

      setIsSubmitting(true);
      try {
        const activeProvider = getActiveProvider();
        if (!activeProvider) throw new Error("No wallet provider");

        const provider = new ethers.BrowserProvider(activeProvider);
        const signer = await provider.getSigner();

        const contractAddress = FUN_MONEY_ADDRESSES[BSC_TESTNET_CHAIN_ID];
        if (!contractAddress) throw new Error("Contract not deployed");

        const contract = new ethers.Contract(contractAddress, FUN_MONEY_ABI, signer);

        // Gather signatures in order [WILL, WISDOM, LOVE]
        const signatures: string[] = [];
        for (const group of SIGNATURE_ORDER) {
          const sigData = request.multisig_signatures[group];
          if (!sigData?.signature) {
            toast.error(`Thiếu chữ ký nhóm ${group.toUpperCase()}`);
            return false;
          }
          signatures.push(sigData.signature);
        }

        // Update status to submitted
        await supabase
          .from("pplp_mint_requests")
          .update({ status: "submitted", updated_at: new Date().toISOString() })
          .eq("id", request.id);

        toast.loading("Đang gửi giao dịch on-chain...", { id: `submit-${request.id}` });

        // Decode action name from hash — use "FUN_REWARD" as unified action
        const UNIFIED_ACTION = "FUN_REWARD";

        const tx = await contract.lockWithPPLP(
          request.recipient_address,
          UNIFIED_ACTION,
          BigInt(request.amount_wei),
          request.evidence_hash,
          signatures
        );

        toast.loading(`TX đã gửi: ${tx.hash.slice(0, 10)}... Đang chờ xác nhận...`, {
          id: `submit-${request.id}`,
        });

        const receipt = await tx.wait(2); // Wait 2 confirmations

        // Update DB: confirmed
        await supabase
          .from("pplp_mint_requests")
          .update({
            status: "confirmed",
            tx_hash: receipt.hash,
            minted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        toast.success(`✅ Mint thành công! TX: ${receipt.hash.slice(0, 10)}...`, {
          id: `submit-${request.id}`,
        });

        return true;
      } catch (err: any) {
        console.error("Submit mint error:", err);

        // Update DB: failed
        await supabase
          .from("pplp_mint_requests")
          .update({
            status: "failed",
            on_chain_error: err?.message?.slice(0, 500) || "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        toast.error(`❌ Mint thất bại: ${err?.reason || err?.message || "Unknown"}`, {
          id: `submit-${request.id}`,
        });

        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isConnected]
  );

  return {
    verifyNonce,
    submitMint,
    isSubmitting,
  };
}
