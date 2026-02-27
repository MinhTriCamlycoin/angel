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
  const lightIcon = user.light_info?.icon || "🌱";

  return (
    <Link
      to={getProfilePath(user.user_id)}
      className="group block"
    >
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-full border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
        {/* Light icon */}
        <span className="text-sm flex-shrink-0">{lightIcon}</span>

        {/* Avatar */}
        <Avatar className="w-9 h-9 flex-shrink-0 border border-border/50">
          <AvatarImage src={user.avatar_url || angelAvatar} />
          <AvatarFallback className="text-xs">
            {user.display_name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {user.display_name || "Ẩn danh"}
        </p>

        {/* Light Level Badge */}
        <div className="flex-shrink-0">
          <LightLevelBadge lightInfo={user.light_info} size="sm" showTrend={false} />
        </div>
      </div>
    </Link>
  );
}
