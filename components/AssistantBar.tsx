"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "@/lib/types";

interface AssistantBarProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  isThinking: boolean;
  status: ConnectionStatus;
  identityName?: string;
}

const MAX_TEXTAREA_HEIGHT = 160;

export default function AssistantBar({
  onSend,
  isStreaming,
  isThinking,
  status,
  identityName,
}: AssistantBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = isStreaming || isThinking;

  // Auto-grandit la zone de saisie jusqu'à une hauteur max, puis scroll.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || busy || status !== "connected") return;
    onSend(text);
    setValue("");
    textareaRef.current?.focus();
  }, [value, busy, status, onSend]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      // Shift+Enter : comportement natif (retour à la ligne)
    },
    [handleSend]
  );

  const statusLabel: Record<ConnectionStatus, string> = {
    connecting: "Connexion…",
    connected: identityName ?? "Connecté",
    disconnected: "Déconnecté",
    error: "Erreur",
  };

  const canSend =
    value.trim().length > 0 && !busy && status === "connected";

  return (
    <div
      className="border-t border-white/[0.06] px-4 py-3 sm:px-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className={`flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors duration-200 ${
          status === "connected"
            ? "border-white/[0.08] bg-white/[0.03] focus-within:border-cyan-400/25 focus-within:bg-white/[0.05]"
            : "border-white/[0.04] bg-white/[0.02] opacity-50"
        }`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            status !== "connected"
              ? statusLabel[status]
              : isThinking
                ? "Néron réfléchit…"
                : "Écrivez votre message… (Maj+Entrée pour un saut de ligne)"
          }
          disabled={status !== "connected" || busy}
          className="max-h-40 flex-1 resize-none bg-transparent py-1 text-[14px] leading-relaxed text-white/90 placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed"
          aria-label={`Message à envoyer à ${identityName ?? "l'assistant"}`}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Envoyer"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
            canSend
              ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              : "cursor-not-allowed text-white/15"
          }`}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
