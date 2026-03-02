/**
 * useAttesterSigning — Hook for GOV Attester EIP-712 signing
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [allRequests, setAllRequests] = useState<MultisigMintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const myGroup = address ? getAttesterGroup(address) : null;
  const myName = address ? getAttesterName(address) : null;
  const isAttester = address ? isGovAttester(address) : false;

  const fetchRequests = useCallback(async () => {
    if (!myGroup) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pplp_mint_requests")
        .select("*")
        .in("status", ["pending_sig", "signing", "signed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllRequests((data || []) as MultisigMintRequest[]);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [myGroup]);

  useEffect(() => {
    if (!myGroup) return;
    fetchRequests();

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
        () => fetchRequests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myGroup, fetchRequests]);

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

        const message = {
          user: request.recipient_address,
          actionHash: request.action_hash,
          amount: BigInt(request.amount_wei || "0"),
          evidenceHash: request.evidence_hash,
          nonce: BigInt(request.nonce),
        };

        toast.loading("Đang ký EIP-712...", { id: `sign-${request.id}` });

        const signature = await signer.signTypedData(
          FUN_MONEY_DOMAIN,
          PPLP_LOCK_TYPES as unknown as Record<string, ethers.TypedDataField[]>,
          message
        );

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
            ? `✅ Đủ ${REQUIRED_SIGNATURES}/${REQUIRED_SIGNATURES} chữ ký! Sẵn sàng submit on-chain.`
            : `✓ Nhóm ${myGroup.toUpperCase()} đã ký (${completedGroups.length}/${REQUIRED_SIGNATURES})`,
          { id: `sign-${request.id}` }
        );

        await fetchRequests();
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
    [address, myGroup, myName, isAttester, fetchRequests]
  );

  // Split: pending = my group hasn't signed yet; signed = my group already signed or fully signed
  const pendingRequests = useMemo(
    () => allRequests.filter((r) => {
      const completed = r.multisig_completed_groups || [];
      return myGroup ? !completed.includes(myGroup) && r.status !== "signed" : false;
    }),
    [allRequests, myGroup]
  );

  const signedRequests = useMemo(
    () => allRequests.filter((r) => {
      const completed = r.multisig_completed_groups || [];
      return myGroup ? completed.includes(myGroup) || r.status === "signed" : r.status === "signed";
    }),
    [allRequests, myGroup]
  );

  return {
    isAttester,
    myGroup,
    myName,
    isConnected,
    address,
    pendingRequests,
    signedRequests,
    allRequests,
    isLoading,
    isSigning,
    signRequest,
    refreshRequests: fetchRequests,
  };
}
