/**
 * Debug utility with DEVMODE environment variable check
 * Only logs when NEXT_PUBLIC_DEVMODE is 'true'
 */

const isDevMode = process.env.NEXT_PUBLIC_DEVMODE === 'true';

type LogLevel = 'log' | 'warn' | 'error' | 'info';

interface DebugLogger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

function createLogger(prefix: string): DebugLogger {
  const logWithLevel = (level: LogLevel) => (...args: unknown[]) => {
    if (!isDevMode) return;
    console[level](`[${prefix}]`, ...args);
  };

  return {
    log: logWithLevel('log'),
    warn: logWithLevel('warn'),
    error: logWithLevel('error'),
    info: logWithLevel('info'),
  };
}

// Pre-configured loggers for different modules
export const transcriptionLogger = createLogger('Transcription');
export const participantsLogger = createLogger('Participants');
export const meetingLogger = createLogger('Meeting');

// Generic debug function
export function debug(prefix: string, ...args: unknown[]): void {
  if (!isDevMode) return;
  console.log(`[${prefix}]`, ...args);
}

// Check if dev mode is enabled
export function isDebugEnabled(): boolean {
  return isDevMode;
}
