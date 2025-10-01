declare module 'prom-client' {
  export class Registry {
    contentType: string;
    metrics(): Promise<string>;
  }
  export function collectDefaultMetrics(opts: { register: Registry }): void;
  export class Gauge<T = string> {
    constructor(opts: { name: string; help: string; labelNames?: readonly string[]; registers?: Registry[] });
    labels(labels: Record<string, string>): { set: (value: number) => void };
  }
}

