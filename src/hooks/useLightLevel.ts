import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LightLevel {
  level: number;
  name_vi: string;
  name_en: string;
  icon: string;
  color: string;
  total_score: number;
  avg_light_score: number;
  completed_sequences: number;
  min_score: number;
  max_score: number | null;
  perks: unknown[];
}

export function useLightLevel() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["light-level", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc("get_user_light_level", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as LightLevel;
    },
    enabled: !!user?.id,
  });

  return {
    lightLevel: data,
    isLoading,
  };
}
