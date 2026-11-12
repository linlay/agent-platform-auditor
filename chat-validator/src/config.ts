import { EnvironmentError, type Config } from './types.js';
export function loadConfig(env: NodeJS.ProcessEnv, keepChats = false): Config {
  const url = new URL(env.PLATFORM_URL ?? 'http://127.0.0.1:11949');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new EnvironmentError('PLATFORM_URL must be an HTTP(S) origin without credentials, path, query or fragment');
  const timeoutMs = Number(env.PLATFORM_TIMEOUT_MS ?? 120000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) throw new EnvironmentError('PLATFORM_TIMEOUT_MS must be an integer from 1000 to 600000');
  const optional = (key: string): string | undefined => env[key]?.trim() || undefined;
  const config: Config = { baseUrl: url.origin, timeoutMs, keepChats };
  const mappings = { tokenFile: 'PLATFORM_TOKEN_FILE', token: 'PLATFORM_TOKEN', agentKey: 'PLATFORM_AGENT_KEY',
    projectAgentKey: 'PLATFORM_PROJECT_AGENT_KEY', projectFile: 'PLATFORM_PROJECT_FILE', projectExpect: 'PLATFORM_PROJECT_EXPECT', botAgentKey: 'PLATFORM_BOT_AGENT_KEY' } as const;
  for (const [key, envKey] of Object.entries(mappings)) { const value = optional(envKey); if (value) Object.assign(config, { [key]: value }); }
  return config;
}
