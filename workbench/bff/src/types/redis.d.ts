declare module 'ioredis' {
  const IORedis: any;
  export default IORedis;
}

declare module 'redis' {
  export function createClient(opts?: any): any;
}

