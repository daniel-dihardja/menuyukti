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
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Spinner } from "@workspace/ui/components/spinner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiArtifactPanel, type PlanningArtifact, type NationalHoliday } from "./ai-artifact-panel";
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
  locationId,
  initialLocationSummary,
  analyticsRuns,
  defaultDates,
}: {
  locationId: number;
  initialLocationSummary: string | null;
  analyticsRuns: Array<{ id: string; name: string; filename: string }>;
  defaultDates: { dateStart: string; dateEnd: string };
}) {
  const [text, setText] = useState("");
  const [campaignDates, setCampaignDates] = useState(defaultDates);
  const [holidaysOverride, setHolidaysOverride] = useState<NationalHoliday[] | null | undefined>(undefined);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<number | null>(null);
  const threadId = useRef(crypto.randomUUID()).current;

  // Keep the latest request body values in a ref so the transport always reads
  // fresh state. Assigning synchronously here (not in a useEffect) guarantees
  // the ref is up-to-date before any sendMessage call triggered by the same
  // render cycle.
  const latestBodyRef = useRef<Record<string, unknown>>({});
  latestBodyRef.current = {
    locationId,
    threadId,
    dateStart: campaignDates.dateStart,
    dateEnd: campaignDates.dateEnd,
    nationalHolidays: holidaysOverride ?? null,
    initialLocationSummary,
    ...(selectedAnalyticsId !== null ? { analyticsId: selectedAnalyticsId } : {}),
  };

  // Stable transport — never recreated. prepareSendMessagesRequest is called
  // right before every fetch, so it always picks up the latest ref values.
  // messages must be explicitly included — the callback replaces the full body.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { messages, ...body, ...latestBodyRef.current },
        }),
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { messages, sendMessage, status, stop } = useChat({ transport });

  // Pre-populated artifact state — shown immediately on page load before the
  // LLM runs. The data-planning SSE events from the agent will override this
  // naturally once a conversation starts.
  const defaultPlanning = useMemo<PlanningArtifact>(
    () => ({
      dateStart: defaultDates.dateStart,
      dateEnd: defaultDates.dateEnd,
      nationalHolidays: undefined,
      locationSummary: initialLocationSummary,
      campaignBrief: null,
    }),
    [defaultDates, initialLocationSummary]
  );

  const planningArtifact = useMemo<PlanningArtifact>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant") continue;
      const parts = msg.parts ?? [];
      for (let j = parts.length - 1; j >= 0; j--) {
        const part = parts[j];
        if (part?.type === "data-planning" && "data" in part)
          return part.data as PlanningArtifact;
      }
    }
    return defaultPlanning;
  }, [messages, defaultPlanning]);

  const displayedArtifact = useMemo<PlanningArtifact>(
    () => ({
      ...planningArtifact,
      dateStart: campaignDates.dateStart,
      dateEnd: campaignDates.dateEnd,
      nationalHolidays:
        holidaysOverride !== undefined
          ? holidaysOverride
          : planningArtifact.nationalHolidays,
    }),
    [planningArtifact, campaignDates, holidaysOverride]
  );

  const handleDatesChange = useCallback(
    async (dates: { dateStart: string; dateEnd: string }) => {
      setCampaignDates(dates);
      setHolidaysOverride(undefined);
      try {
        const res = await fetch(
          `/api/holidays?locationId=${locationId}&dateStart=${dates.dateStart}&dateEnd=${dates.dateEnd}`
        );
        const json = (await res.json()) as {
          holidays?: Array<NationalHoliday & { holidayType?: string }>;
          error?: string;
        };
        // Normalize holidayType → type to match the Python agent's NationalHoliday schema
        const holidays = json.holidays?.map(({ holidayType, ...h }) => ({
          ...h,
          type: h.type ?? holidayType,
        })) ?? null;
        setHolidaysOverride(holidays);
      } catch {
        setHolidaysOverride(null);
      }
    },
    [locationId]
  );

  useEffect(() => {
    handleDatesChange(campaignDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetch holidays once on mount with the initial dates

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

  const handleCreateLocationProfile = useCallback(async () => {
    await sendMessage({ text: "Create location profile" });
  }, [sendMessage]);

  const handleCreateCampaign = useCallback(async () => {
    await sendMessage({ text: "create instagram campaign" });
  }, [sendMessage]);

  const isSubmitDisabled = useMemo(
    () => !text.trim() || status === "streaming" || status === "submitted",
    [text, status]
  );

  const isStreaming = status === "streaming" || status === "submitted";

  const visibleMessages = useMemo(
    () => messages.filter((msg) => msg.role !== "system"),
    [messages]
  );

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
                        {msg.role === "assistant" && (
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
              <PromptInputSubmit
                disabled={isSubmitDisabled}
                status={status}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Artifact — always visible and pre-populated from server data */}
      <div className="col-span-2 overflow-hidden">
        <AiArtifactPanel
          planning={displayedArtifact}
          campaignDates={campaignDates}
          onDatesChange={handleDatesChange}
          onCreateLocationProfile={handleCreateLocationProfile}
          onCreateCampaign={handleCreateCampaign}
          analyticsRuns={analyticsRuns}
          selectedAnalyticsId={selectedAnalyticsId}
          onAnalyticsIdChange={setSelectedAnalyticsId}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
