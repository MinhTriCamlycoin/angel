import { useAuth } from "@/hooks/useAuth";
import { usePPLPActions } from "@/hooks/usePPLPActions";
import { useEpochPreview } from "@/hooks/useEpochPreview";
import { MonthlyActionsGroup } from "./MonthlyActionsGroup";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, Inbox, Coins } from "lucide-react";
import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function MintActionsList() {
  const { user } = useAuth();
  const { actions, isLoading, fetchActions } = usePPLPActions();
  const { preview } = useEpochPreview();

  useEffect(() => {
    if (user) {
      fetchActions();
    }
  }, [user, fetchActions]);

  // Group actions by month
  const monthlyGroups = useMemo(() => {
    if (!actions || actions.length === 0) return [];

    const groups: Record<string, { label: string; sortKey: string; actions: any[] }> = {};

    for (const action of actions) {
      const date = new Date(action.created_at);
      const sortKey = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy", { locale: vi });
      // Capitalize first letter
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!groups[sortKey]) {
        groups[sortKey] = { label: capitalizedLabel, sortKey, actions: [] };
      }
      groups[sortKey].actions.push(action);
    }

    // Sort by month desc, actions within each month by date desc
    return Object.values(groups)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .map((g) => ({
        ...g,
        actions: g.actions.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));
  }, [actions]);

  const currentMonthKey = format(new Date(), "yyyy-MM");

  // Stats
  const resolveScore = (a: any) => {
    const s = a.pplp_scores;
    if (!s) return null;
    return Array.isArray(s) ? s[0] : s;
  };

  const totalActions = actions?.length || 0;
  const mintedCount = actions?.filter((a: any) => a.status === "minted").length || 0;
  const passedCount = actions?.filter((a: any) => {
    if (a.status === "scored") {
      const score = resolveScore(a);
      return score?.decision === "pass";
    }
    return false;
  }).length || 0;
  const pendingCount = actions?.filter((a: any) => a.status === "pending").length || 0;

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Vui lòng đăng nhập để xem Light Actions
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (totalActions === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Inbox className="h-8 w-8 text-amber-600" />
        </div>
        <div>
          <h3 className="font-medium">Chưa có Light Action nào</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Thực hiện các hành động yêu thương (chat, đăng bài, viết nhật ký) để tích lũy Light Actions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Epoch info banner - compact */}
      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 text-xs">
        <Coins className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-muted-foreground">
          💡 Mô hình Epoch — FUN được phân bổ cuối mỗi tháng dựa trên Light Score
          {preview && preview.is_eligible && preview.estimated_allocation > 0 && (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {" "}· Dự kiến: ~{preview.estimated_allocation.toLocaleString()} FUN
            </span>
          )}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border bg-card p-2 text-center">
          <p className="text-lg font-bold">{totalActions}</p>
          <p className="text-[10px] text-muted-foreground">Tổng</p>
        </div>
        <div className="rounded-lg border bg-card p-2 text-center">
          <p className="text-lg font-bold text-green-600">{passedCount}</p>
          <p className="text-[10px] text-muted-foreground">Đạt</p>
        </div>
        <div className="rounded-lg border bg-card p-2 text-center">
          <p className="text-lg font-bold text-blue-600">{mintedCount}</p>
          <p className="text-[10px] text-muted-foreground">Đã mint</p>
        </div>
        <div className="rounded-lg border bg-card p-2 text-center">
          <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Chờ</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Light Actions theo tháng</h3>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fetchActions()}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Làm mới
        </Button>
      </div>

      {/* Monthly groups */}
      <div className="space-y-3">
        {monthlyGroups.map((group) => (
          <MonthlyActionsGroup
            key={group.sortKey}
            monthLabel={group.label}
            actions={group.actions}
            defaultOpen={group.sortKey === currentMonthKey}
          />
        ))}
      </div>
    </div>
  );
}
