"use client";

import { useNeron } from "@/hooks/useNeron";
import { useIdentity } from "@/hooks/useIdentity";
import Header from "./Header";
import ChatView from "./ChatView";
import AssistantBar from "./AssistantBar";

export default function ChatShell() {
  const {
    messages,
    status,
    errorMessage,
    isStreaming,
    isThinking,
    send,
    newConversation,
  } = useNeron();
  const identity = useIdentity();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#06060e]">
      {/* Lueur ambiante, discrète, purement décorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.05]"
        style={{
          background:
            "radial-gradient(ellipse at top, #22d3ee 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <Header
        identityName={identity.name}
        status={status}
        onNewConversation={newConversation}
        canStartNewConversation={messages.length > 0}
      />

      <div className="relative z-10 mx-auto flex w-full min-h-0 flex-1 flex-col sm:max-w-3xl">
        <ChatView
          messages={messages}
          isStreaming={isStreaming}
          isThinking={isThinking}
          identityName={identity.name}
          connectionError={status === "error" ? errorMessage : null}
        />
        <AssistantBar
          onSend={send}
          isStreaming={isStreaming}
          isThinking={isThinking}
          status={status}
          identityName={identity.name}
        />
      </div>
    </div>
  );
}
