import { buildServer } from './server.js';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = await buildServer();
await app.listen({ port: PORT, host: HOST });
app.log.info({ port: PORT, host: HOST }, 'BFF listening');

