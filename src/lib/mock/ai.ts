// Mock AI store: conversations, messages, usage logs, model order, overrides.
// Backed by localStorage. Uses useSyncExternalStore for React reads.
import { useSyncExternalStore } from "react";

export type AiRole = "user" | "assistant";

export type AiMessage = {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  attachments?: { name: string; url?: string; kind: "image" | "file" }[];
  createdAt: number;
};

export type AiConversation = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type AiModelName = "tesseract" | "deepseek" | "gemini" | "claude" | "gpt";

export type AiUsageLog = {
  id: string;
  workspaceId: string;
  modelName: AiModelName;
  operation: "ocr" | "chat";
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD estimate
  success: boolean;
  processingTime: number; // ms
  companyId?: string;
  createdAt: number;
};

export type CompanyAiOverride = {
  companyId: string;
  companyName: string;
  modelName: AiModelName;
};

type State = {
  conversations: AiConversation[];
  messages: AiMessage[];
  usage: AiUsageLog[];
  order: AiModelName[];
  overrides: CompanyAiOverride[];
};

const STORAGE_KEY = "fiksu.ai.store.v1";

const DEFAULT_ORDER: AiModelName[] = ["deepseek", "gemini", "claude", "gpt"];

// Cost per 1K tokens (mocked estimates)
export const MODEL_COSTS: Record<AiModelName, { in: number; out: number; label: string; color: string }> = {
  tesseract: { in: 0,      out: 0,      label: "Tesseract (local)", color: "#94a3b8" },
  deepseek:  { in: 0.00014, out: 0.00028, label: "DeepSeek",        color: "#06b6d4" },
  gemini:    { in: 0.00025, out: 0.00075, label: "Gemini",          color: "#f59e0b" },
  claude:    { in: 0.003,   out: 0.015,   label: "Claude",          color: "#8b5cf6" },
  gpt:       { in: 0.005,   out: 0.015,   label: "ChatGPT",         color: "#10b981" },
};

function seed(): State {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const usage: AiUsageLog[] = [];
  const models: AiModelName[] = ["gemini", "deepseek", "gpt", "claude", "tesseract"];
  for (let i = 0; i < 42; i++) {
    const m = models[Math.floor(Math.random() * models.length)];
    const inTok = Math.floor(200 + Math.random() * 1200);
    const outTok = Math.floor(80 + Math.random() * 600);
    const c = MODEL_COSTS[m];
    usage.push({
      id: `u_${i}`,
      workspaceId: "ws_demo",
      modelName: m,
      operation: Math.random() > 0.6 ? "ocr" : "chat",
      inputTokens: inTok,
      outputTokens: outTok,
      cost: (inTok / 1000) * c.in + (outTok / 1000) * c.out,
      success: Math.random() > 0.05,
      processingTime: Math.floor(300 + Math.random() * 2500),
      createdAt: now - Math.floor(Math.random() * 7 * day),
    });
  }
  return {
    conversations: [],
    messages: [],
    usage,
    order: DEFAULT_ORDER,
    overrides: [
      { companyId: "c_001", companyName: "Nordic Retail Oy", modelName: "claude" },
      { companyId: "c_002", companyName: "Helsinki Cafe", modelName: "gemini" },
    ],
  };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export const aiStore = {
  getState: () => state,
  subscribe,

  createConversation(workspaceId: string, userId: string, title = "محادثة جديدة"): AiConversation {
    const conv: AiConversation = {
      id: `conv_${Date.now().toString(36)}`,
      workspaceId, userId, title,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    state = { ...state, conversations: [conv, ...state.conversations] };
    persist();
    return conv;
  },

  renameConversation(id: string, title: string) {
    state = {
      ...state,
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
    };
    persist();
  },

  deleteConversation(id: string) {
    state = {
      ...state,
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: state.messages.filter((m) => m.conversationId !== id),
    };
    persist();
  },

  addMessage(msg: Omit<AiMessage, "id" | "createdAt"> & { id?: string }) {
    const m: AiMessage = {
      id: msg.id ?? `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      ...msg,
    };
    state = {
      ...state,
      messages: [...state.messages, m],
      conversations: state.conversations.map((c) =>
        c.id === m.conversationId ? { ...c, updatedAt: Date.now() } : c,
      ),
    };
    persist();
    return m;
  },

  logUsage(entry: Omit<AiUsageLog, "id" | "createdAt">) {
    const u: AiUsageLog = {
      id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
      ...entry,
    };
    state = { ...state, usage: [u, ...state.usage] };
    persist();
    return u;
  },

  setOrder(order: AiModelName[]) {
    state = { ...state, order };
    persist();
  },

  setOverride(companyId: string, companyName: string, modelName: AiModelName) {
    const others = state.overrides.filter((o) => o.companyId !== companyId);
    state = { ...state, overrides: [...others, { companyId, companyName, modelName }] };
    persist();
  },

  removeOverride(companyId: string) {
    state = { ...state, overrides: state.overrides.filter((o) => o.companyId !== companyId) };
    persist();
  },

  reset() {
    state = seed();
    persist();
  },
};

export function useAiStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// Router: pick model based on order & override; simulates cascade for OCR fallback.
export function pickRouteOrder(companyId?: string): AiModelName[] {
  if (companyId) {
    const ov = state.overrides.find((o) => o.companyId === companyId);
    if (ov) return [ov.modelName, ...state.order.filter((m) => m !== ov.modelName)];
  }
  return state.order;
}

export function estimateCost(model: AiModelName, inputTokens: number, outputTokens: number) {
  const c = MODEL_COSTS[model];
  return (inputTokens / 1000) * c.in + (outputTokens / 1000) * c.out;
}
