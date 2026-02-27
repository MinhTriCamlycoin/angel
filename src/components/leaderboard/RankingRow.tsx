import { Link } from "react-router-dom";
import { getProfilePath } from "@/lib/profileUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardUser } from "@/hooks/useLeaderboard";
import { LightLevelBadge } from "./LightLevelBadge";
import angelAvatar from "@/assets/angel-avatar.png";

interface RankingRowProps {
  user: LeaderboardUser;
  isCurrentUser?: boolean;
}

export function RankingRow({ user, isCurrentUser }: RankingRowProps) {
  return (
    <Link
      to={getProfilePath(user.user_id)}
      className="group relative block"
    >
      <div
        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all ${
          isCurrentUser ? "ring-2 ring-primary/30 bg-primary/5" : ""
        }`}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="relative w-8 h-8 border border-border/50">
            <AvatarImage src={user.avatar_url || angelAvatar} />
            <AvatarFallback className="text-xs">
              {user.display_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium group-hover:text-primary transition-colors ${
              isCurrentUser ? "text-primary font-semibold" : "text-foreground"
            }`}
            title={user.display_name || "Ẩn danh"}
          >
            <span className="block truncate">
              {user.display_name || "Ẩn danh"}
              {isCurrentUser && (
                <span className="ml-1 text-xs text-primary/70">(Bạn)</span>
              )}
            </span>
          </p>
        </div>

        {/* Light Level Badge instead of Coins */}
        <div className="flex-shrink-0">
          <LightLevelBadge lightInfo={user.light_info} size="md" />
        </div>
      </div>
    </Link>
  );
}
