import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Coins, Users, Link2, Sparkles, Shield } from "lucide-react";

interface TransparencySnapshot {
  id: string;
  epoch_id: string;
  total_light_system: number;
  total_fun_minted: number;
  allocation_by_level: Record<string, number>;
  mentor_chains_completed: number;
  value_loops_completed: number;
  active_users: number;
  rule_version: string;
  created_at: string;
}

export function TransparencyDashboard() {
  const { currentLanguage: language } = useLanguage();

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ["transparency-snapshot"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transparency_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TransparencySnapshot | null;
    },
  });

  const { data: activeRule } = useQuery({
    queryKey: ["active-scoring-rule"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scoring_rules")
        .select("rule_version, name")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { rule_version: string; name: string } | null;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const stats = [
    {
      icon: Sun,
      label: language === "vi" ? "Tổng Light toàn hệ" : "Total System Light",
      value: snapshot ? Number(snapshot.total_light_system).toLocaleString() : "—",
      color: "text-amber-500",
    },
    {
      icon: Coins,
      label: language === "vi" ? "FUN Minted kỳ này" : "FUN Minted This Epoch",
      value: snapshot ? Number(snapshot.total_fun_minted).toLocaleString() : "—",
      color: "text-green-500",
    },
    {
      icon: Users,
      label: language === "vi" ? "Người dùng hoạt động" : "Active Users",
      value: snapshot?.active_users?.toString() || "—",
      color: "text-blue-500",
    },
    {
      icon: Link2,
      label: language === "vi" ? "Mentor Chain hoàn thành" : "Mentor Chains Completed",
      value: snapshot?.mentor_chains_completed?.toString() || "0",
      color: "text-purple-500",
    },
    {
      icon: Sparkles,
      label: language === "vi" ? "Value Loop hoàn thành" : "Value Loops Completed",
      value: snapshot?.value_loops_completed?.toString() || "0",
      color: "text-pink-500",
    },
  ];

  return (
    <Card className="border-0 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {language === "vi" ? "Minh bạch Hệ sinh thái" : "Ecosystem Transparency"}
          {activeRule && (
            <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {activeRule.rule_version}
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {language === "vi"
            ? "Thống kê toàn hệ — không hiển thị thông tin cá nhân"
            : "System-wide stats — no individual data shown"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
                  {stat.label}
                </span>
              </div>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {!snapshot && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            {language === "vi"
              ? "Chưa có dữ liệu — snapshot sẽ được tạo sau chu kỳ mint đầu tiên"
              : "No data yet — snapshot will be created after the first mint cycle"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
