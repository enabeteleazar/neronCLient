"use client";

import type { ConnectionStatus } from "@/lib/types";

interface HeaderProps {
  identityName?: string;
  status: ConnectionStatus;
  onNewConversation: () => void;
  canStartNewConversation: boolean;
}

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connecting: "bg-amber-400 neron-pulse",
  connected: "bg-cyan-400 neron-glow",
  disconnected: "bg-white/20",
  error: "bg-red-400",
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connexion…",
  connected: "En ligne",
  disconnected: "Hors ligne",
  error: "Erreur",
};

export default function Header({
  identityName,
  status,
  onNewConversation,
  canStartNewConversation,
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex flex-col">
        <span className="font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-white/85">
          {identityName ?? "Néron"}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {canStartNewConversation && (
        <button
          onClick={onNewConversation}
          className="rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
          aria-label="Démarrer une nouvelle conversation"
        >
          Nouvelle conversation
        </button>
      )}
    </header>
  );
}
