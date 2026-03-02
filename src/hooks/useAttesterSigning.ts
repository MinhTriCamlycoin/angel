/**
 * useAttesterSigning — Hook for GOV Attester EIP-712 signing
 * 
 * Flow:
 * 1. Connect wallet (MetaMask) → detect GOV group
 * 2. Fetch pending requests (status: pending_sig or signing, group not yet signed)
 * 3. Sign EIP-712 PureLoveProof via browser wallet
 * 4. Update multisig_signatures + multisig_completed_groups in DB
 * 5. When 3/3 groups signed → status becomes "signed"
 */

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { supabase } from "@/integrations/supabase/client";
import { useWeb3WalletContext } from "@/contexts/Web3WalletContext";
import {
  getAttesterGroup,
  getAttesterName,
  isGovAttester,
  GovGroupName,
  SIGNATURE_ORDER,
  REQUIRED_SIGNATURES,
} from "@/lib/govGroups";
import { FUN_MONEY_DOMAIN, PPLP_LOCK_TYPES } from "@/lib/funMoneyABI";
import { toast } from "sonner";

export interface MultisigMintRequest {
  id: string;
  action_id: string;
  actor_id: string;
  recipient_address: string;
  amount: number;
  amount_wei: string | null;
  action_hash: string;
  evidence_hash: string;
  nonce: number;
  status: string;
  multisig_signatures: Record<string, any>;
  multisig_completed_groups: string[];
  multisig_required_groups: string[];
  platform_id: string;
  created_at: string;
  tx_hash: string | null;
}

export function useAttesterSigning() {
  const { address, isConnected } = useWeb3WalletContext();
  const [pendingRequests, setPendingRequests] = useState<MultisigMintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const myGroup = address ? getAttesterGroup(address) : null;
  const myName = address ? getAttesterName(address) : null;
  const isAttester = address ? isGovAttester(address) : false;

  // Fetch requests that need signing from my group
  const fetchPendingRequests = useCallback(async () => {
    if (!myGroup) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pplp_mint_requests")
        .select("*")
        .in("status", ["pending_sig", "signing"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Filter: only requests where my group hasn't signed yet
      const filtered = (data || []).filter((r: any) => {
        const completedGroups: string[] = r.multisig_completed_groups || [];
        return !completedGroups.includes(myGroup);
      });

      setPendingRequests(filtered as MultisigMintRequest[]);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [myGroup]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!myGroup) return;

    fetchPendingRequests();

    const channel = supabase
      .channel("attester-signing")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pplp_mint_requests",
          filter: "status=in.(pending_sig,signing,signed)",
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myGroup, fetchPendingRequests]);

  // Sign a specific request with EIP-712
  const signRequest = useCallback(
    async (request: MultisigMintRequest) => {
      if (!address || !myGroup || !isAttester) {
        toast.error("Ví không phải GOV Attester");
        return false;
      }

      setIsSigning(true);
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();

        // Build EIP-712 message matching contract PureLoveProof struct
        const message = {
          user: request.recipient_address,
          actionHash: request.action_hash,
          amount: BigInt(request.amount_wei || "0"),
          evidenceHash: request.evidence_hash,
          nonce: BigInt(request.nonce),
        };

        toast.loading("Đang ký EIP-712...", { id: `sign-${request.id}` });

        // Sign via MetaMask
        const signature = await signer.signTypedData(
          FUN_MONEY_DOMAIN,
          PPLP_LOCK_TYPES as unknown as Record<string, ethers.TypedDataField[]>,
          message
        );

        // Update DB: add signature to multisig_signatures
        const currentSigs = request.multisig_signatures || {};
        const updatedSigs = {
          ...currentSigs,
          [myGroup]: {
            signer: address,
            signature,
            signed_at: new Date().toISOString(),
            signer_name: myName,
          },
        };

        const completedGroups = [...(request.multisig_completed_groups || []), myGroup];
        const allGroupsSigned = SIGNATURE_ORDER.every((g) => completedGroups.includes(g));
        const newStatus = allGroupsSigned ? "signed" : "signing";

        const { error: updateError } = await supabase
          .from("pplp_mint_requests")
          .update({
            multisig_signatures: updatedSigs as any,
            multisig_completed_groups: completedGroups,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        if (updateError) throw updateError;

        toast.success(
          allGroupsSigned
            ? `✅ Đủ ${REQUIRED_SIGNATURES}/${REQUIRED_SIGNATURES} chữ ký! Request sẵn sàng submit on-chain.`
            : `✓ Nhóm ${myGroup.toUpperCase()} đã ký (${completedGroups.length}/${REQUIRED_SIGNATURES})`,
          { id: `sign-${request.id}` }
        );

        await fetchPendingRequests();
        return true;
      } catch (err: any) {
        console.error("Signing error:", err);
        const msg = err?.code === "ACTION_REJECTED"
          ? "Bạn đã từ chối ký"
          : `Lỗi ký: ${err?.message || "Unknown"}`;
        toast.error(msg, { id: `sign-${request.id}` });
        return false;
      } finally {
        setIsSigning(false);
      }
    },
    [address, myGroup, myName, isAttester, fetchPendingRequests]
  );

  return {
    isAttester,
    myGroup,
    myName,
    isConnected,
    address,
    pendingRequests,
    isLoading,
    isSigning,
    signRequest,
    refreshRequests: fetchPendingRequests,
  };
}
