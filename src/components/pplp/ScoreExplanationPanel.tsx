import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

interface LedgerEntry {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  base_score: number;
  reputation_weight: number;
  consistency_multiplier: number;
  sequence_multiplier: number;
  integrity_penalty: number;
  final_light_score: number;
  level: string;
  explain_ref: string | null;
  computed_at: string;
  rule_version: string | null;
  reason_codes: string[] | null;
  trend: string | null;
}

interface Explanation {
  id: string;
  top_contributors_json: Array<{ action_type: string; light_score: number; reward: number }>;
  penalties_json: Array<{ signal_type: string; severity: number }>;
  ai_pillar_scores: Record<string, number> | null;
  ai_ego_risk: number | null;
  ai_explanation: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  seed: 'bg-gray-500',
  sprout: 'bg-green-500',
  builder: 'bg-blue-500',
  guardian: 'bg-purple-500',
  architect: 'bg-amber-500',
};

export function ScoreExplanationPanel() {
  const { user } = useAuth();
  const { currentLanguage: language } = useLanguage();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [explanations, setExplanations] = useState<Record<string, Explanation>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      const { data: ledgerData } = await supabase
        .from('light_score_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(10);

      if (ledgerData && ledgerData.length > 0) {
        setLedger(ledgerData as unknown as LedgerEntry[]);
        
        const explainIds = ledgerData.filter(l => l.explain_ref).map(l => l.explain_ref);
        if (explainIds.length > 0) {
          const { data: explData } = await supabase
            .from('score_explanations')
            .select('*')
            .in('id', explainIds);
          
          if (explData) {
            const map: Record<string, Explanation> = {};
            for (const e of explData) {
              map[e.id] = e as unknown as Explanation;
            }
            setExplanations(map);
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) return null;
  if (loading) return <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>;
  if (ledger.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          {language === 'vi' ? 'Chưa có dữ liệu Light Score' : 'No Light Score data yet'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {language === 'vi' ? 'Giải trình Light Score' : 'Light Score Explanation'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          {ledger.map((entry) => {
            const expl = entry.explain_ref ? explanations[entry.explain_ref] : null;
            return (
              <AccordionItem key={entry.id} value={entry.id}>
                <AccordionTrigger className="text-xs py-2">
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={`${LEVEL_COLORS[entry.level] || 'bg-gray-500'} text-white text-[10px]`}>
                      {entry.level}
                    </Badge>
                    <span className="text-muted-foreground">
                      {entry.period} | {new Date(entry.period_start).toLocaleDateString()}
                    </span>
                    <span className="ml-auto font-mono text-primary">
                      {Number(entry.final_light_score).toFixed(1)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>Base: {Number(entry.base_score).toFixed(1)}</span>
                    <span>Rep: ×{Number(entry.reputation_weight).toFixed(2)}</span>
                    <span>Consistency: ×{Number(entry.consistency_multiplier).toFixed(2)}</span>
                    <span>Sequence: ×{Number(entry.sequence_multiplier).toFixed(2)}</span>
                    {entry.rule_version && (
                      <span className="col-span-2 text-[10px] bg-muted px-1.5 py-0.5 rounded w-fit">
                        Rule: {entry.rule_version}
                      </span>
                    )}
                    {Number(entry.integrity_penalty) > 0 && (
                      <span className="text-destructive col-span-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Penalty: -{Number(entry.integrity_penalty)}%
                      </span>
                    )}
                  </div>

                  {entry.reason_codes && entry.reason_codes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.reason_codes.map((code, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                          code.startsWith('INTERACTION_') || code.startsWith('RATING_') || code.startsWith('CONTENT_REVIEW') || code.startsWith('TEMPORARY_') || code.startsWith('QUALITY_')
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  )}

                  {expl && (
                    <>
                      {expl.top_contributors_json?.length > 0 && (
                        <div>
                          <p className="font-medium flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            {language === 'vi' ? 'Đóng góp chính' : 'Top Contributors'}
                          </p>
                          {expl.top_contributors_json.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex justify-between text-muted-foreground">
                              <span>{c.action_type}</span>
                              <span>LS: {Number(c.light_score).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {expl.ai_explanation && (
                        <div className="bg-muted/50 rounded p-2 text-[11px]">
                          <p className="font-medium mb-1">🤖 AI Analysis</p>
                          <p className="text-muted-foreground">{expl.ai_explanation}</p>
                          {expl.ai_ego_risk != null && Number(expl.ai_ego_risk) > 0.3 && (
                            <p className="text-amber-500 mt-1">⚠️ Ego Risk: {(Number(expl.ai_ego_risk) * 100).toFixed(0)}%</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
