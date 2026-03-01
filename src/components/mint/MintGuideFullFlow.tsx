import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  UserPlus,
  Wallet,
  Download,
  Save,
  Sparkles,
  CalendarClock,
  TrendingUp,
  Clock,
  Zap,
  ExternalLink,
  Copy,
  CheckCircle2,
  Shield,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { AddFUNToWalletButton } from "@/components/mint/AddFUNToWalletButton";

const CONTRACT_ADDRESS = "0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  phase: "setup" | "earn" | "claim";
  tips?: React.ReactNode;
}

const phaseColors = {
  setup: "bg-blue-600",
  earn: "bg-amber-500",
  claim: "bg-green-600",
};

const phaseLineColors = {
  setup: "bg-blue-200 dark:bg-blue-800",
  earn: "bg-amber-200 dark:bg-amber-800",
  claim: "bg-green-200 dark:bg-green-800",
};

export function MintGuideFullFlow({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    toast.success("Đã sao chép địa chỉ contract!");
  };

  const steps: Step[] = [
    // ── PHASE 1: THIẾT LẬP ──
    {
      number: 1,
      title: "Đăng ký & đăng nhập Angel AI",
      description: "Tạo tài khoản bằng email hoặc Google để bắt đầu hành trình.",
      icon: <UserPlus className="h-4 w-4" />,
      phase: "setup",
      tips: (
        <Link to="/auth" className="text-blue-600 dark:text-blue-400 text-xs underline">
          Đi tới trang Đăng nhập →
        </Link>
      ),
    },
    {
      number: 2,
      title: "Cài MetaMask & thêm BSC Testnet",
      description: "Cài ví MetaMask, sau đó thêm mạng BSC Testnet (Chain ID: 97).",
      icon: <Wallet className="h-4 w-4" />,
      phase: "setup",
      tips: (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open("https://metamask.io/download/", "_blank")}
          >
            Tải MetaMask <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      ),
    },
    {
      number: 3,
      title: "Lấy tBNB miễn phí từ Faucet",
      description: "Bạn cần tBNB (testnet BNB) để trả phí gas cho giao dịch on-chain.",
      icon: <Download className="h-4 w-4" />,
      phase: "setup",
      tips: (
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-300"
          onClick={() => window.open("https://testnet.bnbchain.org/faucet-smart", "_blank")}
        >
          <Download className="h-3 w-3 mr-1" />
          Lấy tBNB miễn phí
        </Button>
      ),
    },
    {
      number: 4,
      title: "Lưu địa chỉ ví vào Profile",
      description: "Vào trang Profile, dán địa chỉ ví MetaMask của bạn để hệ thống biết gửi FUN cho ai.",
      icon: <Save className="h-4 w-4" />,
      phase: "setup",
      tips: (
        <Link to="/profile" className="text-blue-600 dark:text-blue-400 text-xs underline">
          Đi tới Profile →
        </Link>
      ),
    },

    // ── PHASE 2: TÍCH LŨY (Epoch-based) ──
    {
      number: 5,
      title: "Thực hiện Light Actions mỗi ngày",
      description: "Chat với Angel AI, đăng bài cộng đồng, viết nhật ký, giúp đỡ bạn bè... Mỗi hành động được chấm điểm theo 5 trụ cột PPLP (S·T·H·C·U).",
      icon: <Sparkles className="h-4 w-4" />,
      phase: "earn",
      tips: (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Link to="/chat" className="text-xs text-amber-700 dark:text-amber-400 underline">Chat AI</Link>
            <Link to="/community" className="text-xs text-amber-700 dark:text-amber-400 underline">Cộng đồng</Link>
            <Link to="/earn" className="text-xs text-amber-700 dark:text-amber-400 underline">Kiếm điểm</Link>
          </div>
          <p className="text-[11px] text-muted-foreground">
            💡 Chất lượng {'>'} Số lượng. Hành động đều đặn mỗi ngày sẽ tăng Consistency Multiplier.
          </p>
        </div>
      ),
    },
    {
      number: 6,
      title: "Tích lũy Light Score trong Epoch",
      description: "Mỗi tháng = 1 Epoch. Light Score = (Base Action × 0.4 + Content × 0.6 + Sequence Bonus) × Reputation × Consistency – Integrity Penalty. Cần đạt tối thiểu 10 LS để đủ điều kiện nhận FUN.",
      icon: <TrendingUp className="h-4 w-4" />,
      phase: "earn",
      tips: (
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
            <span className="bg-amber-100 dark:bg-amber-900/30 rounded px-1 py-0.5">Cấp 1<br/>0-199</span>
            <span className="bg-amber-100 dark:bg-amber-900/30 rounded px-1 py-0.5">Cấp 2<br/>200-499</span>
            <span className="bg-amber-100 dark:bg-amber-900/30 rounded px-1 py-0.5">Cấp 3<br/>500-999</span>
            <span className="bg-amber-100 dark:bg-amber-900/30 rounded px-1 py-0.5">Cấp 4<br/>1K-2K</span>
            <span className="bg-amber-100 dark:bg-amber-900/30 rounded px-1 py-0.5">Cấp 5<br/>2000+</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ⚡ Light Score càng cao → phần thưởng FUN càng lớn.
          </p>
        </div>
      ),
    },

    // ── PHASE 3: NHẬN FUN (Epoch Allocation) ──
    {
      number: 7,
      title: "Cuối Epoch: Phân bổ FUN Money tự động",
      description: "Cuối mỗi tháng, Mint Pool (tối đa 5.000.000 FUN) được phân bổ cho tất cả user đủ điều kiện theo công thức: FUN = Pool × (Light Score của bạn ÷ Tổng Light Score hệ thống). Giới hạn tối đa 3% pool/người.",
      icon: <CalendarClock className="h-4 w-4" />,
      phase: "claim",
      tips: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <Shield className="h-3 w-3 text-green-600" />
            <span className="text-muted-foreground">Điều kiện: LS ≥ 10 + Đã chấp thuận PPLP + Không có fraud signal nghiêm trọng</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <BarChart3 className="h-3 w-3 text-blue-600" />
            <span className="text-muted-foreground">Anti-whale: Mỗi user tối đa nhận 3% tổng pool (150.000 FUN)</span>
          </div>
        </div>
      ),
    },
    {
      number: 8,
      title: "Admin ký duyệt (EIP-712) → Lock on-chain",
      description: "Admin ký chữ ký EIP-712 cho phần FUN được phân bổ → FUN Money được lock on-chain cho bạn.",
      icon: <Clock className="h-4 w-4" />,
      phase: "claim",
      tips: (
        <p className="text-xs text-muted-foreground">
          Thời gian duyệt tùy thuộc admin. Bạn sẽ thấy số Locked tăng ở Token Lifecycle.
        </p>
      ),
    },
    {
      number: 9,
      title: "Activate → Claim — Nhận FUN về ví ✨",
      description: "Nhấn Activate All (Locked → Activated), rồi Claim All (Activated → Flowing). FUN thuộc về bạn!",
      icon: <Zap className="h-4 w-4" />,
      phase: "claim",
      tips: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Mỗi bước cần 1 giao dịch MetaMask (tốn tBNB gas).</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Contract:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">
              {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            </code>
            <button onClick={copyContract} className="text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
            <a
              href={`https://testnet.bscscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              BscScan <ExternalLink className="h-3 w-3 inline" />
            </a>
          </div>
          <AddFUNToWalletButton />
        </div>
      ),
    },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                Hướng dẫn Mint FUN Money từ A đến Z
              </h3>
            </div>
            <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-1">
            {/* Epoch info banner */}
            <div className="rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 p-3 mb-3">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                🔄 <strong>Mô hình Epoch:</strong> FUN Money được phân bổ theo chu kỳ tháng dựa trên Light Score tích lũy — không phải mint từng hành động. Hành động đều đặn + chất lượng cao = phần thưởng lớn hơn.
              </p>
            </div>

            {/* Phase labels */}
            <div className="flex gap-4 text-[11px] font-medium mb-2 px-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Thiết lập</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tích lũy</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" /> Nhận FUN</span>
            </div>

            {steps.map((step, i) => (
              <div key={step.number} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${phaseColors[step.phase]} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                    {step.number}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 flex-1 ${phaseLineColors[step.phase]} mt-1`} />
                  )}
                </div>
                <div className={i < steps.length - 1 ? "pb-4" : ""}>
                  <div className="flex items-center gap-1.5">
                    {step.icon}
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  {step.tips && <div className="mt-1.5">{step.tips}</div>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
