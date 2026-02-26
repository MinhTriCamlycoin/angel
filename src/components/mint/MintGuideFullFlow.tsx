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
  Send,
  Clock,
  Zap,
  ExternalLink,
  Copy,
  CheckCircle2,
  Plus,
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
    {
      number: 5,
      title: "Thực hiện Light Actions",
      description: "Chat với Angel AI, đăng bài cộng đồng, viết nhật ký biết ơn, tặng quà cho bạn bè...",
      icon: <Sparkles className="h-4 w-4" />,
      phase: "earn",
      tips: (
        <div className="flex flex-wrap gap-2">
          <Link to="/chat" className="text-xs text-amber-700 dark:text-amber-400 underline">Chat AI</Link>
          <Link to="/community" className="text-xs text-amber-700 dark:text-amber-400 underline">Cộng đồng</Link>
          <Link to="/earn" className="text-xs text-amber-700 dark:text-amber-400 underline">Kiếm điểm</Link>
        </div>
      ),
    },
    {
      number: 6,
      title: "Gửi yêu cầu Mint",
      description: 'Khi đạt Light Score ≥ 60, nhấn "Gửi tất cả yêu cầu mint" ở danh sách bên dưới.',
      icon: <Send className="h-4 w-4" />,
      phase: "earn",
      tips: (
        <p className="text-xs text-muted-foreground">
          Angel AI chấm điểm theo 5 trụ cột PPLP. Chỉ hành động đạt ≥60 mới được mint.
        </p>
      ),
    },
    {
      number: 7,
      title: "Chờ Admin duyệt (EIP-712)",
      description: "Admin ký chữ ký EIP-712 → FUN Money được lock on-chain cho bạn. Trạng thái: Locked.",
      icon: <Clock className="h-4 w-4" />,
      phase: "claim",
      tips: (
        <p className="text-xs text-muted-foreground">
          Thời gian duyệt tùy thuộc admin. Bạn sẽ thấy số Locked tăng ở Token Lifecycle.
        </p>
      ),
    },
    {
      number: 8,
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
