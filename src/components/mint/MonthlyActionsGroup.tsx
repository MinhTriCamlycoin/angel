import { useState } from "react";
import { ChevronDown, Calendar, Coins } from "lucide-react";
import { MintActionRow } from "./MintActionRow";

interface PPLPAction {
  id: string;
  action_type: string;
  platform_id: string;
  status: string;
  created_at: string;
  minted_at?: string;
  mint_request_hash?: string | null;
  pplp_scores?: any;
  pplp_mint_requests?: any;
}

function resolveOne<T>(data: T | T[] | undefined | null): T | undefined {
  if (!data) return undefined;
  return Array.isArray(data) ? data[0] : data;
}

interface Props {
  monthLabel: string;
  actions: PPLPAction[];
  defaultOpen?: boolean;
}

export function MonthlyActionsGroup({ monthLabel, actions, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const totalReward = actions.reduce((sum, a) => {
    const s = resolveOne(a.pplp_scores);
    return sum + (s?.final_reward || 0);
  }, 0);

  const mintedCount = actions.filter((a) => a.status === "minted").length;
  const passedCount = actions.filter((a) => {
    if (a.status === "minted") return false;
    const s = resolveOne(a.pplp_scores);
    return a.status === "scored" && s?.decision === "pass";
  }).length;
  const pendingCount = actions.filter((a) => a.status === "pending").length;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Month header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-sm">{monthLabel}</span>
          <span className="text-xs text-muted-foreground">
            {actions.length} actions
          </span>
          {mintedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {mintedCount} minted
            </span>
          )}
          {passedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {passedCount} đạt
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {pendingCount} chờ
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalReward > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">+{totalReward.toLocaleString()}</span>
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Action rows */}
      {open && (
        <div className="border-t">
          {/* Table header - desktop only */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 border-b">
            <span className="w-10">Ngày</span>
            <span className="w-24">Loại</span>
            <span className="w-16">Score</span>
            <span className="w-16 text-center">S T H C U</span>
            <span className="w-16 text-right">Reward</span>
            <span className="ml-1">Trạng thái</span>
          </div>
          {actions.map((action) => (
            <MintActionRow key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
