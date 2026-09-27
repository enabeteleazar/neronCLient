import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useNeron } from "./useNeron";

// Attend un tick réel (setTimeout) pour laisser les micro-tâches (await
// dans onopen) se résoudre avant de vérifier l'état. On utilise un timer
// réel plutôt que Promise.resolve() pour éviter de dépendre du nombre
// exact de sauts de micro-tâches internes aux enchaînements async/await.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // -- Helpers réservés aux tests --
  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  fail() {
    this.onerror?.();
  }

  lastSent(): Record<string, unknown> {
    return JSON.parse(this.sent[this.sent.length - 1]);
  }
}

function lastInstance(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

/** Fait passer une connexion fraîchement créée par le cycle auth → session. */
async function connectSuccessfully(): Promise<MockWebSocket> {
  const ws = lastInstance();

  await act(async () => {
    ws.open();
    await flush();
  });
  const authId = ws.lastSent().id as number;

  await act(async () => {
    ws.message({ id: authId, result: {} });
    await flush();
  });
  const sessionId = ws.lastSent().id as number;

  await act(async () => {
    ws.message({ id: sessionId, result: {} });
    await flush();
  });

  return ws;
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useNeron", () => {
  it("s'authentifie puis ouvre une session à la connexion du socket", async () => {
    const { result } = renderHook(() => useNeron());
    expect(result.current.status).toBe("connecting");

    const ws = await connectSuccessfully();

    expect(result.current.status).toBe("connected");
    expect(JSON.parse(ws.sent[0])).toMatchObject({ method: "gateway.auth" });
    expect(JSON.parse(ws.sent[1])).toMatchObject({ method: "session.new" });
  });

  it("passe en erreur si le gateway refuse l'authentification", async () => {
    const { result } = renderHook(() => useNeron());
    const ws = lastInstance();

    await act(async () => {
      ws.open();
      await flush();
    });
    const authId = ws.lastSent().id as number;

    await act(async () => {
      ws.message({ id: authId, error: { code: 1, message: "refusé" } });
      await flush();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/authentification/i);
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
  });

  it("passe en erreur si la création de session échoue", async () => {
    const { result } = renderHook(() => useNeron());
    const ws = lastInstance();

    await act(async () => {
      ws.open();
      await flush();
    });
    const authId = ws.lastSent().id as number;

    await act(async () => {
      ws.message({ id: authId, result: {} });
      await flush();
    });
    const sessionId = ws.lastSent().id as number;

    await act(async () => {
      ws.message({ id: sessionId, error: { code: 2, message: "boom" } });
      await flush();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/conversation/i);
  });

  it("assemble les tokens de streaming dans un seul message assistant", async () => {
    const { result } = renderHook(() => useNeron());
    await connectSuccessfully();

    act(() => result.current.send("Salut"));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.isThinking).toBe(true);

    const ws = lastInstance();
    act(() => ws.message({ event: "agent.token", data: { token: "Bon" } }));
    act(() => ws.message({ event: "agent.token", data: { token: "jour" } }));

    expect(result.current.isThinking).toBe(false);
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Bonjour",
      streaming: true,
    });

    act(() => ws.message({ event: "agent.done", data: {} }));

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages[1].streaming).toBe(false);
  });

  it("affiche un message d'erreur sur agent.error et débloque l'envoi", async () => {
    const { result } = renderHook(() => useNeron());
    await connectSuccessfully();

    act(() => result.current.send("Salut"));
    const ws = lastInstance();
    act(() =>
      ws.message({ event: "agent.error", data: { message: "Ollama indisponible" } })
    );

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isThinking).toBe(false);
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last).toMatchObject({
      role: "assistant",
      error: true,
      content: "Ollama indisponible",
    });
  });

  it("ignore send() tant que la connexion n'est pas ouverte", () => {
    const { result } = renderHook(() => useNeron());
    act(() => result.current.send("trop tôt"));
    expect(result.current.messages).toHaveLength(0);
  });

  it("bloque un nouvel envoi tant que l'assistant répond", async () => {
    const { result } = renderHook(() => useNeron());
    await connectSuccessfully();

    act(() => result.current.send("un"));
    act(() => result.current.send("deux"));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ content: "un" });
  });

  it("newConversation réinitialise les messages et ouvre une nouvelle session", async () => {
    const { result } = renderHook(() => useNeron());
    const ws = await connectSuccessfully();

    act(() => result.current.send("bonjour"));
    expect(result.current.messages).toHaveLength(1);

    // Il faut que l'échange précédent se termine avant de pouvoir démarrer
    // une nouvelle conversation (newConversation() est bloqué tant que
    // isThinking/isStreaming est vrai, comme send()).
    act(() => ws.message({ event: "agent.done", data: {} }));

    act(() => result.current.newConversation());

    expect(result.current.messages).toHaveLength(0);
    const lastCall = ws.lastSent();
    expect(lastCall).toMatchObject({ method: "session.new" });
    const firstSessionId = (JSON.parse(ws.sent[1]).params as { session_id: string })
      .session_id;
    const newSessionId = (lastCall.params as { session_id: string }).session_id;
    expect(newSessionId).not.toBe(firstSessionId);
  });

  it("se reconnecte automatiquement après une fermeture du socket", async () => {
    vi.useFakeTimers();
    renderHook(() => useNeron());
    const first = lastInstance();

    act(() => {
      first.close();
    });
    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
  });
});
