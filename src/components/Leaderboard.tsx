import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { RankingRow } from "@/components/leaderboard/RankingRow";

export function Leaderboard() {
  const { allUsers, isLoading } = useLeaderboard();
  const { t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const displayUsers = showMore ? allUsers : allUsers.slice(0, 5);

  if (isLoading) {
    return (
      <div className="rounded-2xl p-[2px] bg-gradient-to-br from-sky-400 via-purple-500 to-pink-500 shadow-lg">
        <div className="rounded-[14px] bg-background p-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-2/3 mx-auto mb-4" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 bg-muted rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-[2px] bg-gradient-to-br from-sky-400 via-purple-500 to-pink-500 shadow-lg">
      <div className="rounded-[14px] bg-background p-4">
        {/* Title */}
        <h3 className="text-center text-sm font-bold text-foreground mb-3 tracking-wide">
          ✨ {t("leaderboard.topRanking")}
        </h3>

        {/* Member list */}
        {allUsers.length > 0 ? (
          <>
            <div className="space-y-2">
              {displayUsers.map((user, i) => (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <RankingRow user={user} />
                </motion.div>
              ))}
            </div>

            {/* Show more / less */}
            {allUsers.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMore(!showMore)}
                className="w-full mt-2.5 text-xs text-muted-foreground hover:text-primary"
              >
                {showMore ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 mr-1" />
                    {t("common.showLess") || "Thu gọn"}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    {t("common.showMore") || "Xem thêm"} ({allUsers.length - 5})
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-300" />
            <p className="text-sm">{t("common.noData")}</p>
          </div>
        )}

        {/* CTA */}
        <Link to="/community" className="block mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary hover:text-primary/80 font-semibold"
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            {t("leaderboard.viewCommunity")} →
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default Leaderboard;
