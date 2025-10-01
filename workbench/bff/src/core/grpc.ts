import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, '../../protos/vaultmesh/ai/v1/core.proto');

const loaderOptions: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

interface ExecuteReq {
  templateId: string;
  profile?: string;
  args?: Record<string, unknown>;
}

interface ExecuteRes {
  eventId: string;
  status: 'ok' | 'error';
  output?: unknown;
  error?: string;
}

export interface LedgerEvent {
  id: string;
  ts: string;
  template: string;
  profile: string;
  input: unknown;
  output: unknown;
  status?: 'ok' | 'error';
  error?: string;
  hash?: string;
  sig?: string;
}

function loadCredentials(): grpc.ChannelCredentials {
  const mode = (process.env.CORE_TLS || 'insecure').toLowerCase();

  if (mode === 'insecure') {
    return grpc.credentials.createInsecure();
  }

  const ca = process.env.CORE_TLS_CA ? fs.readFileSync(process.env.CORE_TLS_CA) : undefined;
  const cert = process.env.CORE_TLS_CERT ? fs.readFileSync(process.env.CORE_TLS_CERT) : undefined;
  const key = process.env.CORE_TLS_KEY ? fs.readFileSync(process.env.CORE_TLS_KEY) : undefined;

  if (mode === 'tls') {
    return grpc.credentials.createSsl(ca);
  }

  if (mode === 'mtls') {
    if (!ca || !cert || !key) {
      throw new Error('CORE_TLS=mtls requires CORE_TLS_CA, CORE_TLS_CERT, CORE_TLS_KEY');
    }
    return grpc.credentials.createSsl(ca, key, cert);
  }

  throw new Error(`Unknown CORE_TLS mode: ${mode}`);
}

function getClient(addr: string) {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, loaderOptions);
  const pkg = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    vaultmesh: { ai: { v1: { Core: new (address: string, creds: grpc.ChannelCredentials, options?: grpc.ClientOptions) => grpc.Client & {
      Execute: grpc.handleUnaryCall<any, any>;
      LedgerQuery: grpc.handleServerStreamingCall<any, any>;
      LedgerVerify: grpc.handleUnaryCall<any, any>;
    }; } } };
  };

  const CoreService = pkg.vaultmesh.ai.v1.Core;
  const credentials = loadCredentials();
  const client = new CoreService(addr, credentials, {
    'grpc.keepalive_time_ms': 20000
  });

  return client as unknown as grpc.Client & {
    Execute(request: any, callback: (err: grpc.ServiceError | null, response: any) => void): void;
    LedgerQuery(request: any): grpc.ClientReadableStream<any>;
    LedgerVerify(request: any, callback: (err: grpc.ServiceError | null, response: any) => void): void;
  };
}

function safeJSON(payload: string) {
  try {
    return JSON.parse(payload ?? 'null');
  } catch (error) {
    return payload;
  }
}

export async function executeGRPC(addr: string, req: ExecuteReq, onLog?: (line: string) => void): Promise<ExecuteRes> {
  const client = getClient(addr);
  onLog?.(`[grpc] Execute ${req.templateId}`);

  const executeReq = {
    template_id: req.templateId,
    profile: req.profile ?? 'vault',
    args_json: JSON.stringify(req.args ?? {})
  };

  const response = await new Promise<any>((resolve, reject) => {
    client.Execute(executeReq, (err: grpc.ServiceError | null, res: any) => {
      if (err) return reject(err);
      resolve(res);
    });
  });

  const output = safeJSON(response.output_json);
  const status = response.status === 'ok' ? 'ok' : 'error';

  if (status === 'error') {
    onLog?.(`[grpc] Execute error: ${response.error || 'unknown error'}`);
  } else {
    onLog?.(`[grpc] Execute done: event ${response.event_id}`);
  }

  return {
    eventId: response.event_id,
    status,
    output,
    error: response.error || undefined
  };
}

export async function ledgerQueryGRPC(addr: string, query: { template?: string; limit?: number }): Promise<LedgerEvent[]> {
  const client = getClient(addr);

  const request = {
    template: query.template ?? '',
    profile: '',
    limit: query.limit ?? 50,
    cursor: ''
  };

  const results: LedgerEvent[] = [];

  const stream = client.LedgerQuery(request);

  return await new Promise<LedgerEvent[]>((resolve, reject) => {
    stream.on('data', (message: any) => {
      results.push({
        id: message.id,
        ts: message.ts,
        template: message.template,
        profile: message.profile,
        input: safeJSON(message.input_json),
        output: safeJSON(message.output_json),
        status: message.status || 'ok',
        error: message.error || undefined,
        hash: message.hash || undefined,
        sig: message.sig || undefined
      });
    });

    stream.on('end', () => resolve(results));
    stream.on('error', (err: grpc.ServiceError) => reject(err));
  });
}
