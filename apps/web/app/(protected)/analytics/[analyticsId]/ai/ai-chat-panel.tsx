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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Spinner } from "@workspace/ui/components/spinner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useState } from "react";
import { AiArtifactPanel, type PlanningArtifact } from "./ai-artifact-panel";

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

export function AiChatPanel() {
  const [text, setText] = useState("");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );
  const { messages, sendMessage, status, stop } = useChat({ transport });

  const planningArtifact = useMemo<PlanningArtifact | undefined>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (
        msg?.role === "assistant" &&
        msg.metadata &&
        typeof msg.metadata === "object" &&
        "planning" in msg.metadata &&
        msg.metadata.planning &&
        typeof msg.metadata.planning === "object" &&
        "dateStart" in msg.metadata.planning &&
        "dateEnd" in msg.metadata.planning
      ) {
        return msg.metadata.planning as PlanningArtifact;
      }
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

  return (
    <div className="grid size-full grid-cols-3 gap-4 overflow-hidden">
      {/* Chat UI — 1/3 width */}
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
                  const isEmptyAssistant =
                    msg.role === "assistant" && getMessageText(msg).length === 0;
                  const showSpinner =
                    isLast &&
                    isEmptyAssistant &&
                    (status === "submitted" || status === "streaming");

                  return (
                    <Message key={msg.id} from={msg.role}>
                      <MessageContent>
                        {showSpinner ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Spinner />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <MessageResponse>{getMessageText(msg)}</MessageResponse>
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
              <PromptInputTools />
              <PromptInputSubmit
                disabled={isSubmitDisabled}
                status={status}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Artifact — 2/3 width */}
      <div className="col-span-2 overflow-hidden">
        <AiArtifactPanel planning={planningArtifact} />
      </div>
    </div>
  );
}
