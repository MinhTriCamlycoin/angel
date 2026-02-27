import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LEVEL_MAP = [
  { min: 0, max: 20, name: 'Light Seed' },
  { min: 21, max: 40, name: 'Light Sprout' },
  { min: 41, max: 60, name: 'Light Builder' },
  { min: 61, max: 80, name: 'Light Guardian' },
  { min: 81, max: 999, name: 'Light Architect' },
];

function getLevel(score: number): string {
  for (const l of LEVEL_MAP) {
    if (score >= l.min && score <= l.max) return l.name;
  }
  return 'Light Seed';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get latest ledger entry
    const { data: ledger } = await supabase
      .from('light_score_ledger')
      .select('level, trend, final_light_score, period')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get consistency streak
    const { data: loginData } = await supabase
      .from('daily_login_tracking')
      .select('streak_count')
      .eq('user_id', userId)
      .order('login_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get active sequences
    const { count: activeSequences } = await supabase
      .from('pplp_behavior_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    const level = ledger?.level
      ? ledger.level.charAt(0).toUpperCase() + ledger.level.slice(1)
      : getLevel(0);

    return new Response(JSON.stringify({
      level: ledger?.level ? `Light ${level}` : 'Light Seed',
      trend: ledger?.trend || 'stable',
      consistency_streak: loginData?.streak_count || 0,
      sequence_active: activeSequences || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[LightProfile] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
