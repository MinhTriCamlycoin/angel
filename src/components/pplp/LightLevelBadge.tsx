import { useLightLevel } from "@/hooks/useLightLevel";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LightLevelBadge() {
  const { lightLevel, isLoading } = useLightLevel();
  const { currentLanguage: language } = useLanguage();

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (!lightLevel) return null;

  const name = language === "vi" ? lightLevel.name_vi : lightLevel.name_en;
  const progress = lightLevel.max_score
    ? ((lightLevel.total_score - lightLevel.min_score) / (lightLevel.max_score - lightLevel.min_score)) * 100
    : 100;

  return (
    <Card className="border-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
            style={{ backgroundColor: lightLevel.color + "22", borderColor: lightLevel.color, borderWidth: 2 }}
          >
            {lightLevel.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {language === "vi" ? "Cấp độ Ánh Sáng" : "Light Level"} {lightLevel.level}
            </p>
            <h3 className="text-lg font-bold truncate" style={{ color: lightLevel.color }}>
              {name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, progress)}%`, backgroundColor: lightLevel.color }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
