import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminNavToolbar from "@/components/admin/AdminNavToolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface WhitelistEntry {
  id: string;
  user_id: string;
  reason: string;
  whitelisted_by: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  confirmer?: {
    display_name: string | null;
  };
}

interface BlacklistGroup {
  actor_id: string;
  signal_count: number;
  signal_types: string[];
  max_severity: number;
  details: string[];
  first_detected: string;
  last_detected: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const AdminTrustList = () => {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchWhitelist(), fetchBlacklist()]);
    setLoading(false);
  };

  const fetchWhitelist = async () => {
    const { data } = await supabase
      .from("fraud_whitelist")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    const userIds = [...new Set([
      ...data.map(d => d.user_id),
      ...data.filter(d => d.whitelisted_by).map(d => d.whitelisted_by!)
    ])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setWhitelist(data.map(entry => ({
      ...entry,
      profile: profileMap.get(entry.user_id) || undefined,
      confirmer: entry.whitelisted_by ? profileMap.get(entry.whitelisted_by) || undefined : undefined,
    })));
  };

  const fetchBlacklist = async () => {
    const { data } = await supabase
      .from("pplp_fraud_signals")
      .select("actor_id, signal_type, severity, details, created_at")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    if (!data) return;

    // Group by actor_id
    const grouped = new Map<string, BlacklistGroup>();
    for (const signal of data) {
      const existing = grouped.get(signal.actor_id);
      const detailText = typeof signal.details === 'object' && signal.details
        ? JSON.stringify(signal.details)
        : String(signal.details || '');
      
      if (existing) {
        existing.signal_count++;
        if (!existing.signal_types.includes(signal.signal_type)) {
          existing.signal_types.push(signal.signal_type);
        }
        existing.max_severity = Math.max(existing.max_severity, signal.severity);
        if (detailText && !existing.details.includes(detailText)) {
          existing.details.push(detailText);
        }
        if (signal.created_at < existing.first_detected) existing.first_detected = signal.created_at;
        if (signal.created_at > existing.last_detected) existing.last_detected = signal.created_at;
      } else {
        grouped.set(signal.actor_id, {
          actor_id: signal.actor_id,
          signal_count: 1,
          signal_types: [signal.signal_type],
          max_severity: signal.severity,
          details: detailText ? [detailText] : [],
          first_detected: signal.created_at,
          last_detected: signal.created_at,
        });
      }
    }

    const actorIds = Array.from(grouped.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", actorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setBlacklist(
      Array.from(grouped.values())
        .map(g => ({ ...g, profile: profileMap.get(g.actor_id) || undefined }))
        .sort((a, b) => b.signal_count - a.signal_count)
    );
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 5) return <Badge variant="destructive">Nghiêm trọng ({severity})</Badge>;
    if (severity >= 3) return <Badge className="bg-amber-500 text-white">Trung bình ({severity})</Badge>;
    return <Badge variant="secondary">Thấp ({severity})</Badge>;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: vi });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavToolbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Whitelist & Blacklist</h1>

        <Tabs defaultValue="whitelist">
          <TabsList className="mb-4">
            <TabsTrigger value="whitelist" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Whitelist ({whitelist.length})
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Blacklist ({blacklist.length})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="whitelist">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Người xác nhận</TableHead>
                      <TableHead>Ngày thêm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whitelist.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Chưa có user nào trong whitelist
                        </TableCell>
                      </TableRow>
                    ) : (
                      whitelist.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={entry.profile?.avatar_url || ""} />
                                <AvatarFallback>{(entry.profile?.display_name || "?")[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{entry.profile?.display_name || entry.user_id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{entry.reason}</TableCell>
                          <TableCell>{entry.confirmer?.display_name || entry.whitelisted_by?.slice(0, 8) || "—"}</TableCell>
                          <TableCell>{formatDate(entry.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="blacklist">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Số tín hiệu</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mức nghiêm trọng</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Phát hiện</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklist.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Không có tín hiệu gian lận chưa xử lý
                        </TableCell>
                      </TableRow>
                    ) : (
                      blacklist.map((group) => (
                        <TableRow key={group.actor_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={group.profile?.avatar_url || ""} />
                                <AvatarFallback>{(group.profile?.display_name || "?")[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{group.profile?.display_name || group.actor_id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{group.signal_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {group.signal_types.map(t => (
                                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{getSeverityBadge(group.max_severity)}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {group.details.slice(0, 2).join("; ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(group.first_detected)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminTrustList;
