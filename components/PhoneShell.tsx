"use client";

import { useNeron } from "@/hooks/useNeron";
import { useIdentity } from "@/hooks/useIdentity";
import StatusBar from "./StatusBar";
import ChatView from "./ChatView";
import AssistantBar from "./AssistantBar";
import NavBar from "./NavBar";

export default function PhoneShell() {
  const { messages, status, isStreaming, isThinking, send, clear } = useNeron();
  const identity = useIdentity();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060e] p-4">
      {/* Lueur ambiante */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[600px] w-[300px] rounded-full opacity-[0.06]"
        style={{
          background:
            "radial-gradient(ellipse at center, #22d3ee 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Conteneur téléphone */}
      <main
        className="relative z-10 flex w-full max-w-[375px] flex-col overflow-hidden rounded-[38px] border border-white/[0.08] neron-glow"
        style={{
          height: "min(812px, 100dvh - 2rem)",
          background:
            "linear-gradient(160deg, #0d0d1c 0%, #08080f 50%, #060610 100%)",
        }}
      >
        {/* Ligne de lumière */}
        <div
          aria-hidden="true"
          className="absolute inset-x-16 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)",
          }}
        />

        {/* Status bar */}
        {/* DEMO: donnees statiques, a brancher sur une vraie API meteo/localisation */}
        <StatusBar weather="26°C" city="Paris" />

        {/* Chat — prend tout l'espace restant */}
        <ChatView
          messages={messages}
          isStreaming={isStreaming}
          isThinking={isThinking}
          identityName={identity.name}
        />

        {/* Bouton clear (visible si messages) */}
        {messages.length > 0 && (
          <div className="flex justify-center px-4 pb-1">
            <button
              onClick={clear}
              className="text-[10px] uppercase tracking-widest text-white/20 transition-colors hover:text-white/40"
              aria-label="Effacer la conversation"
            >
              Effacer
            </button>
          </div>
        )}

        {/* Input connecté */}
        <AssistantBar
          onSend={send}
          isStreaming={isStreaming}
          status={status}
          identityName={identity.name}
        />

        {/* Navigation */}
        <NavBar />
      </main>
    </div>
  );
}
