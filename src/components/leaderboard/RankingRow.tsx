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
      to={getProfilePath(user.user_id)}
      className="group block"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border/40 bg-card/80 hover:bg-accent/60 hover:border-primary/20 transition-all duration-300 hover:shadow-[var(--shadow-soft)]">
        {/* Light icon */}
        <span className="text-base flex-shrink-0 drop-shadow-sm">{lightIcon}</span>

        {/* Avatar with golden ring */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 border-2 border-primary/30 shadow-sm group-hover:border-primary/60 transition-colors duration-300">
            <AvatarImage src={user.avatar_url || angelAvatar} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-primary-pale text-primary-deep">
              {user.display_name?.charAt(0) || "✦"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
          {user.display_name || "Ẩn danh"}
        </p>

        {/* Light Level Badge */}
        {!isAnonymous && (
          <div className="flex-shrink-0">
            <LightLevelBadge lightInfo={user.light_info} size="sm" showTrend={false} />
          </div>
        )}
      </div>
    </Link>
  );
}
