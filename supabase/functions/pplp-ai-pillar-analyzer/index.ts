import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalyzeRequest {
  content: string;
  content_type?: string;
  context?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, content_type, context }: AnalyzeRequest = await req.json();

    if (!content || content.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          pillars: { truth: 0, sustain: 0, heal: 0, service: 0, unity: 0 },
          ego_risk: 0,
          explanation: "Content too short to analyze"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a PPLP (Proof of Positive Light Protocol) content analyzer for the FUN ecosystem.

Your job is to evaluate content against the 5 Pillars of Light and detect Ego Risk.

## 5 Pillars (score each 0, 1, or 2):
- **Truth (Chân thật)**: Does the content express genuine truth, transparency, authenticity? 0=absent, 1=present, 2=strongly present
- **Sustain (Bền vững)**: Does it contribute lasting value, educational content, durable knowledge? 0=absent, 1=present, 2=strongly present  
- **Heal (Chữa lành)**: Does it show compassion, healing, emotional support, love? 0=absent, 1=present, 2=strongly present
- **Service (Phụng sự)**: Does it serve others, help the community, create benefit? 0=absent, 1=present, 2=strongly present
- **Unity (Hợp nhất)**: Does it promote connection, collaboration, oneness? 0=absent, 1=present, 2=strongly present

## Ego Risk (0.0 to 1.0):
Detect signs of ego: boasting, manipulation, division, attacking others, seeking attention/fame.
- 0.0 = no ego detected
- 0.5 = mild ego signals
- 1.0 = strong ego/toxic content

Respond ONLY with the tool call.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this ${content_type || 'content'}:\n\n${content.slice(0, 2000)}${context ? `\n\nContext: ${context}` : ''}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_pplp_pillars",
            description: "Return pillar scores and ego risk for content",
            parameters: {
              type: "object",
              properties: {
                truth: { type: "integer", enum: [0, 1, 2], description: "Truth/Transparency pillar score" },
                sustain: { type: "integer", enum: [0, 1, 2], description: "Sustainability/Durability pillar score" },
                heal: { type: "integer", enum: [0, 1, 2], description: "Healing/Compassion pillar score" },
                service: { type: "integer", enum: [0, 1, 2], description: "Service/Contribution pillar score" },
                unity: { type: "integer", enum: [0, 1, 2], description: "Unity/Connection pillar score" },
                ego_risk: { type: "number", description: "Ego risk score 0.0-1.0" },
                explanation: { type: "string", description: "Brief explanation of the analysis" },
              },
              required: ["truth", "sustain", "heal", "service", "unity", "ego_risk", "explanation"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_pplp_pillars" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Return safe defaults on error
      return new Response(
        JSON.stringify({
          pillars: { truth: 1, sustain: 1, heal: 1, service: 1, unity: 1 },
          ego_risk: 0.1,
          explanation: "AI analysis unavailable, default scores applied"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({
          pillars: { truth: 1, sustain: 1, heal: 1, service: 1, unity: 1 },
          ego_risk: 0.1,
          explanation: "AI did not return structured analysis"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    const result = {
      pillars: {
        truth: Math.min(2, Math.max(0, analysis.truth || 0)),
        sustain: Math.min(2, Math.max(0, analysis.sustain || 0)),
        heal: Math.min(2, Math.max(0, analysis.heal || 0)),
        service: Math.min(2, Math.max(0, analysis.service || 0)),
        unity: Math.min(2, Math.max(0, analysis.unity || 0)),
      },
      ego_risk: Math.min(1, Math.max(0, analysis.ego_risk || 0)),
      explanation: analysis.explanation || "",
    };

    console.log(`[PPLP AI Analyzer] Pillars: T${result.pillars.truth} S${result.pillars.sustain} H${result.pillars.heal} Sv${result.pillars.service} U${result.pillars.unity} | Ego: ${result.ego_risk}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("PPLP AI Analyzer error:", error);
    return new Response(
      JSON.stringify({
        pillars: { truth: 1, sustain: 1, heal: 1, service: 1, unity: 1 },
        ego_risk: 0.1,
        explanation: "Analysis error, defaults applied"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
