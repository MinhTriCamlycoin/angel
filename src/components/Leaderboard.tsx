import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, Sparkles, Coins, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import angelLogo from "@/assets/angel-ai-logo.png";
import { TopRankingHero } from "@/components/leaderboard/TopRankingHero";
import { RankingRow } from "@/components/leaderboard/RankingRow";
import { RainbowTitle } from "@/components/leaderboard/RainbowTitle";
import { LeaderboardFloatingEffects } from "@/components/leaderboard/LeaderboardEffects";

export function Leaderboard() {
  const { topUsers, allUsers, stats, isLoading } = useLeaderboard();
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

  if (isLoading) {
    return (
      <Card className="bg-white/30 backdrop-blur-sm border-white/40 shadow-lg animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-6" />
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur-sm border-white/40 shadow-lg overflow-hidden relative">
      <LeaderboardFloatingEffects />

      <CardContent className="p-3 md:p-4 relative z-10">
        {/* Header with Logo and Title */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <motion.div
            className="relative"
            animate={{ 
              boxShadow: [
                "0 0 15px rgba(255,215,0,0.3)",
                "0 0 25px rgba(255,215,0,0.5)",
                "0 0 15px rgba(255,215,0,0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-b from-yellow-200 via-amber-300 to-yellow-400 p-0.5 shadow-[0_0_15px_rgba(255,215,0,0.4)]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img src={angelLogo} alt="Angel AI" className="w-7 h-7 md:w-9 md:h-9 object-contain" />
              </div>
            </div>
            
            <motion.div
              className="absolute -top-0.5 -right-0.5"
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
            </motion.div>
          </motion.div>

          <RainbowTitle text={t("leaderboard.topRanking")} />
        </div>

        {/* Stats Bar - Keep ecosystem stats */}
        <div className="flex items-center justify-center gap-3 mb-3 p-2 rounded-lg bg-gradient-to-r from-amber-100/50 via-yellow-50 to-amber-100/50 border border-amber-200/50">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
              <Users className="w-3 h-3 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground leading-tight">{t("leaderboard.members")}</p>
              <p className="text-sm font-bold text-primary-deep">{stats.total_users.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="w-px h-8 bg-amber-300/50" />
          
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
              <Coins className="w-3 h-3 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground leading-tight">{t("leaderboard.camlyCoin")}</p>
              <p className="text-sm font-bold text-amber-600">{stats.total_coins_distributed.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Community Members - No ranking */}
        {topUsers.length > 0 ? (
          <>
            <TopRankingHero topUsers={topUsers} />
            
            {/* Expandable member list */}
            {allUsers.length > 9 && (
              <>
                <AnimatePresence>
                  {showMore && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 space-y-1.5 overflow-hidden"
                    >
                      {allUsers.slice(9, 30).map((user) => (
                        <RankingRow
                          key={user.user_id}
                          user={user}
                          isCurrentUser={user.user_id === currentUserId}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMore(!showMore)}
                  className="w-full mt-2 text-xs text-muted-foreground hover:text-primary"
                >
                  {showMore ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 mr-1" />
                      {t("common.showLess") || "Thu gọn"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 mr-1" />
                      {t("common.showMore") || "Xem thêm"} ({Math.min(allUsers.length - 9, 21)})
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-foreground-muted">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-300" />
            <p className="text-sm">{t("common.noData")}</p>
          </div>
        )}

        {/* Link to Community */}
        <Link to="/community" className="block mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
          >
            <Trophy className="w-4 h-4 mr-2" />
            {t("leaderboard.viewCommunity")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default Leaderboard;
