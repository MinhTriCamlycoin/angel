import { AppLayout } from "@/components/layouts/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Globe, History, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";

function useLightScoreHistory(userId?: string) {
  return useQuery({
    queryKey: ["light-score-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("features_user_day")
        .select("date, daily_light_score, count_questions, count_posts, count_comments, count_help")
        .eq("user_id", userId!)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });
}

function useTotalLightScore(userId?: string) {
  return useQuery({
    queryKey: ["total-light-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("light_score_ledger")
        .select("total_light_score")
        .eq("user_id", userId!)
        .order("computed_at", { ascending: false })
        .limit(1);
      return (data?.[0] as any)?.total_light_score ?? 0;
    },
  });
}

export default function UnifiedLightScore() {
  const { user, isLoading } = useAuth();
  const { data: history = [], isLoading: historyLoading } = useLightScoreHistory(user?.id);
  const { data: totalLS = 0 } = useTotalLightScore(user?.id);

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const funProfileLS = 0; // Will come from bridge API
  const combinedLS = totalLS + funProfileLS;

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Light Score Tổng Hợp
          </h1>
          <p className="text-muted-foreground mt-1">Điểm Ánh Sáng từ Angel AI & FUN Profile</p>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Angel AI</p>
              <p className="text-3xl font-bold text-foreground">{Number(totalLS).toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="pt-6 text-center">
              <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">FUN Profile</p>
              <p className="text-3xl font-bold text-foreground">{funProfileLS}</p>
              <p className="text-xs text-amber-500 mt-1">Đang kết nối Bridge...</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tổng cộng</p>
              <p className="text-3xl font-bold text-primary">{combinedLS.toFixed(1)}</p>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Lịch sử Light Score (Angel AI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-muted-foreground text-center py-8">Đang tải...</p>
            ) : history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Ngày</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">LS</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Câu hỏi</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Bài viết</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Bình luận</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Giúp đỡ</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.date} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2">{format(new Date(row.date), "dd/MM/yyyy")}</td>
                        <td className="text-right py-2 px-2 font-semibold">{(row.daily_light_score ?? 0).toFixed(1)}</td>
                        <td className="text-right py-2 px-2">{row.count_questions ?? 0}</td>
                        <td className="text-right py-2 px-2">{row.count_posts ?? 0}</td>
                        <td className="text-right py-2 px-2">{row.count_comments ?? 0}</td>
                        <td className="text-right py-2 px-2">{row.count_help ?? 0}</td>
                        <td className="py-2 px-2"><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Angel AI</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4 italic">
              * Lịch sử từ FUN Profile sẽ được hiển thị khi Bridge API kết nối.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
