export type OllamaChatRole = 'system' | 'user' | 'assistant';

export interface OllamaChatMessage {
  role: OllamaChatRole;
  content: string;
}

export interface OllamaModelSummary {
  name: string;
  size?: number;
  parameterSize?: string;
  quantizationLevel?: string;
}

export interface OllamaStatus {
  available: boolean;
  apiBaseUrl: string;
  configuredModel: string;
  activeModel: string;
  configuredModelInstalled: boolean;
  modelInstalled: boolean;
  usingFallbackModel: boolean;
  installedModels: OllamaModelSummary[];
  error?: string;
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    size?: number;
    details?: {
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

interface OllamaChatResponse {
  error?: string;
  message?: {
    content?: string;
  };
}

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3';
const CHAT_HISTORY_LIMIT = 20;
const NON_CHAT_MODEL_PATTERNS = [/embed/i, /^bge/i, /^mxbai/i, /^all-minilm/i];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getOllamaApiBaseUrl(envBaseUrl = process.env.OLLAMA_BASE_URL): string {
  const base = trimTrailingSlash(envBaseUrl?.trim() || DEFAULT_OLLAMA_BASE_URL);
  return base.endsWith('/api') ? base : `${base}/api`;
}

export function getConfiguredOllamaModel(envModel = process.env.OLLAMA_MODEL): string {
  return envModel?.trim() || DEFAULT_OLLAMA_MODEL;
}

export function normalizeOllamaChatMessages(input: unknown): OllamaChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .flatMap((message) => {
      if (!message || typeof message !== 'object') return [];
      const role = (message as { role?: unknown }).role;
      const content = (message as { content?: unknown }).content;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return [];
      const trimmed = content.trim();
      const normalizedRole: OllamaChatMessage['role'] = role;
      return trimmed ? [{ role: normalizedRole, content: trimmed }] : [];
    })
    .slice(-CHAT_HISTORY_LIMIT);
}

export function chooseFallbackOllamaModel(installedModels: string[]): string | undefined {
  return installedModels.find((model) => !NON_CHAT_MODEL_PATTERNS.some((pattern) => pattern.test(model))) ?? installedModels[0];
}

async function fetchWithTimeout(fetchImpl: typeof fetch, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readOllamaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as OllamaChatResponse;
    return data.error || `Ollama request failed with status ${response.status}.`;
  } catch {
    return `Ollama request failed with status ${response.status}.`;
  }
}

export async function getOllamaStatus(fetchImpl: typeof fetch = fetch): Promise<OllamaStatus> {
  const apiBaseUrl = getOllamaApiBaseUrl();
  const configuredModel = getConfiguredOllamaModel();
  const explicitModelConfigured = Boolean(process.env.OLLAMA_MODEL?.trim());

  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      `${apiBaseUrl}/tags`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      4000,
    );

    if (!response.ok) {
      throw new Error(await readOllamaError(response));
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const installedModels =
      data.models?.flatMap((model) => {
        const name = model.name?.trim();
        if (!name) return [];
        return [
          {
            name,
            size: model.size,
            parameterSize: model.details?.parameter_size,
            quantizationLevel: model.details?.quantization_level,
          },
        ];
      }) ?? [];

    const installedNames = installedModels.map((model) => model.name);
    const configuredModelInstalled = installedNames.includes(configuredModel);
    const fallbackModel =
      !explicitModelConfigured && !configuredModelInstalled ? chooseFallbackOllamaModel(installedNames) : undefined;
    const activeModel = configuredModelInstalled ? configuredModel : fallbackModel ?? configuredModel;
    const modelInstalled = installedNames.includes(activeModel);

    return {
      available: true,
      apiBaseUrl,
      configuredModel,
      activeModel,
      configuredModelInstalled,
      modelInstalled,
      usingFallbackModel: Boolean(fallbackModel),
      installedModels,
    };
  } catch (error) {
    return {
      available: false,
      apiBaseUrl,
      configuredModel,
      activeModel: configuredModel,
      configuredModelInstalled: false,
      modelInstalled: false,
      usingFallbackModel: false,
      installedModels: [],
      error: error instanceof Error ? error.message : 'Unable to connect to Ollama.',
    };
  }
}

export async function chatWithOllama(
  input: { messages: OllamaChatMessage[]; temperature?: number; status?: OllamaStatus },
  fetchImpl: typeof fetch = fetch,
) {
  const status = input.status ?? (await getOllamaStatus(fetchImpl));

  if (!status.available) {
    throw new Error(`Ollama is not reachable at ${status.apiBaseUrl}. Start Ollama and try again.`);
  }

  if (!status.modelInstalled) {
    throw new Error(`The model "${status.activeModel}" is not installed. Run "ollama pull ${status.activeModel}" and try again.`);
  }

  const response = await fetchWithTimeout(
    fetchImpl,
    `${status.apiBaseUrl}/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: status.activeModel,
        messages: input.messages,
        stream: false,
        options: {
          temperature: input.temperature ?? 0.25,
          num_ctx: 8192,
          top_p: 0.9,
        },
      }),
    },
    120000,
  );

  if (!response.ok) {
    throw new Error(await readOllamaError(response));
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error('Ollama returned an empty response.');
  }

  return {
    content,
    model: status.activeModel,
    status,
  };
}
