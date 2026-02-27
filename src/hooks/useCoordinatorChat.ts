import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
  ai_role?: string;
}

interface ProjectContext {
  name: string;
  platform_type: string;
  value_model: string;
  token_flow_model: string;
  vision_statement: string;
  status: string;
}

// Detect corruption in Vietnamese text
function hasTextCorruption(text: string): boolean {
  if (text.includes("\uFFFD")) return true;
  if (
    /[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]\?\?[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(
      text
    )
  )
    return true;
  return false;
}

/**
 * Try to extract a JSON tool-call from assistant text.
 * Expected shape:
 * {
 *   "tool": "evolve_workspace",
 *   "args": { ... }
 * }
 *
 * Prefer ```json ...``` fenced block if present.
 */
function tryExtractToolCall(text: string): null | { tool: string; args: any } {
  // Prefer fenced JSON block first
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fence?.[1] ?? text).trim();

  // Try to find first JSON object region
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonStr = candidate.slice(start, end + 1).trim();
  try {
    const obj = JSON.parse(jsonStr);
    if (obj && typeof obj === "object" && obj.tool && obj.args) return obj;
    return null;
  } catch {
    return null;
  }
}

/**
 * Calls Cloudflare Worker route:
 * - Prefer VITE_EVOLVE_ENDPOINT (absolute) so it works on Lovable + Pages + custom domain.
 * - Fallback "/api/evolve" for same-origin deployments.
 */
async function callEvolveWorker(accessToken: string, args: any) {
  const endpoint =
    (import.meta.env.VITE_EVOLVE_ENDPOINT as string | undefined) || "/api/evolve";

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(args),
  });

  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    // ignore parse errors
  }

  if (!resp.ok) {
    const msg = data?.error || data?.message || `Evolve failed (${resp.status})`;
    throw new Error(msg);
  }

  // Worker often returns: { ok, github_status, github_response, request_id }
  if (data?.github_status && Number(data.github_status) >= 400) {
    throw new Error(
      data?.github_response || `GitHub dispatch failed (${data.github_status})`
    );
  }

  return data;
}

export function useCoordinatorChat(projectId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["coordinator-chat", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coordinator_chat_messages")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as unknown as ChatMessage[];
    },
    enabled: !!projectId,
  });

  const sendMessage = useCallback(
    async (
      content: string,
      mode: string,
      aiRole: string,
      projectContext: ProjectContext,
      existingMessages: ChatMessage[]
    ) => {
      if (!projectId || !session?.access_token) return;

      // Save user message to DB
      const { error: insertError } = await supabase
        .from("coordinator_chat_messages")
        .insert({
          project_id: projectId,
          user_id: session.user.id,
          role: "user",
          content,
          mode,
          ai_role: aiRole,
        });

      if (insertError) {
        toast.error("Failed to save message");
        return;
      }

      setIsStreaming(true);
      setStreamingContent("");

      const chatMessages = [
        ...existingMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coordinator-chat`;

      try {
        const resp = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: chatMessages,
            mode,
            ai_role: aiRole,
            project_context: projectContext,
          }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));

          if (resp.status === 402) {
            toast.error(
              "⚡ AI credits đã hết. Vui lòng nạp thêm credits trong Settings → Workspace → Usage."
            );
            setIsStreaming(false);
            setStreamingContent("");
            return;
          }

          if (resp.status === 429) {
            toast.error("⏳ Quá nhiều yêu cầu. Vui lòng thử lại sau vài giây.");
            setIsStreaming(false);
            setStreamingContent("");
            return;
          }

          throw new Error(errorData.error || `Error ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                setStreamingContent(fullContent);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        let cleanContent = fullContent;

        // Corruption detection: if stream has corruption, fallback to non-stream
        if (hasTextCorruption(fullContent)) {
          console.warn("⚠️ Corruption detected — falling back to non-stream");
          try {
            const fallbackResp = await fetch(endpointUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                messages: chatMessages,
                mode,
                ai_role: aiRole,
                project_context: projectContext,
                stream: false,
              }),
            });

            if (fallbackResp.ok) {
              const fallbackData = await fallbackResp.json();
              if (fallbackData.content) {
                cleanContent = fallbackData.content;
                setStreamingContent(cleanContent);
              }
            }
          } catch (fallbackErr) {
            console.error("Non-stream fallback failed:", fallbackErr);
          }
        }

        // Save assistant message to DB
        if (cleanContent) {
          await supabase.from("coordinator_chat_messages").insert({
            project_id: projectId,
            user_id: session.user.id,
            role: "assistant",
            content: cleanContent,
            mode,
            ai_role: aiRole,
          });
        }

        // ✅ Auto-run evolve tool-call if present
        const toolCall = cleanContent ? tryExtractToolCall(cleanContent) : null;
        if (toolCall?.tool === "evolve_workspace") {
          try {
            const args = toolCall.args || {};

            const required = [
              "file_path",
              "branch_name",
              "commit_message",
              "code_content",
            ] as const;

            for (const k of required) {
              if (!args[k] || typeof args[k] !== "string") {
                throw new Error(`Tool args missing/invalid: ${k}`);
              }
            }

            toast.message("⚙️ Angel đang gửi lệnh evolve lên GitHub…");

            const result = await callEvolveWorker(session.access_token, args);

            toast.success(
              `✅ Evolve dispatched! GitHub status: ${
                result?.github_status ?? "unknown"
              }`
            );
          } catch (err: any) {
            toast.error(err?.message || "Evolve tool failed");
          }
        }

        queryClient.invalidateQueries({
          queryKey: ["coordinator-chat", projectId],
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "AI error");
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [projectId, session, queryClient]
  );

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    refetch: messagesQuery.refetch,
  };
}
