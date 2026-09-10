"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ConnectionStatus } from "@/lib/types";

// Résolution de l'URL WebSocket :
// 1. NEXT_PUBLIC_NERON_WS_URL si définie explicitement
// 2. Sinon construit depuis HOST + PORT
const _host = process.env.NEXT_PUBLIC_NERON_HOST ?? "localhost";
const _port = process.env.NEXT_PUBLIC_NERON_PORT ?? "18789";
const WS_URL =
  process.env.NEXT_PUBLIC_NERON_WS_URL ?? `ws://${_host}:${_port}`;
const TOKEN =
  process.env.NEXT_PUBLIC_NERON_TOKEN ?? "changez_moi";
const RECONNECT_DELAY_MS = 3000;

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function makeSessionId(): string {
  return `ui-${makeId()}`;
}

interface RpcReply {
  result?: unknown;
  error?: { code: number; message: string };
}

export interface UseNeronReturn {
  messages: ChatMessage[];
  status: ConnectionStatus;
  errorMessage: string | null;
  isStreaming: boolean;
  isThinking: boolean;
  send: (text: string) => void;
  newConversation: () => void;
}

export function useNeron(): UseNeronReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  // Vrai entre l'envoi du message et le tout premier événement de réponse
  // (agent.token / agent.done / agent.error). Comble le silence pendant
  // le traitement backend, potentiellement long (démarrage à froid Ollama).
  const [isThinking, setIsThinking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const rpcIdRef = useRef(0);
  const sessionIdRef = useRef(makeSessionId());
  // Map id → resolve pour les appels JSON-RPC attendus
  const pendingRef = useRef<Map<number, (v: RpcReply) => void>>(new Map());
  // Évite les reconnexions en boucle au démontage
  const unmountedRef = useRef(false);

  // Envoie un appel JSON-RPC sur la connexion active et attend la réponse.
  const callRpc = useCallback(
    (method: string, params: Record<string, unknown>): Promise<RpcReply> => {
      return new Promise((resolve) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          resolve({ error: { code: -1, message: "Non connecté" } });
          return;
        }
        const id = ++rpcIdRef.current;
        pendingRef.current.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    []
  );

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    setErrorMessage(null);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      // 1. Authentification (requise même avec le token par défaut)
      const authReply = await callRpc("gateway.auth", { token: TOKEN });
      if (authReply.error) {
        setStatus("error");
        setErrorMessage("Authentification refusée par le serveur Néron.");
        ws.close();
        return;
      }

      // 2. Création de session
      const sessionReply = await callRpc("session.new", {
        session_id: sessionIdRef.current,
      });
      if (sessionReply.error) {
        setStatus("error");
        setErrorMessage("Impossible d'initialiser la conversation.");
        ws.close();
        return;
      }

      setStatus("connected");
      setErrorMessage(null);
    };

    ws.onmessage = (event) => {
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(event.data as string);
      } catch {
        return;
      }

      // ── Réponse JSON-RPC (id présent) ──
      if (frame.id != null) {
        const id = frame.id as number;
        const resolve = pendingRef.current.get(id);
        if (resolve) {
          pendingRef.current.delete(id);
          resolve({
            result: frame.result,
            error: frame.error as RpcReply["error"],
          });
        }
        return;
      }

      // ── Event gateway ──
      const eventName = frame.event as string | undefined;
      const data = (frame.data ?? {}) as Record<string, unknown>;

      if (eventName === "gateway.auth_required") {
        // Le serveur demande l'auth mais onopen l'a déjà envoyée, ignoré
        return;
      }

      if (eventName === "agent.token") {
        const token = (data.token as string) ?? "";
        setIsThinking(false);
        setIsStreaming(true);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            // Ajouter le token au message en cours
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + token },
            ];
          }
          // Nouveau message assistant
          return [
            ...prev,
            {
              id: makeId(),
              role: "assistant",
              content: token,
              streaming: true,
              timestamp: new Date(),
            },
          ];
        });
        return;
      }

      if (eventName === "agent.done") {
        setIsThinking(false);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
        setIsStreaming(false);
        return;
      }

      if (eventName === "agent.error") {
        const msg = (data.message as string) ?? "Erreur inconnue";
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            content: msg,
            streaming: false,
            timestamp: new Date(),
            error: true,
          },
        ]);
        setIsStreaming(false);
        return;
      }
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === "error" ? prev : "disconnected"));
      setIsStreaming(false);
      setIsThinking(false);
      if (!unmountedRef.current) {
        setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setErrorMessage("Connexion au serveur Néron impossible.");
      ws.close();
    };
  }, [callRpc]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || isThinking) return;

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      // Ajouter le message utilisateur localement
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "user",
          content: trimmed,
          streaming: false,
          timestamp: new Date(),
        },
      ]);
      setIsThinking(true);

      // Envoyer au gateway (fire-and-forget, réponse via events)
      ws.send(
        JSON.stringify({
          id: ++rpcIdRef.current,
          method: "chat.send",
          params: {
            session_id: sessionIdRef.current,
            message: trimmed,
          },
        })
      );
    },
    [isStreaming, isThinking]
  );

  // Démarre une nouvelle conversation : nouvelle session côté serveur (pour
  // ne pas hériter du contexte précédent) et purge locale des messages.
  const newConversation = useCallback(() => {
    if (isStreaming || isThinking) return;
    sessionIdRef.current = makeSessionId();
    setMessages([]);
    if (status === "connected") {
      callRpc("session.new", { session_id: sessionIdRef.current });
    }
  }, [callRpc, isStreaming, isThinking, status]);

  return {
    messages,
    status,
    errorMessage,
    isStreaming,
    isThinking,
    send,
    newConversation,
  };
}
