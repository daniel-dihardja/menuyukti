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
  const isWaitingForReply =
    (status === "submitted" || status === "streaming") &&
    visibleMessages.length > 0 &&
    visibleMessages[visibleMessages.length - 1]?.role === "user";

  return (
    <div className="relative flex size-full flex-col divide-y overflow-hidden">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Start a conversation to see messages here"
            />
          ) : (
            <>
              {visibleMessages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    <MessageResponse>{getMessageText(msg)}</MessageResponse>
                  </MessageContent>
                </Message>
              ))}
              {isWaitingForReply && (
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
      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full px-4 pb-4">
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
    </div>
  );
}
