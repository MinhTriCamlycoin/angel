import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Users, Sun, TrendingUp, Clock, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CycleData {
  id: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
  total_mint_pool: number;
  total_light_contribution: number;
  status: string;
}

interface TopAllocation {
  user_id: string;
  display_name: string | null;
  user_light_contribution: number;
  allocation_ratio: number;
  fun_allocated: number;
}

export function AdminEpochOverview() {
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["admin-epoch-current"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pplp_mint_cycles")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CycleData | null;
    },
  });

  const { data: eligibleCount } = useQuery({
    queryKey: ["admin-epoch-eligible-count", cycle?.id],
    queryFn: async () => {
      if (!cycle) return 0;
      const { count, error } = await (supabase as any)
        .from("pplp_mint_allocations")
        .select("*", { count: "exact", head: true })
        .eq("cycle_id", cycle.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!cycle?.id,
  });

  const { data: topAllocations } = useQuery({
    queryKey: ["admin-epoch-top-allocations", cycle?.id],
    queryFn: async () => {
      if (!cycle) return [];
      const { data, error } = await (supabase as any)
        .from("pplp_mint_allocations")
        .select("user_id, user_light_contribution, allocation_ratio, fun_allocated")
        .eq("cycle_id", cycle.id)
        .order("fun_allocated", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch display names
      const userIds = (data || []).map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return (data || []).map((a: any) => ({
        ...a,
        display_name: profiles?.find((p) => p.user_id === a.user_id)?.display_name || null,
      })) as TopAllocation[];
    },
    enabled: !!cycle?.id,
  });

  // Community light from features_user_day for current month
  const { data: communityLight } = useQuery({
    queryKey: ["admin-community-light", cycle?.start_date],
    queryFn: async () => {
      if (!cycle) return 0;
      const { data, error } = await (supabase as any)
        .from("features_user_day")
        .select("daily_light_score")
        .gte("date", cycle.start_date)
        .lte("date", cycle.end_date);
      if (error) throw error;
      return (data || []).reduce((sum: number, r: any) => sum + (r.daily_light_score || 0), 0);
    },
    enabled: !!cycle,
  });

  const daysRemaining = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalDays = cycle
    ? Math.ceil((new Date(cycle.end_date).getTime() - new Date(cycle.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  if (cycleLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (!cycle) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Chưa có chu kỳ Epoch nào đang mở.
        </CardContent>
      </Card>
    );
  }

  const elapsed = totalDays - daysRemaining;
  const progressPercent = Math.max(5, Math.min(100, (elapsed / totalDays) * 100));
  const epochMonth = new Date(cycle.start_date).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Epoch Overview — {epochMonth}
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            #{cycle.cycle_number}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ngày {elapsed}/{totalDays}
            </span>
            <span className="font-mono">{daysRemaining} ngày còn lại</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Mint Pool</span>
            </div>
            <p className="font-bold text-lg">{(cycle.total_mint_pool || 0).toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] text-muted-foreground uppercase">Tổng Light</span>
            </div>
            <p className="font-bold text-lg">{(communityLight || 0).toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] text-muted-foreground uppercase">Eligible</span>
            </div>
            <p className="font-bold text-lg">{eligibleCount || 0}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[10px] text-muted-foreground uppercase">Trạng thái</span>
            </div>
            <Badge className="mt-0.5 bg-green-500/10 text-green-700 text-xs">{cycle.status}</Badge>
          </div>
        </div>

        {/* Top allocations table */}
        {topAllocations && topAllocations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Top Allocations (chu kỳ trước)
            </h4>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8">User</TableHead>
                    <TableHead className="text-xs h-8 text-right">Light</TableHead>
                    <TableHead className="text-xs h-8 text-right">Ratio</TableHead>
                    <TableHead className="text-xs h-8 text-right">FUN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAllocations.map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell className="text-xs py-2">
                        {a.display_name || a.user_id.substring(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right font-mono">
                        {a.user_light_contribution.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right font-mono">
                        {(a.allocation_ratio * 100).toFixed(2)}%
                        {a.allocation_ratio >= 0.03 && (
                          <span className="text-amber-600 ml-1">(cap)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right font-mono font-medium text-amber-700">
                        {a.fun_allocated.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
