import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MintRequest {
  id: string;
  action_id: string;
  actor_id: string;
  recipient_address: string;
  amount: number;
  action_hash: string;
  evidence_hash: string;
  policy_version: number;
  nonce: number;
  signature: string | null;
  signer_address: string | null;
  status: "pending" | "approved" | "signed" | "minted" | "rejected" | "expired";
  tx_hash: string | null;
  minted_at: string | null;
  created_at: string;
  updated_at: string;
  valid_after: string;
  valid_before: string;
}

/**
 * Hook to manage FUN Money mint requests.
 * Flow: User requests mint → Admin reviews → Admin signs → On-chain lock
 */
export function useMintRequest() {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  /**
   * Create a new mint request for a scored action.
   */
  const requestMint = useCallback(
    async (actionId: string, walletAddress: string): Promise<boolean> => {
      if (!user) {
        toast.error("Vui lòng đăng nhập");
        return false;
      }

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        toast.error("Địa chỉ ví không hợp lệ");
        return false;
      }

      setIsRequesting(true);

      try {
        const { data: action, error: actionError } = await supabase
          .from("pplp_actions")
          .select("id, actor_id, action_type, status, evidence_hash, pplp_scores(final_reward, decision)")
          .eq("id", actionId)
          .eq("actor_id", user.id)
          .single();

        if (actionError || !action) {
          toast.error("Không tìm thấy action");
          return false;
        }

        if (action.status === "minted") {
          toast.info("Action này đã được mint");
          return false;
        }

        if (action.status !== "scored") {
          toast.error("Action chưa được chấm điểm");
          return false;
        }

        const scoreRaw = action.pplp_scores;
        const score = Array.isArray(scoreRaw) ? scoreRaw[0] : scoreRaw;

        if (!score || score.decision !== "pass") {
          toast.error("Action không đạt điều kiện mint (Light Score < 60)");
          return false;
        }

        const { data: existing } = await supabase
          .from("pplp_mint_requests")
          .select("id, status")
          .eq("action_id", actionId)
          .maybeSingle();

        if (existing) {
          if (existing.status === "minted") {
            toast.info("Action này đã được mint on-chain");
            return false;
          }
          if (existing.status === "pending" || existing.status === "signed") {
            toast.info("Yêu cầu mint đang được xử lý");
            return false;
          }
        }

        // Unified on-chain action: always hash "FUN_REWARD" regardless of action_type
        const UNIFIED_ACTION = "FUN_REWARD";
        const actionHash = "0x" + Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", new TextEncoder().encode(UNIFIED_ACTION))
          )
        ).map(b => b.toString(16).padStart(2, "0")).join("");

        const evidenceHash = action.evidence_hash || "0x" + "0".repeat(64);

        const { error: upsertError } = await supabase
          .from("pplp_mint_requests")
          .upsert(
            {
              action_id: actionId,
              actor_id: user.id,
              recipient_address: walletAddress,
              amount: score.final_reward,
              action_hash: actionHash,
              evidence_hash: evidenceHash,
              policy_version: 1,
              nonce: 0,
              status: "pending",
              signature: null,
              signer_address: null,
              tx_hash: null,
              minted_at: null,
            },
            { onConflict: "action_id" }
          );

        if (upsertError) {
          console.error("Mint request error:", upsertError);
          toast.error("Không thể tạo yêu cầu mint");
          return false;
        }

        toast.success("🎯 Yêu cầu mint đã gửi! Admin sẽ xem xét và phê duyệt.");
        return true;
      } catch (error) {
        console.error("requestMint error:", error);
        toast.error("Có lỗi xảy ra khi gửi yêu cầu mint");
        return false;
      } finally {
        setIsRequesting(false);
      }
    },
    [user]
  );

  /**
   * Batch request mint for multiple scored+pass actions that don't have mint requests yet.
   */
  const requestMintBatch = useCallback(
    async (
      actions: Array<{ id: string; action_type: string; evidence_hash: string | null; pplp_scores: any }>,
      walletAddress: string
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      if (!user) {
        toast.error("Vui lòng đăng nhập");
        return { success: 0, skipped: 0, failed: 0 };
      }

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        toast.error("Địa chỉ ví không hợp lệ");
        return { success: 0, skipped: 0, failed: 0 };
      }

      const total = actions.length;
      let success = 0;
      let skipped = 0;
      let failed = 0;

      setBatchProgress({ current: 0, total });
      setIsRequesting(true);

      try {
        // Batch upsert in chunks of 50
        const CHUNK_SIZE = 50;
        for (let i = 0; i < actions.length; i += CHUNK_SIZE) {
          const chunk = actions.slice(i, i + CHUNK_SIZE);
          
          const records = await Promise.all(chunk.map(async (action) => {
            const scoreRaw = action.pplp_scores;
            const score = Array.isArray(scoreRaw) ? scoreRaw[0] : scoreRaw;
            if (!score || score.decision !== "pass") return null;

            // Unified on-chain action: always hash "FUN_REWARD"
            const UNIFIED_ACTION = "FUN_REWARD";
            const actionHash = "0x" + Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", new TextEncoder().encode(UNIFIED_ACTION))
              )
            ).map(b => b.toString(16).padStart(2, "0")).join("");

            return {
              action_id: action.id,
              actor_id: user.id,
              recipient_address: walletAddress,
              amount: score.final_reward,
              action_hash: actionHash,
              evidence_hash: action.evidence_hash || "0x" + "0".repeat(64),
              policy_version: 1,
              nonce: 0,
              status: "pending" as const,
              signature: null,
              signer_address: null,
              tx_hash: null,
              minted_at: null,
            };
          }));

          const validRecords = records.filter(Boolean);
          skipped += records.length - validRecords.length;

          if (validRecords.length > 0) {
            const { error } = await supabase
              .from("pplp_mint_requests")
              .upsert(validRecords as any[], { onConflict: "action_id", ignoreDuplicates: true });

            if (error) {
              console.error("Batch mint error:", error);
              failed += validRecords.length;
            } else {
              success += validRecords.length;
            }
          }

          setBatchProgress({ current: Math.min(i + CHUNK_SIZE, total), total });
        }

        if (success > 0) {
          toast.success(`🎯 Đã gửi ${success} yêu cầu mint thành công!`);
        }
        if (failed > 0) {
          toast.error(`${failed} yêu cầu bị lỗi`);
        }

        return { success, skipped, failed };
      } catch (error) {
        console.error("requestMintBatch error:", error);
        toast.error("Có lỗi xảy ra khi gửi yêu cầu mint hàng loạt");
        return { success, skipped, failed };
      } finally {
        setIsRequesting(false);
        setBatchProgress(null);
      }
    },
    [user]
  );

  /**
   * Get mint request for a specific action
   */
  const getMintRequest = useCallback(
    async (actionId: string): Promise<MintRequest | null> => {
      const { data } = await supabase
        .from("pplp_mint_requests")
        .select("*")
        .eq("action_id", actionId)
        .maybeSingle();

      return data as MintRequest | null;
    },
    []
  );

  return {
    requestMint,
    requestMintBatch,
    getMintRequest,
    isRequesting,
    batchProgress,
  };
}
