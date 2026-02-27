import { useMintCycle } from "@/hooks/useMintCycle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, Coins } from "lucide-react";

export function MintCycleStatus() {
  const { currentCycle, myAllocation, daysRemaining, hoursRemaining, isLoading } = useMintCycle();
  const { currentLanguage: language } = useLanguage();

  if (isLoading) {
    return <Skeleton className="h-36 w-full rounded-xl" />;
  }

  const isVi = language === "vi";

  return (
    <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-sm">
            {isVi ? "Chu kỳ Mint hiện tại" : "Current Mint Cycle"}
          </h3>
        </div>

        {currentCycle ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isVi ? "Chu kỳ" : "Cycle"} #{currentCycle.cycle_number}
              </span>
              <span className="font-mono text-orange-600 font-medium">
                {daysRemaining > 0
                  ? `${daysRemaining} ${isVi ? "ngày còn lại" : "days left"}`
                  : `${hoursRemaining}h ${isVi ? "còn lại" : "left"}`}
              </span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(5, 100 - (daysRemaining / 7) * 100)}%`,
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {isVi
                ? "FUN Money được mint theo chu kỳ — không tức thì. Điều này chống lại hành vi kích thích dopamine ngắn hạn."
                : "FUN Money is minted in cycles — not instantly. This prevents short-term dopamine-driven behavior."}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isVi ? "Chưa có chu kỳ mint nào đang mở." : "No active mint cycle."}
          </p>
        )}

        {myAllocation && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">
                {isVi ? "Phân bổ gần nhất:" : "Latest allocation:"}
              </span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {myAllocation.fun_allocated.toLocaleString()} FUN
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>
                {isVi ? "Tỷ lệ đóng góp:" : "Contribution ratio:"}{" "}
                {(myAllocation.allocation_ratio * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
