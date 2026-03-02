import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAttesterSigning, MultisigMintRequest } from "@/hooks/useAttesterSigning";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle2, Clock, RefreshCw, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { GOV_GROUPS, SIGNATURE_ORDER, GovGroupName, REQUIRED_SIGNATURES } from "@/lib/govGroups";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

function SignatureStatus({ request }: { request: MultisigMintRequest }) {
  const completed = request.multisig_completed_groups || [];
  return (
    <div className="space-y-2">
      {SIGNATURE_ORDER.map((group) => {
        const g = GOV_GROUPS[group];
        const signed = completed.includes(group);
        const sigData = request.multisig_signatures?.[group];
        return (
          <div
            key={group}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              signed ? "border-green-500/30 bg-green-500/10" : "border-border/50 bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{g.emoji}</span>
              <span className="font-medium">{g.label}</span>
              {signed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {sigData ? (
                <>
                  <span className="font-medium text-foreground">{sigData.signer_name}</span>
                  {sigData.signed_at && (
                    <span className="ml-2">
                      {format(new Date(sigData.signed_at), "HH:mm dd/MM", { locale: vi })}
                    </span>
                  )}
                </>
              ) : (
                <span>Chưa ký</span>
              )}
            </div>
          </div>
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
  showSignButton,
}: {
  request: MultisigMintRequest;
  onSign: (r: MultisigMintRequest) => void;
  isSigning: boolean;
  myGroup: GovGroupName | null;
  showSignButton: boolean;
}) {
  const completedCount = (request.multisig_completed_groups || []).length;
  const isFullySigned = request.status === "signed";

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
          <div className="flex flex-col items-end gap-1">
            {isFullySigned ? (
              <Badge className="bg-green-600 text-white">
                <Sparkles className="w-3 h-3 mr-1" /> Sẵn sàng mint
              </Badge>
            ) : (
              <Badge variant="secondary">
                {completedCount}/{REQUIRED_SIGNATURES} chữ ký
              </Badge>
            )}
          </div>
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

        {showSignButton && (
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
    signedRequests,
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
        ) : (
          <>
            {/* Section: Cần ký */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Cần ký ({pendingRequests.length})
              </h2>
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Không có yêu cầu nào cần ký</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onSign={signRequest}
                    isSigning={isSigning}
                    myGroup={myGroup}
                    showSignButton={true}
                  />
                ))
              )}
            </section>

            {/* Section: Đã ký */}
            {signedRequests.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Đã ký ({signedRequests.length})
                </h2>
                {signedRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onSign={signRequest}
                    isSigning={isSigning}
                    myGroup={myGroup}
                    showSignButton={false}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
