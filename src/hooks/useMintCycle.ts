import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MintCycle {
  id: string;
  cycle_number: number;
  cycle_type: string;
  start_date: string;
  end_date: string;
  total_mint_pool: number;
  total_light_contribution: number;
  status: string;
}

export interface MintAllocation {
  id: string;
  cycle_id: string;
  user_id: string;
  user_light_contribution: number;
  allocation_ratio: number;
  fun_allocated: number;
  status: string;
}

export function useMintCycle() {
  const { user } = useAuth();

  const { data: currentCycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["mint-cycle-current"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pplp_mint_cycles")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as MintCycle | null;
    },
  });

  const { data: myAllocation, isLoading: allocationLoading } = useQuery({
    queryKey: ["mint-allocation", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Get latest distributed cycle allocation
      // Query from both tables and pick the one with highest allocation
      const [pplpResult, mintResult] = await Promise.all([
        (supabase as any)
          .from("pplp_mint_allocations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from("mint_allocations")
          .select("id, epoch_id as cycle_id, user_id, allocation_amount as fun_allocated, eligible, onchain_tx_hash, created_at")
          .eq("user_id", user.id)
          .eq("eligible", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (pplpResult.error && mintResult.error) throw pplpResult.error;
      const pplp = pplpResult.data;
      const mint = mintResult.data;
      // Pick whichever has a higher fun_allocated, preferring mint_allocations
      const data = (mint?.fun_allocated || 0) >= (pplp?.fun_allocated || 0) ? mint : pplp;
      // data already resolved above
      return data as MintAllocation | null;
    },
    enabled: !!user?.id,
  });

  const { data: recentCycles } = useQuery({
    queryKey: ["mint-cycles-recent"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pplp_mint_cycles")
        .select("*")
        .order("cycle_number", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as MintCycle[];
    },
  });

  // Calculate time remaining
  const timeRemaining = currentCycle
    ? Math.max(0, new Date(currentCycle.end_date).getTime() - Date.now())
    : 0;

  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

  return {
    currentCycle,
    myAllocation,
    recentCycles: recentCycles || [],
    daysRemaining,
    hoursRemaining,
    isLoading: cycleLoading || allocationLoading,
  };
}
