import { Link } from "react-router-dom";
import { ArrowLeft, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaderboard, LeaderboardUser } from "@/hooks/useLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { LightLevelBadge } from "@/components/leaderboard/LightLevelBadge";
import { RainbowTitle } from "@/components/leaderboard/RainbowTitle";
import { getProfilePath } from "@/lib/profileUrl";
import { motion } from "framer-motion";
import angelAvatar from "@/assets/angel-avatar.png";

function MemberCard({ user, index }: { user: LeaderboardUser; index: number }) {
  const isAnonymous = !user.display_name || user.display_name.trim() === "";
  const lightIcon = user.light_info?.icon || "🌱";
  const handleText = user.handle ? `@${user.handle}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={getProfilePath(user.user_id, user.handle)} className="group block">
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/40 bg-gradient-to-r from-muted/20 to-muted/40 hover:from-muted/40 hover:to-muted/60 transition-all shadow-sm">
          {/* Light icon */}
          <span className="text-2xl flex-shrink-0">{lightIcon}</span>

          {/* Avatar */}
          <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-border/50 shadow-sm">
            <AvatarImage src={user.avatar_url || angelAvatar} />
            <AvatarFallback className="text-sm font-bold">
              {user.display_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Name + Handle */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {user.display_name || "Ẩn danh"}
            </p>
            {handleText && (
              <p className="text-sm text-muted-foreground truncate">
                {handleText}
              </p>
            )}
          </div>

          {/* Right side: Light Level Badge + Score */}
          {!isAnonymous && (
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <LightLevelBadge lightInfo={user.light_info} size="md" showTrend={false} />
              <span className="text-xs font-semibold text-amber-600">
                ⚡ {(user.light_info?.total_score ?? 0).toFixed(1)} LS
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

const LightCommunity = () => {
  const { allUsers, isLoading, refreshLeaderboard } = useLeaderboard();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <RainbowTitle text="LIGHT COMMUNITY" className="text-3xl md:text-4xl" />
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => refreshLeaderboard()}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <p className="text-center text-muted-foreground text-sm italic">
          {t("leaderboard.subtitle") || "Những người đóng góp bền vững trong hệ sinh thái FUN Play"}
        </p>
      </div>

      {/* Members list */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {allUsers.map((user, i) => (
              <MemberCard key={user.user_id} user={user} index={i} />
            ))}
            {allUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{t("common.noData")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LightCommunity;
