import { Link } from "react-router-dom";
import { ArrowLeft, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaderboard, LeaderboardUser } from "@/hooks/useLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { RainbowTitle } from "@/components/leaderboard/RainbowTitle";
import { LightLevelsTable } from "@/components/leaderboard/LightLevelsTable";
import { getProfilePath } from "@/lib/profileUrl";
import { motion } from "framer-motion";
import angelAvatar from "@/assets/angel-avatar.png";

function MemberCard({ user, index }: { user: LeaderboardUser; index: number }) {
  const lightIcon = user.light_info?.icon || "🌱";
  const handleText = user.handle ? `@${user.handle}` : null;
  const lightLevelName = user.light_info?.name_vi || null;
  const lightLevelIcon = user.light_info?.icon || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={getProfilePath(user.user_id, user.handle)} className="group block">
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-[#daa520]/20 bg-gradient-to-b from-card/90 via-[#ffd700]/[0.03] to-card/90 hover:from-[#ffd700]/[0.06] hover:via-[#ffec8b]/[0.08] hover:to-[#ffd700]/[0.06] hover:border-[#daa520]/35 transition-all duration-300 hover:shadow-[0_2px_15px_rgba(218,165,32,0.12)]">
          {/* Light icon */}
          <span className="text-lg sm:text-xl drop-shadow-sm shrink-0">{lightIcon}</span>

          {/* Avatar */}
          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-[#daa520]/40 shadow-[0_0_8px_rgba(255,215,0,0.15)] group-hover:border-[#ffd700]/70 transition-colors duration-300 shrink-0">
            <AvatarImage src={user.avatar_url || angelAvatar} className="object-cover" />
            <AvatarFallback className="text-sm font-bold bg-primary-pale text-primary-deep">
              {user.display_name?.charAt(0) || "✦"}
            </AvatarFallback>
          </Avatar>

          {/* Name + Handle */}
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-foreground truncate group-hover:text-[#b8860b] transition-colors duration-300">
              {user.display_name || "Ẩn danh"}
            </p>
            {handleText && (
              <p className="text-xs text-muted-foreground truncate">
                {handleText}
              </p>
            )}
          </div>

          {/* Light Level Badge (no LS score) */}
          {lightLevelName && (
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#daa520]/30 text-xs font-medium text-[#b8860b] bg-[#ffd700]/[0.08]">
                {lightLevelIcon && <span className="text-xs">{lightLevelIcon}</span>}
                {lightLevelName}
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

      {/* Light Levels Table */}
      <LightLevelsTable />

      {/* Members grid */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex flex-col gap-3 pt-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
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
