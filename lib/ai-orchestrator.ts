import type { Db } from 'mongodb';
import { emitWorkspaceAlert } from '@/lib/alerts';

type ProviderKey = 'google' | 'openai' | 'grok' | 'anthropic';
type Strategy = 'failover' | 'roundrobin' | 'single';

type ProviderCfg = { apiKey: string; model: string; enabled: boolean };
type WorkspaceSettings = {
  aiProviders: Record<ProviderKey, ProviderCfg>;
  orchestration: {
    multiModel: boolean;
    strategy: Strategy;
    concurrentMessages: number;
    activeProviders: string[];
  };
  fallback: {
    useFreeModels: boolean;
    freeProviderApiKey: string;
    freeModels: string[];
    safeReplyEnabled: boolean;
    safeReplyMessage: string;
  };
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type AgentRuntime = {
  name?: string;
  profile?: {
    systemPrompt?: string;
    personality?: string;
    languages?: string[];
    responseLength?: string;
  };
  corporateContext?: string;
  skills?: string[];
  advanced?: {
    escalationKeywords?: string;
    humanHandoffMsg?: string;
  };
};

type ProviderCandidate = {
  provider: ProviderKey;
  model: string;
  apiKey: string;
};

export type ProviderAttempt = {
  provider: string;
  model: string;
  status: 'ok' | 'error';
  reason?: string;
  errorType?: 'auth' | 'quota' | 'model_not_found' | 'invalid_request' | 'server' | 'network' | 'unknown';
  isQuotaOrTokens?: boolean;
};

const DEFAULT_SETTINGS: WorkspaceSettings = {
  aiProviders: {
    google: { apiKey: '', model: 'gemini-2.5-flash', enabled: false },
    openai: { apiKey: '', model: 'gpt-4o', enabled: false },
    grok: { apiKey: '', model: 'grok-3', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: false },
  },
  orchestration: {
    multiModel: false,
    strategy: 'failover',
    concurrentMessages: 50,
    activeProviders: [],
  },
  fallback: {
    useFreeModels: false,
    freeProviderApiKey: '',
    freeModels: ['meta-llama/llama-3.3-70b-instruct:free'],
    safeReplyEnabled: true,
    safeReplyMessage:
      'Estoy con alta demanda y no pude procesar tu mensaje ahora mismo. Intenta nuevamente en unos minutos.',
  },
};

export async function generateAgentReply(args: {
  db: Db;
  workspaceId?: string;
  agent: AgentRuntime;
  message: string;
  history?: ChatTurn[];
}) {
  const workspaceId = args.workspaceId || 'default';
  const settings = await readWorkspaceSettings(args.db, workspaceId);
  const providers = resolveProviderOrder(settings);

  const system = buildSystemPrompt(args.agent);
  const history = (args.history ?? []).slice(-12);
  const errors: string[] = [];
  const attempts: ProviderAttempt[] = [];

  if (providers.length === 0) {
    errors.push('No hay proveedores de IA activos con API key configurada.');
    await emitWorkspaceAlert({
      db: args.db,
      workspaceId,
      eventCode: 'NO_PROVIDER_CONFIGURED',
      severity: 'warning',
      title: 'Sin proveedores configurados',
      body: 'No hay proveedores IA activos o con token valido en esta organizacion.',
      meta: { module: 'ai-orchestrator' },
    }).catch(() => {});
  }

  for (const candidate of providers) {
    try {
      const reply = await callProvider({
        provider: candidate.provider,
        apiKey: candidate.apiKey,
        model: candidate.model,
        system,
        history,
        message: args.message,
        responseLength: args.agent.profile?.responseLength ?? 'standard',
      });

      return {
        reply,
        provider: candidate.provider,
        model: candidate.model,
        fallbackUsed: false,
        fallbackType: 'none' as const,
        errors,
        attempts: [...attempts, { provider: candidate.provider, model: candidate.model, status: 'ok' as const }],
        errorSummary: summarizeAttemptErrors(attempts),
      };
    } catch (err: any) {
      const reason = err?.message ?? 'error desconocido';
      const errorType = classifyProviderError(reason);
      errors.push(`${candidate.provider}/${candidate.model}: ${reason}`);
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        status: 'error',
        reason,
        errorType,
        isQuotaOrTokens: errorType === 'quota',
      });
    }
  }

  if (providers.length > 0) {
    await emitWorkspaceAlert({
      db: args.db,
      workspaceId,
      eventCode: 'ALL_PROVIDERS_FAILED',
      severity: 'critical',
      title: 'Todos los proveedores fallaron',
      body: 'Se agoto la lista de proveedores IA sin respuesta valida.',
      meta: { errors },
    }).catch(() => {});
  }

  const freeFallback = await tryFreeFallback({
    settings,
    system,
    history,
    message: args.message,
    responseLength: args.agent.profile?.responseLength ?? 'standard',
  });

  if (freeFallback.ok) {
    return {
      reply: freeFallback.reply,
      provider: 'openrouter-free',
      model: freeFallback.model,
      fallbackUsed: true,
      fallbackType: 'free_model' as const,
      errors,
      attempts: [...attempts, ...freeFallback.attempts],
      errorSummary: summarizeAttemptErrors([...attempts, ...freeFallback.attempts]),
    };
  }

  if (freeFallback.error) {
    errors.push(`openrouter-free: ${freeFallback.error}`);
    attempts.push(...freeFallback.attempts);
    await emitWorkspaceAlert({
      db: args.db,
      workspaceId,
      eventCode: 'FREE_FALLBACK_FAILED',
      severity: 'warning',
      title: 'Fallback gratuito no disponible',
      body: 'El fallback de modelo gratuito tambien fallo.',
      meta: { error: freeFallback.error },
    }).catch(() => {});
  }

  if (settings.fallback.safeReplyEnabled) {
    return {
      reply: settings.fallback.safeReplyMessage,
      provider: 'fallback-message',
      model: 'static-safe-reply',
      fallbackUsed: true,
      fallbackType: 'safe_message' as const,
      errors,
      attempts,
      errorSummary: summarizeAttemptErrors(attempts),
    };
  }

  throw new Error(`Todos los proveedores fallaron. ${errors.join(' | ')}`);
}

function isQuotaOrTokenError(message: string) {
  const m = String(message || '').toLowerCase();
  return (
    m.includes('quota') ||
    m.includes('billing') ||
    m.includes('insufficient') ||
    m.includes('rate limit') ||
    m.includes('credits') ||
    m.includes('token')
  );
}

function classifyProviderError(message: string): ProviderAttempt['errorType'] {
  const m = String(message || '').toLowerCase();
  if (
    m.includes('unauthorized') ||
    m.includes('invalid api key') ||
    m.includes('api key not valid') ||
    m.includes('incorrect api key') ||
    m.includes('authentication')
  ) return 'auth';

  if (isQuotaOrTokenError(m)) return 'quota';

  if (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('not supported for generatecontent') ||
    m.includes('model not found')
  ) return 'model_not_found';

  if (
    m.includes('invalid request') ||
    m.includes('bad request') ||
    m.includes('unsupported') ||
    m.includes('parameter')
  ) return 'invalid_request';

  if (
    m.includes('timeout') ||
    m.includes('network') ||
    m.includes('fetch failed') ||
    m.includes('connection')
  ) return 'network';

  if (
    m.includes('internal server error') ||
    m.includes('service unavailable') ||
    m.includes('503') ||
    m.includes('500')
  ) return 'server';

  return 'unknown';
}

function summarizeAttemptErrors(attempts: ProviderAttempt[]) {
  const failed = attempts.filter((a) => a.status === 'error');
  const byType: Record<string, number> = {};
  for (const f of failed) {
    const key = f.errorType || 'unknown';
    byType[key] = (byType[key] || 0) + 1;
  }
  return {
    failedAttempts: failed.length,
    byType,
  };
}

async function readWorkspaceSettings(db: Db, workspaceId?: string): Promise<WorkspaceSettings> {
  const coll = db.collection('workspace_settings');
  let doc: any = null;

  if (workspaceId) {
    doc = await coll.findOne({ workspaceId });
  }

  if (!doc) {
    doc = await coll.findOne({ workspaceId: 'default' });
  }

  if (!doc) {
    doc = await coll.findOne({});
  }

  if (!doc) return DEFAULT_SETTINGS;

  return {
    aiProviders: {
      google: { ...DEFAULT_SETTINGS.aiProviders.google, ...(doc.aiProviders?.google ?? {}) },
      openai: { ...DEFAULT_SETTINGS.aiProviders.openai, ...(doc.aiProviders?.openai ?? {}) },
      grok: { ...DEFAULT_SETTINGS.aiProviders.grok, ...(doc.aiProviders?.grok ?? {}) },
      anthropic: { ...DEFAULT_SETTINGS.aiProviders.anthropic, ...(doc.aiProviders?.anthropic ?? {}) },
    },
    orchestration: {
      ...DEFAULT_SETTINGS.orchestration,
      ...(doc.orchestration ?? {}),
      activeProviders: Array.isArray(doc.orchestration?.activeProviders)
        ? doc.orchestration.activeProviders
        : [],
    },
    fallback: {
      ...DEFAULT_SETTINGS.fallback,
      ...(doc.fallback ?? {}),
      freeModels: Array.isArray(doc.fallback?.freeModels)
        ? doc.fallback.freeModels.filter((m: unknown) => typeof m === 'string' && m.trim())
        : DEFAULT_SETTINGS.fallback.freeModels,
    },
  };
}

function resolveProviderOrder(settings: WorkspaceSettings): ProviderCandidate[] {
  const providerMap = settings.aiProviders;
  const enabled = (Object.keys(providerMap) as ProviderKey[])
    .filter((k) => providerMap[k].enabled && providerMap[k].apiKey?.trim());

  if (enabled.length === 0) return [];

  const preferred = settings.orchestration.multiModel
    ? settings.orchestration.activeProviders.filter((p): p is ProviderKey =>
        ['google', 'openai', 'grok', 'anthropic'].includes(p)
      )
    : [];

  const baseOrder = preferred.length > 0 ? preferred : enabled;
  const filtered = baseOrder.filter((p) => enabled.includes(p));

  const order = filtered.length > 0 ? filtered : enabled;
  const strategy = settings.orchestration.multiModel ? settings.orchestration.strategy : 'single';

  let rotated = order;
  if (strategy === 'roundrobin' && order.length > 1) {
    const idx = Math.floor(Date.now() / 1000) % order.length;
    rotated = [...order.slice(idx), ...order.slice(0, idx)];
  }

  return rotated.map((provider) => ({
    provider,
    model: providerMap[provider].model,
    apiKey: providerMap[provider].apiKey,
  }));
}

async function tryFreeFallback(args: {
  settings: WorkspaceSettings;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  if (!args.settings.fallback.useFreeModels) return { ok: false as const, attempts: [] as ProviderAttempt[] };

  const apiKey =
    args.settings.fallback.freeProviderApiKey?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.ORQO_FREE_OPENROUTER_API_KEY?.trim() ||
    '';

  if (!apiKey) {
    return {
      ok: false as const,
      error: 'No hay API key para OpenRouter free fallback.',
      attempts: [{
        provider: 'openrouter-free',
        model: '(sin-modelo)',
        status: 'error',
        reason: 'No hay API key para OpenRouter free fallback.',
        errorType: 'auth',
        isQuotaOrTokens: false,
      }] as ProviderAttempt[],
    };
  }

  const models = (args.settings.fallback.freeModels ?? []).filter((m) => m?.trim());
  if (models.length === 0) {
    return {
      ok: false as const,
      error: 'No hay modelos gratuitos configurados.',
      attempts: [{
        provider: 'openrouter-free',
        model: '(sin-modelo)',
        status: 'error',
        reason: 'No hay modelos gratuitos configurados.',
        errorType: 'invalid_request',
        isQuotaOrTokens: false,
      }] as ProviderAttempt[],
    };
  }

  const errors: string[] = [];
  const attempts: ProviderAttempt[] = [];
  for (const model of models) {
    try {
      const reply = await callOpenRouterFree({
        apiKey,
        model,
        system: args.system,
        history: args.history,
        message: args.message,
        responseLength: args.responseLength,
      });
      attempts.push({ provider: 'openrouter-free', model, status: 'ok' });
      return { ok: true as const, reply, model, attempts };
    } catch (error: any) {
      const reason = error?.message ?? 'error desconocido';
      const errorType = classifyProviderError(reason);
      errors.push(`${model}: ${reason}`);
      attempts.push({
        provider: 'openrouter-free',
        model,
        status: 'error',
        reason,
        errorType,
        isQuotaOrTokens: errorType === 'quota',
      });
    }
  }

  return { ok: false as const, error: errors.join(' | '), attempts };
}

function buildSystemPrompt(agent: AgentRuntime): string {
  const lines: string[] = [];
  lines.push(`Eres ${agent.name?.trim() || 'un asistente virtual de ORQO'}.`);
  lines.push('Responde con claridad, util y en tono profesional.');

  const p = agent.profile;
  if (p?.personality) lines.push(`Personalidad: ${p.personality}.`);
  if (p?.languages?.length) lines.push(`Idiomas preferidos: ${p.languages.join(', ')}.`);
  if (p?.systemPrompt?.trim()) lines.push(`Instrucciones del agente:\n${p.systemPrompt.trim()}`);
  if (agent.corporateContext?.trim()) lines.push(`Contexto corporativo:\n${agent.corporateContext.trim()}`);
  if (agent.skills?.length) lines.push(`Skills activos: ${agent.skills.join(', ')}.`);

  if (agent.advanced?.escalationKeywords?.trim()) {
    lines.push(
      `Si detectas escalacion (${agent.advanced.escalationKeywords}), informa: ${agent.advanced.humanHandoffMsg || 'Te conecto con un agente humano.'}`
    );
  }

  return lines.join('\n\n');
}

async function callProvider(args: {
  provider: ProviderKey;
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  if (args.provider === 'openai') return callOpenAI(args);
  if (args.provider === 'anthropic') return callAnthropic(args);
  if (args.provider === 'google') return callGoogle(args);
  return callGrok(args);
}

function maxTokens(length: string) {
  if (length === 'short') return 180;
  if (length === 'long') return 900;
  return 450;
}

async function callOpenAI(args: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  const messages = [
    { role: 'system', content: args.system },
    ...args.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: args.message },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens(args.responseLength),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? 'OpenAI error');

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI no devolvio contenido');
  return text;
}

async function callAnthropic(args: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  const messages = [
    ...args.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: args.message },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      system: args.system,
      max_tokens: maxTokens(args.responseLength),
      temperature: 0.3,
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? 'Anthropic error');

  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks.map((b: any) => (b?.type === 'text' ? b.text : '')).join('').trim();
  if (!text) throw new Error('Anthropic no devolvio contenido');
  return text;
}

async function callGoogle(args: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  const contents = [
    ...args.history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: args.message }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens(args.responseLength) },
        contents,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? 'Google Gemini error');

  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini no devolvio contenido');
  return text;
}

async function callGrok(args: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  const messages = [
    { role: 'system', content: args.system },
    ...args.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: args.message },
  ];

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens(args.responseLength),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? 'Grok error');

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Grok no devolvio contenido');
  return text;
}

async function callOpenRouterFree(args: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatTurn[];
  message: string;
  responseLength: string;
}) {
  const messages = [
    { role: 'system', content: args.system },
    ...args.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: args.message },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens(args.responseLength),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? 'OpenRouter error');

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter no devolvio contenido');
  return text;
}
