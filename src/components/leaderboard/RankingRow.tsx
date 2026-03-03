import { Link } from "react-router-dom";
import { getProfilePath } from "@/lib/profileUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardUser } from "@/hooks/useLeaderboard";
import angelAvatar from "@/assets/angel-avatar.png";

interface RankingRowProps {
  user: LeaderboardUser;
  size?: "sm" | "md";
}

export function RankingRow({ user, size = "sm" }: RankingRowProps) {
  const lightIcon = user.light_info?.icon || "🌱";
  const handleText = user.handle ? `@${user.handle}` : null;
  const avatarSize = size === "md" ? "w-14 h-14" : "w-11 h-11";
  const iconSize = size === "md" ? "w-5 h-5 text-sm" : "w-4 h-4 text-xs";

  return (
    <Link
      to={getProfilePath(user.user_id, user.handle)}
      className="group block"
    >
      <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-[#daa520]/20 bg-gradient-to-b from-card/90 via-[#ffd700]/[0.03] to-card/90 hover:from-[#ffd700]/[0.06] hover:via-[#ffec8b]/[0.08] hover:to-[#ffd700]/[0.06] hover:border-[#daa520]/35 transition-all duration-300 hover:shadow-[0_2px_15px_rgba(218,165,32,0.12)] h-full">
        {/* Avatar with light icon overlay */}
        <div className="relative">
          <Avatar className={`${avatarSize} border-2 border-[#daa520]/40 shadow-[0_0_8px_rgba(255,215,0,0.15)] group-hover:border-[#ffd700]/70 transition-colors duration-300`}>
            <AvatarImage src={user.avatar_url || angelAvatar} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-primary-pale text-primary-deep">
              {user.display_name?.charAt(0) || "✦"}
            </AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 ${iconSize} drop-shadow-sm bg-card rounded-full flex items-center justify-center`}>
            {lightIcon}
          </span>
        </div>

        {/* Name centered below */}
        <p className="w-full text-[11px] sm:text-xs font-semibold text-foreground truncate text-center group-hover:text-[#b8860b] transition-colors duration-300 leading-tight">
          {user.display_name || "Ẩn danh"}
        </p>

        {/* Handle */}
        {handleText && (
          <p className="w-full text-[10px] text-muted-foreground truncate text-center -mt-1">
            {handleText}
          </p>
        )}
      </div>
    </Link>
  );
}
