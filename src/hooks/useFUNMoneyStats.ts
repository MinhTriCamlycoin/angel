import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FUNMoneyStats {
  totalAllocated: number;  // FUN allocated in epochs (ready to claim)
  totalMinted: number;     // FUN already minted on-chain
  totalPending: number;    // Current epoch Light Score (informational)
  totalAmount: number;
  isLoading: boolean;
}

export function useFUNMoneyStats(userId?: string) {
  const [stats, setStats] = useState<FUNMoneyStats>({
    totalAllocated: 0,
    totalMinted: 0,
    totalPending: 0,
    totalAmount: 0,
    isLoading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch from pplp_mint_allocations (epoch-based FUN distribution)
      const { data: allocations, error: allocError } = await supabase
        .from("pplp_mint_allocations")
        .select("fun_allocated, status, eligible")
        .eq("user_id", userId);

      if (allocError) throw allocError;

      let totalMinted = 0;
      let totalAllocated = 0;

      (allocations || []).forEach((alloc) => {
        if (!alloc.eligible) return;
        const amount = alloc.fun_allocated || 0;
        if (alloc.status === "minted" || alloc.status === "onchain") {
          totalMinted += amount;
        } else if (alloc.status === "allocated" || alloc.status === "approved" || alloc.status === "distributed") {
          totalAllocated += amount;
        }
      });

      // Also check mint_allocations table
      const { data: mintAllocs } = await supabase
        .from("mint_allocations")
        .select("allocation_amount, eligible, onchain_tx_hash")
        .eq("user_id", userId)
        .eq("eligible", true);

      (mintAllocs || []).forEach((alloc) => {
        const amount = alloc.allocation_amount || 0;
        if (alloc.onchain_tx_hash) {
          totalMinted += amount;
        } else {
          totalAllocated += amount;
        }
      });

      // Pending = current epoch Light Score contribution (informational)
      const { data: ledgerData } = await supabase
        .from("light_score_ledger")
        .select("final_light_score")
        .eq("user_id", userId);

      const currentLightScore = (ledgerData || []).reduce(
        (sum: number, row: any) => sum + (row.final_light_score || 0), 0
      );

      const totalPending = currentLightScore > 0 ? Math.round(currentLightScore) : 0;

      setStats({
        totalAllocated,
        totalMinted,
        totalPending,
        totalAmount: totalMinted + totalAllocated,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching FUN Money stats:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Backwards compatibility
  return {
    ...stats,
    totalScored: stats.totalAllocated,
  };
}
