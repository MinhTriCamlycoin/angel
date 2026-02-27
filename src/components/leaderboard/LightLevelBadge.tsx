import { CommunityLightInfo } from "@/hooks/useLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";

interface LightLevelBadgeProps {
  lightInfo?: CommunityLightInfo;
  size?: "sm" | "md";
  showTrend?: boolean;
}

const trendConfig = {
  growing: { icon: TrendingUp, label_vi: "Đang phát triển", label_en: "Growing", className: "text-emerald-500" },
  stable: { icon: Minus, label_vi: "Ổn định", label_en: "Stable", className: "text-blue-400" },
  reflecting: { icon: TrendingDown, label_vi: "Chiêm nghiệm", label_en: "Reflecting", className: "text-amber-400" },
  rebalancing: { icon: TrendingDown, label_vi: "Tái cân bằng", label_en: "Rebalancing", className: "text-orange-400" },
};

export function LightLevelBadge({ lightInfo, size = "md", showTrend = true }: LightLevelBadgeProps) {
  const { currentLanguage } = useLanguage();
  
  const info = lightInfo || { level: 1, name_vi: "Presence", name_en: "Presence", icon: "🌱", color: "#94a3b8", trend: "stable" };
  const trend = trendConfig[info.trend as keyof typeof trendConfig] || trendConfig.stable;
  const TrendIcon = trend.icon;
  const levelName = currentLanguage === "vi" ? info.name_vi : info.name_en;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
        <span className="text-xs">{info.icon}</span>
        {showTrend && <TrendIcon className={`w-2.5 h-2.5 ${trend.className}`} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 border border-border/50 shadow-sm">
      <span className="text-sm">{info.icon}</span>
      <span className="text-xs font-medium text-foreground">{levelName}</span>
      {showTrend && <TrendIcon className={`w-3 h-3 ${trend.className}`} />}
    </div>
  );
}
