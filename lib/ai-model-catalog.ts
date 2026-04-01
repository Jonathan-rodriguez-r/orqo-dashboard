export type ProviderKey = 'google' | 'openai' | 'grok' | 'anthropic';
export type ModelTier = 'paid' | 'free';

export type ProviderModelOption = {
  id: string;
  label: string;
  tier: ModelTier;
};

export const DEFAULT_PROVIDER_MODELS: Record<ProviderKey, string> = {
  google: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  grok: 'grok-3',
  anthropic: 'claude-sonnet-4-6',
};

export const PROVIDER_MODEL_OPTIONS: Record<ProviderKey, ProviderModelOption[]> = {
  google: [
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', tier: 'paid' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'paid' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'paid' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', tier: 'paid' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'paid' },
  ],
  openai: [
    { id: 'gpt-5-mini', label: 'GPT-5 mini', tier: 'paid' },
    { id: 'gpt-4.1', label: 'GPT-4.1', tier: 'paid' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', tier: 'paid' },
    { id: 'gpt-4o', label: 'GPT-4o', tier: 'paid' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', tier: 'paid' },
  ],
  grok: [
    { id: 'grok-3', label: 'Grok 3', tier: 'paid' },
    { id: 'grok-3-mini', label: 'Grok 3 mini', tier: 'paid' },
    { id: 'grok-2', label: 'Grok 2', tier: 'paid' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', tier: 'paid' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'paid' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'paid' },
  ],
};

export const LEGACY_PROVIDER_MODEL_ALIASES: Record<ProviderKey, Record<string, string>> = {
  google: {
    'gemini-1.5-flash': 'gemini-2.5-flash-lite',
    'gemini-1.5-pro': 'gemini-2.5-pro',
  },
  openai: {
    'gpt-3.5-turbo': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4.1-mini',
  },
  grok: {},
  anthropic: {},
};

export const DEFAULT_FREE_OPENROUTER_MODELS: string[] = [
  'qwen/qwen3.6-plus-preview:free',
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

export const FREE_OPENROUTER_MODEL_SUGGESTIONS: string[] = [
  'qwen/qwen3.6-plus-preview:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
];

export function normalizeProviderModel(provider: ProviderKey, rawModel: string | null | undefined) {
  const model = String(rawModel ?? '').trim();
  if (!model) return DEFAULT_PROVIDER_MODELS[provider];

  const aliasMap = LEGACY_PROVIDER_MODEL_ALIASES[provider];
  const alias = aliasMap[model.toLowerCase()];
  return alias || model;
}

