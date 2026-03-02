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
      <div className="flex flex-col gap-1 p-2.5 rounded-2xl border border-[#daa520]/20 bg-gradient-to-b from-card/90 via-[#ffd700]/[0.03] to-card/90 hover:from-[#ffd700]/[0.06] hover:via-[#ffec8b]/[0.08] hover:to-[#ffd700]/[0.06] hover:border-[#daa520]/35 transition-all duration-300 hover:shadow-[0_2px_15px_rgba(218,165,32,0.12)] h-full w-[140px]">
        {/* Top row: Avatar + Badge side by side */}
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10 border-2 border-[#daa520]/40 shadow-[0_0_8px_rgba(255,215,0,0.15)] group-hover:border-[#ffd700]/70 transition-colors duration-300">
              <AvatarImage src={user.avatar_url || angelAvatar} className="object-cover" />
              <AvatarFallback className="text-xs font-bold bg-primary-pale text-primary-deep">
                {user.display_name?.charAt(0) || "✦"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 text-xs drop-shadow-sm bg-card rounded-full w-4 h-4 flex items-center justify-center">{lightIcon}</span>
          </div>
          {!isAnonymous && (
            <LightLevelBadge lightInfo={user.light_info} size="xs" showTrend={false} />
          )}
        </div>

        {/* Name below */}
        <p className="w-full text-[11px] sm:text-xs font-semibold text-foreground truncate group-hover:text-[#b8860b] transition-colors duration-300 leading-tight">
          {user.display_name || "Ẩn danh"}
        </p>
      </div>
    </Link>
  );
}
