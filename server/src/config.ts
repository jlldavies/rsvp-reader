export interface ServerConfig {
  port: number;
  mode: 'standalone' | 'managed';
  docTtlMs: number;
  docReadOnce: boolean;
  frameAncestors: string[];
}

function parseBoolFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return fallback;
}

function parseFrameAncestors(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = env.PORT ? parseInt(env.PORT, 10) : 3847;
  const mode: ServerConfig['mode'] = env.RSVP_MODE === 'managed' ? 'managed' : 'standalone';

  const defaultDocReadOnce = mode === 'managed' ? false : true;
  const defaultDocTtlMs = mode === 'managed' ? 60 * 60 * 1000 : 5 * 60 * 1000;

  const docTtlMs = env.RSVP_DOC_TTL_MS ? parseInt(env.RSVP_DOC_TTL_MS, 10) : defaultDocTtlMs;
  const docReadOnce = parseBoolFlag(env.RSVP_DOC_READ_ONCE, defaultDocReadOnce);
  const frameAncestors = parseFrameAncestors(env.RSVP_FRAME_ANCESTORS);

  return { port, mode, docTtlMs, docReadOnce, frameAncestors };
}
