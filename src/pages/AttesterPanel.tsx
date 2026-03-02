import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAttesterSigning, MultisigMintRequest } from "@/hooks/useAttesterSigning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle2, Clock, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { GOV_GROUPS, SIGNATURE_ORDER, GovGroupName } from "@/lib/govGroups";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

function SignatureStatus({ request }: { request: MultisigMintRequest }) {
  const completed = request.multisig_completed_groups || [];
  return (
    <div className="flex gap-2 flex-wrap">
      {SIGNATURE_ORDER.map((group) => {
        const g = GOV_GROUPS[group];
        const signed = completed.includes(group);
        const sigData = request.multisig_signatures?.[group];
        return (
          <Badge
            key={group}
            variant={signed ? "default" : "outline"}
            className={signed ? "bg-green-600 text-white" : ""}
          >
            {g.emoji} {g.label} {signed ? "✓" : "○"}
            {sigData?.signer_name && (
              <span className="ml-1 text-[10px] opacity-80">({sigData.signer_name})</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

function RequestCard({
  request,
  onSign,
  isSigning,
  myGroup,
}: {
  request: MultisigMintRequest;
  onSign: (r: MultisigMintRequest) => void;
  isSigning: boolean;
  myGroup: GovGroupName | null;
}) {
  const alreadySigned = myGroup
    ? (request.multisig_completed_groups || []).includes(myGroup)
    : false;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {request.id.slice(0, 8)}...
            </p>
            <p className="text-lg font-bold">{request.amount.toLocaleString()} FUN</p>
          </div>
          <Badge variant={request.status === "signed" ? "default" : "secondary"}>
            {request.status === "pending_sig"
              ? "Chờ ký"
              : request.status === "signing"
              ? "Đang ký"
              : request.status}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Ví nhận: {request.recipient_address.slice(0, 10)}...{request.recipient_address.slice(-6)}</p>
          <p>Nonce: {request.nonce}</p>
          <p>
            Tạo:{" "}
            {formatDistanceToNow(new Date(request.created_at), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>

        <SignatureStatus request={request} />

        {!alreadySigned && myGroup && (
          <Button
            onClick={() => onSign(request)}
            disabled={isSigning}
            className="w-full"
            size="sm"
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang ký...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" /> Ký xác nhận
              </>
            )}
          </Button>
        )}

        {alreadySigned && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Nhóm bạn đã ký
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttesterPanel() {
  const {
    isAttester,
    myGroup,
    myName,
    isConnected,
    address,
    pendingRequests,
    isLoading,
    isSigning,
    signRequest,
    refreshRequests,
  } = useAttesterSigning();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container max-w-2xl py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vui lòng kết nối ví MetaMask để truy cập Attester Panel.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAttester) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container max-w-2xl py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ví <code className="text-xs">{address}</code> không phải GOV Attester.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  const groupInfo = myGroup ? GOV_GROUPS[myGroup] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" /> Attester Panel
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {groupInfo?.emoji} Nhóm{" "}
              <strong>{groupInfo?.label}</strong> — {myName}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshRequests} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Không có yêu cầu nào cần ký</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pendingRequests.length} yêu cầu cần ký
            </p>
            {pendingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onSign={signRequest}
                isSigning={isSigning}
                myGroup={myGroup}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
