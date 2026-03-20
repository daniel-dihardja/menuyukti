"use client";

import type { UIMessage } from "ai";
import type { PromptInputMessage } from "@workspace/ui/components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Spinner } from "@workspace/ui/components/spinner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, MessageCircleIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AiArtifactPanel, type PlanningArtifact } from "./ai-artifact-panel";
import { AgentActivityFeed, type ActivityStep } from "./agent-activity-feed";

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function getActivitySteps(parts: UIMessage["parts"]): ActivityStep[] {
  const stepMap = new Map<string, ActivityStep>();
  for (const part of parts ?? []) {
    if (part.type === "data-activity" && "data" in part) {
      const a = part.data as ActivityStep;
      stepMap.set(a.step, a);
    }
  }
  return Array.from(stepMap.values());
}

export function AiChatPanel({
  analyticsId,
  locationId,
}: {
  analyticsId?: number;
  locationId: number;
}) {
  const [text, setText] = useState("");
  const [chatMode, setChatMode] = useState<"agent" | "ask">("agent");
  const threadId = useRef(crypto.randomUUID()).current;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { analyticsId, locationId, threadId, chatMode },
      }),
    [analyticsId, locationId, threadId, chatMode]
  );
  const { messages, sendMessage, status, stop } = useChat({ transport });

  const planningArtifact = useMemo<PlanningArtifact | undefined>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant") continue;
      const part = msg.parts?.find((p) => p.type === "data-planning");
      if (part && "data" in part) return part.data as PlanningArtifact;
    }
    return undefined;
  }, [messages]);

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim());
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      const content = message.text?.trim() || "Sent with attachments";
      setText("");
      await sendMessage({
        text: content,
        ...(message.files?.length ? { files: message.files } : {}),
      });
    },
    [sendMessage]
  );

  const isSubmitDisabled = useMemo(
    () => !text.trim() || status === "streaming" || status === "submitted",
    [text, status]
  );

  const visibleMessages = useMemo(
    () => messages.filter((msg) => msg.role !== "system"),
    [messages]
  );

  const isAskMode = chatMode === "ask";

  return (
    <div className="grid size-full grid-cols-3 gap-4 overflow-hidden">
      {/* Chat UI — always 1/3 width */}
      <div className="relative col-span-1 flex flex-col divide-y overflow-hidden rounded-lg border">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="No messages yet"
                description="Start a conversation to see messages here"
              />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  const isLast = msg === visibleMessages[visibleMessages.length - 1];
                  const isActiveStream =
                    isLast && (status === "submitted" || status === "streaming");
                  const msgText = getMessageText(msg);
                  const activitySteps =
                    msg.role === "assistant"
                      ? getActivitySteps(msg.parts)
                      : [];
                  const hasActivity = activitySteps.length > 0;
                  const showFallbackSpinner =
                    isActiveStream &&
                    msg.role === "assistant" &&
                    msgText.length === 0 &&
                    !hasActivity;

                  return (
                    <Message key={msg.id} from={msg.role}>
                      <MessageContent>
                        {msg.role === "assistant" && !isAskMode && (
                          <AgentActivityFeed
                            steps={activitySteps}
                            hasText={msgText.length > 0}
                            isStreaming={isActiveStream}
                          />
                        )}
                        {showFallbackSpinner ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Spinner />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <MessageResponse>{msgText}</MessageResponse>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })}
                {visibleMessages.length > 0 &&
                  (status === "submitted" || status === "streaming") &&
                  visibleMessages[visibleMessages.length - 1]?.role === "user" && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Spinner />
                          <span>Thinking...</span>
                        </div>
                      </MessageContent>
                    </Message>
                  )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 p-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="What would you like to know?"
                value={text}
                onChange={handleTextChange}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  value={chatMode}
                  onValueChange={(v) => setChatMode(v as "agent" | "ask")}
                >
                  <PromptInputSelectTrigger className="h-7 text-xs">
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    <PromptInputSelectItem value="agent">
                      <BotIcon className="size-3.5" />
                      Agent
                    </PromptInputSelectItem>
                    <PromptInputSelectItem value="ask">
                      <MessageCircleIcon className="size-3.5" />
                      Ask
                    </PromptInputSelectItem>
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isSubmitDisabled}
                status={status}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Artifact — always visible so users can review and refine the campaign in both modes */}
      <div className="col-span-2 overflow-hidden">
        <AiArtifactPanel planning={planningArtifact} />
      </div>
    </div>
  );
}
