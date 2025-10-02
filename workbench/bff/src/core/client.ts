import { ExecuteRequest, ExecuteResponse, LedgerEvent } from '../types.js';
import { executeGRPC, ledgerQueryGRPC } from './grpc.js';

const CORE_ADDR = process.env.CORE_GRPC_ADDR;

export async function coreExecute(
  req: ExecuteRequest,
  onLog?: (line: string) => void,
): Promise<ExecuteResponse> {
  if (CORE_ADDR) {
    try {
      const response = await executeGRPC(
        CORE_ADDR,
        { templateId: req.templateId, profile: req.profile, args: req.args },
        onLog,
      );
      return {
        eventId: response.eventId,
        status: response.status,
        output: response.output,
        error: response.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onLog?.(`[grpc] Execute failed: ${message}`);
      return {
        eventId: '',
        status: 'error',
        error: message,
      };
    }
  }

  return simulateExecute(req, onLog);
}

export async function coreLedgerQuery(query: {
  template?: string;
  limit?: number;
}): Promise<LedgerEvent[]> {
  if (CORE_ADDR) {
    try {
      const rows = await ledgerQueryGRPC(CORE_ADDR, query);
      return rows.map((row) => ({
        id: row.id,
        ts: row.ts,
        template: row.template,
        profile: row.profile,
        input: row.input,
        output: row.output,
        status: row.status,
        error: row.error,
      }));
    } catch (error) {
      return [];
    }
  }

  return [
    {
      id: 'evt_123',
      ts: new Date().toISOString(),
      template: 'demo.echo',
      profile: 'vault',
      input: { msg: 'hi' },
      output: { msg: 'hi' },
      status: 'ok',
    },
  ];
}

async function simulateExecute(
  req: ExecuteRequest,
  onLog?: (line: string) => void,
): Promise<ExecuteResponse> {
  const eventId = `evt_${Math.random().toString(36).slice(2, 10)}`;
  onLog?.(`[dispatcher] starting ${req.templateId}`);
  await sleep(350);
  onLog?.('[guardrails] schema validated');
  await sleep(350);
  onLog?.('[llm] calling provider (stub)');
  await sleep(400);
  onLog?.('[ledger] appended receipt');
  return { eventId, status: 'ok', output: { echo: req.args ?? {}, eventId } };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
