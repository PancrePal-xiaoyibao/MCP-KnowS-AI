export type Logger = {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export function createLogger(): Logger {
  return console;
}
