import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ethers } from "ethers";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  ArrowLeft, RefreshCw, Shield, Key, Zap, Clock, CheckCircle, XCircle,
  AlertTriangle, Globe, Lock
} from "lucide-react";
import AdminNavToolbar from "@/components/admin/AdminNavToolbar";
import {
  FUN_MONEY_ABI,
  FUN_MONEY_ADDRESSES,
  REGISTERED_ATTESTERS,
  FUN_MONEY_DOMAIN,
} from "@/lib/funMoneyABI";

const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const CONTRACT_ADDRESS = FUN_MONEY_ADDRESSES[97];

interface ContractState {
  name: string;
  symbol: string;
  totalSupply: bigint;
  decimals: number;
  attesterThreshold: bigint;
  epochDuration: bigint;
  epochMintCap: bigint;
  guardianGov: string;
  communityPool: string;
  pauseTransitions: boolean;
  maxSigs: bigint;
}

interface AttesterInfo {
  address: string;
  isActive: boolean;
  label: string;
}

const KNOWN_ACTIONS = [
  "FUN_REWARD",
];

interface ActionInfo {
  name: string;
  hash: string;
  allowed: boolean;
  version: number;
  deprecated: boolean;
}

const AdminContractStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [attesters, setAttesters] = useState<AttesterInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchContractState = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, FUN_MONEY_ABI, provider);

      // Fetch basic state
      const [
        name, symbol, totalSupply, decimals,
        attesterThreshold, epochDuration, epochMintCap,
        guardianGov, communityPool, pauseTransitions, maxSigs
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
        contract.decimals(),
        contract.attesterThreshold(),
        contract.epochDuration(),
        contract.epochMintCap(),
        contract.guardianGov(),
        contract.communityPool(),
        contract.pauseTransitions(),
        contract.MAX_SIGS(),
      ]);

      setContractState({
        name, symbol, totalSupply, decimals,
        attesterThreshold, epochDuration, epochMintCap,
        guardianGov, communityPool, pauseTransitions, maxSigs,
      });

      // Check registered attesters
      const attesterResults = await Promise.all(
        REGISTERED_ATTESTERS.map(async (addr, i) => {
          const isActive = await contract.isAttester(addr);
          return {
            address: addr,
            isActive,
            label: `Attester #${i + 1}`,
          };
        })
      );
      setAttesters(attesterResults);

      // Check known actions
      const actionResults = await Promise.all(
        KNOWN_ACTIONS.map(async (actionName) => {
          const hash = ethers.keccak256(ethers.toUtf8Bytes(actionName));
          const result = await contract.actions(hash);
          return {
            name: actionName,
            hash,
            allowed: result.allowed,
            version: Number(result.version),
            deprecated: result.deprecated,
          };
        })
      );
      setActions(actionResults);

      setLastUpdated(new Date());
      toast.success("Đã cập nhật trạng thái contract");
    } catch (err: any) {
      console.error("Failed to fetch contract state:", err);
      toast.error("Không thể kết nối contract: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContractState();
  }, [fetchContractState]);

  const formatBigInt = (val: bigint, decimals: number = 18) => {
    return Number(ethers.formatUnits(val, decimals)).toLocaleString("vi-VN", {
      maximumFractionDigits: 2,
    });
  };

  const formatDuration = (seconds: bigint) => {
    const s = Number(seconds);
    if (s >= 86400) return `${s / 86400} ngày`;
    if (s >= 3600) return `${s / 3600} giờ`;
    return `${s / 60} phút`;
  };

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">⛓️ Contract Status</h1>
            <p className="text-sm text-muted-foreground">
              FUN Money — BSC Testnet • {CONTRACT_ADDRESS}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContractState}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <AdminNavToolbar />

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mb-4">
            <Clock className="h-3 w-3 inline mr-1" />
            Cập nhật lúc: {lastUpdated.toLocaleTimeString("vi-VN")}
          </p>
        )}

        {loading && !contractState ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : contractState ? (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Globe className="h-4 w-4" />
                    Token
                  </div>
                  <p className="text-lg font-bold">{contractState.name}</p>
                  <p className="text-sm text-muted-foreground">{contractState.symbol} • {contractState.decimals} decimals</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Zap className="h-4 w-4" />
                    Total Supply
                  </div>
                  <p className="text-lg font-bold">{formatBigInt(contractState.totalSupply, contractState.decimals)}</p>
                  <p className="text-sm text-muted-foreground">FUN đã mint</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Key className="h-4 w-4" />
                    Attester Threshold
                  </div>
                  <p className="text-lg font-bold">{contractState.attesterThreshold.toString()}-sig</p>
                  <p className="text-sm text-muted-foreground">
                    Max: {contractState.maxSigs.toString()} sigs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    {contractState.pauseTransitions ? (
                      <Lock className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    Transitions
                  </div>
                  <p className="text-lg font-bold">
                    {contractState.pauseTransitions ? (
                      <span className="text-destructive">PAUSED</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">ACTIVE</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Lock & Activate</p>
                </CardContent>
              </Card>
            </div>

            {/* Epoch & Governance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Epoch Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Epoch Duration</span>
                    <span className="text-sm font-medium">{formatDuration(contractState.epochDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Epoch Mint Cap</span>
                    <span className="text-sm font-medium">
                      {formatBigInt(contractState.epochMintCap, contractState.decimals)} FUN
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Governance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Guardian Gov</span>
                    <a
                      href={`https://testnet.bscscan.com/address/${contractState.guardianGov}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {shortenAddress(contractState.guardianGov)}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Community Pool</span>
                    <a
                      href={`https://testnet.bscscan.com/address/${contractState.communityPool}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {shortenAddress(contractState.communityPool)}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attesters Table */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Registered Attesters
                  <Badge variant="secondary" className="ml-auto">
                    {attesters.filter(a => a.isActive).length} active / {attesters.length} total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attesters.map((att, i) => (
                      <TableRow key={att.address}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>
                          <a
                            href={`https://testnet.bscscan.com/address/${att.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {att.address}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {att.label} — Mint Signer (NOT Treasury)
                        </TableCell>
                        <TableCell>
                          {att.isActive ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" /> Inactive
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {attesters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Không có attester nào được đăng ký
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Attester wallet ĐỘC LẬP với Treasury wallet (0x4163...9ac8). 
                  Attester chỉ ký mint — Treasury chỉ chi trả thưởng.
                </p>
              </CardContent>
            </Card>

            {/* Actions Registry */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Action Registry
                  <Badge variant="secondary" className="ml-auto">
                    {actions.filter(a => a.allowed).length} allowed
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.name}>
                        <TableCell className="font-medium font-mono">{action.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {action.hash.slice(0, 10)}...{action.hash.slice(-8)}
                        </TableCell>
                        <TableCell>v{action.version}</TableCell>
                        <TableCell>
                          {action.deprecated ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Deprecated
                            </Badge>
                          ) : action.allowed ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" /> Allowed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" /> Not Registered
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">
                  Tất cả reward types sử dụng mã định danh on-chain duy nhất: <code className="bg-muted px-1 rounded">FUN_REWARD</code>.
                  Phân biệt chi tiết loại hành động tại tầng database.
                </p>
              </CardContent>
            </Card>

            {/* EIP-712 Domain Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  EIP-712 Domain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{FUN_MONEY_DOMAIN.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="ml-2 font-medium">{FUN_MONEY_DOMAIN.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chain ID:</span>
                    <span className="ml-2 font-medium">{FUN_MONEY_DOMAIN.chainId} (BSC Testnet)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contract:</span>
                    <a
                      href={`https://testnet.bscscan.com/address/${FUN_MONEY_DOMAIN.verifyingContract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-mono text-primary hover:underline"
                    >
                      {shortenAddress(FUN_MONEY_DOMAIN.verifyingContract)}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-3" />
              <p className="text-muted-foreground">Không thể kết nối đến contract. Kiểm tra RPC endpoint.</p>
              <Button variant="outline" className="mt-4" onClick={fetchContractState}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminContractStatus;
