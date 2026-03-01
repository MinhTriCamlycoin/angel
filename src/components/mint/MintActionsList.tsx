import { useAuth } from "@/hooks/useAuth";
import { usePPLPActions } from "@/hooks/usePPLPActions";
import { useEpochPreview } from "@/hooks/useEpochPreview";
import { FUNMoneyMintCard } from "./FUNMoneyMintCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, Inbox, AlertCircle, Coins } from "lucide-react";
import { useEffect } from "react";

export function MintActionsList() {
  const { user } = useAuth();
  const { actions, isLoading, fetchActions } = usePPLPActions();
  const { preview } = useEpochPreview();

  useEffect(() => {
    if (user) {
      fetchActions();
    }
  }, [user, fetchActions]);

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
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Helper to resolve one-to-one joined data
  const resolveScore = (a: any) => {
    const s = a.pplp_scores;
    if (!s) return null;
    return Array.isArray(s) ? s[0] : s;
  };

  // Claimable: scored with decision=pass, or already minted
  const claimableActions = actions?.filter((a: any) => {
    if (a.status === "minted") return true;
    if (a.status === "scored") {
      const score = resolveScore(a);
      return score?.decision === "pass";
    }
    return false;
  }) || [];

  // Failed: scored but decision != pass
  const failedActions = actions?.filter((a: any) => {
    if (a.status === "scored") {
      const score = resolveScore(a);
      return score?.decision !== "pass";
    }
    return false;
  }) || [];

  const pendingActions = actions?.filter((a: any) => a.status === "pending") || [];

  if (claimableActions.length === 0 && failedActions.length === 0 && pendingActions.length === 0) {
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
    <div className="space-y-6">
      {/* Epoch-based info banner */}
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-600" />
          <p className="font-medium text-sm">
            💡 Mô hình Epoch — FUN được phân bổ cuối mỗi tháng
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Mỗi hành động đóng góp vào Light Score tháng này. Cuối chu kỳ, hệ thống tự động phân bổ FUN từ Mint Pool dựa trên tỷ lệ đóng góp của bạn.
          {preview && preview.is_eligible && preview.estimated_allocation > 0 && (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {" "}Dự kiến: ~{preview.estimated_allocation.toLocaleString()} FUN
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{claimableActions.length}</p>
          <p className="text-xs text-muted-foreground">Đạt điều kiện</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{pendingActions.length}</p>
          <p className="text-xs text-muted-foreground">Đang chấm điểm</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {actions?.filter((a: any) => a.status === "minted").length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Đã mint</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold">Light Actions của bạn</h3>
          <span className="text-sm text-muted-foreground">
            ({claimableActions.length} đạt{failedActions.length > 0 ? `, ${failedActions.length} không đạt` : ""}, {pendingActions.length} đang xử lý)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchActions()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Làm mới
        </Button>
      </div>

      {/* Scored/Ready actions */}
      {claimableActions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {claimableActions.map((action: any) => (
            <FUNMoneyMintCard 
              key={action.id} 
              action={action} 
              onMintSuccess={() => fetchActions()}
            />
          ))}
        </div>
      )}

      {/* Failed actions */}
      {failedActions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-500 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Không đạt điểm ({failedActions.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 opacity-60">
            {failedActions.map((action: any) => (
              <FUNMoneyMintCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Đang xử lý</h4>
          <div className="grid gap-4 md:grid-cols-2 opacity-70">
            {pendingActions.slice(0, 4).map((action: any) => (
              <FUNMoneyMintCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
