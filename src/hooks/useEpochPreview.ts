import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EpochPreview {
  my_light_score: number;
  total_light: number;
  mint_pool: number;
  estimated_allocation: number;
  my_ratio: number;
  is_eligible: boolean;
  ineligibility_reason: string;
  days_remaining: number;
  epoch_period: string;
}

export function useEpochPreview() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["epoch-preview", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc("preview_epoch_allocation", {
        _user_id: user.id,
      });
      if (error) throw error;
      // RPC returns array of rows, take first
      const row = Array.isArray(data) ? data[0] : data;
      return row as EpochPreview | null;
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  return {
    preview: data ?? null,
    isLoading,
    refetch,
  };
}
