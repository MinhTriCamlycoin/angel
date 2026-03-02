import { Link } from "react-router-dom";
import { getProfilePath } from "@/lib/profileUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardUser } from "@/hooks/useLeaderboard";
import { LightLevelBadge } from "./LightLevelBadge";
import angelAvatar from "@/assets/angel-avatar.png";

interface RankingRowProps {
  user: LeaderboardUser;
}

export function RankingRow({ user }: RankingRowProps) {
  const isAnonymous = !user.display_name || user.display_name.trim() === "";
  const lightIcon = user.light_info?.icon || "🌱";

  return (
    <Link
      to={getProfilePath(user.user_id, user.handle)}
      className="group block"
    >
      <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-[#daa520]/20 bg-gradient-to-b from-card/90 via-[#ffd700]/[0.03] to-card/90 hover:from-[#ffd700]/[0.06] hover:via-[#ffec8b]/[0.08] hover:to-[#ffd700]/[0.06] hover:border-[#daa520]/35 transition-all duration-300 hover:shadow-[0_2px_15px_rgba(218,165,32,0.12)]">
        {/* Light icon */}
        <span className="text-sm drop-shadow-sm">{lightIcon}</span>

        {/* Avatar with golden ring */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-11 h-11 border-2 border-[#daa520]/40 shadow-[0_0_8px_rgba(255,215,0,0.15)] group-hover:border-[#ffd700]/70 transition-colors duration-300">
            <AvatarImage src={user.avatar_url || angelAvatar} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-primary-pale text-primary-deep">
              {user.display_name?.charAt(0) || "✦"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name below avatar */}
        <p className="w-full text-center text-xs font-semibold text-foreground truncate group-hover:text-[#b8860b] transition-colors duration-300 leading-tight">
          {user.display_name || "Ẩn danh"}
        </p>

        {/* Light Level Badge */}
        {!isAnonymous && (
          <LightLevelBadge lightInfo={user.light_info} size="sm" showTrend={false} />
        )}
      </div>
    </Link>
  );
}
