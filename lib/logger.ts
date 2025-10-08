/**
 * Minimal structured logger with a pino-compatible API surface.
 * Falls back to console.* if pino is not present in runtime.
 */

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

interface Fields { [k: string]: unknown }

export interface Logger {
  child(bindings: Fields): Logger;
  fatal(obj: Fields | string, msg?: string): void;
  error(obj: Fields | string, msg?: string): void;
  warn(obj: Fields | string, msg?: string): void;
  info(obj: Fields | string, msg?: string): void;
  debug(obj: Fields | string, msg?: string): void;
  trace(obj: Fields | string, msg?: string): void;
}

function timestamp() {
  return new Date().toISOString();
}

function asObj(input?: Fields | string): Fields {
  if (!input) return {};
  return typeof input === 'string' ? { msg: input } : input;
}

function write(level: Level, bindings: Fields, input?: Fields | string, msg?: string) {
  const base = { time: timestamp(), level, ...bindings, ...asObj(input) };
  const line = msg ? { ...base, msg } : base;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

class ConsoleLogger implements Logger {
  constructor(private readonly bindings: Fields = {}) {}
  child(b: Fields): Logger {
    return new ConsoleLogger({ ...this.bindings, ...b });
  }
  fatal(o: Fields | string, msg?: string) { write('fatal', this.bindings, o, msg); }
  error(o: Fields | string, msg?: string) { write('error', this.bindings, o, msg); }
  warn(o: Fields | string, msg?: string) { write('warn', this.bindings, o, msg); }
  info(o: Fields | string, msg?: string) { write('info', this.bindings, o, msg); }
  debug(o: Fields | string, msg?: string) { write('debug', this.bindings, o, msg); }
  trace(o: Fields | string, msg?: string) { write('trace', this.bindings, o, msg); }
}

let root: Logger = new ConsoleLogger({ service: 'forge' });

export function getLogger(bindings?: Fields): Logger {
  if (bindings) return root.child(bindings);
  return root;
}

export function setRootLogger(l: Logger) {
  root = l;
}
