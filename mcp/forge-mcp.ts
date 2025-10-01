import { createInterface } from "node:readline";
import { stdin as In, stdout as Out } from "node:process";
import { runForge } from "../tools/forge.js";
import { searchCodex, getDoc, buildIndex } from "../tools/codex.js";
import { appendRealityEvent } from "../tools/ledger.js";
import { planTask } from "../agent/plan.js";
import { executePlan } from "../agent/execute.js";

// Minimal JSON-RPC 2.0 server over newline-delimited JSON (MCP-compatible for Claude Desktop)
type RequestPayload = { id: number | string; jsonrpc: "2.0"; method: string; params?: unknown };
type ResponsePayload = {
  id: number | string;
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type RequestParams = Record<string, unknown>;

function send(response: ResponsePayload) {
  Out.write(`${JSON.stringify(response)}\n`);
}

async function handle(req: RequestPayload): Promise<void> {
  const { id, method } = req;
  const params = (req.params ?? {}) as RequestParams;

  try {
    switch (method) {
      case "mcp/ready": {
        await buildIndex();
        send({ id, jsonrpc: "2.0", result: { ok: true } });
        return;
      }
      case "codex.search": {
        const { query, k = 8 } = params;
        const hits = await searchCodex(String(query ?? ""), Number(k ?? 8));
        send({ id, jsonrpc: "2.0", result: { hits } });
        return;
      }
      case "codex.get": {
        const { id: docId } = params;
        const doc = await getDoc(String(docId ?? ""));
        send({ id, jsonrpc: "2.0", result: doc });
        return;
      }
      case "forge.run": {
        const { scroll, profile = "@blue", args = {} } = params;
        const output = await runForge(String(scroll ?? ""), String(profile ?? "@blue"), args as Record<string, unknown>);
        send({ id, jsonrpc: "2.0", result: output });
        return;
      }
      case "ledger.append": {
        await appendRealityEvent(process.cwd(), params);
        send({ id, jsonrpc: "2.0", result: { ok: true } });
        return;
      }
      case "agent.plan": {
        const { goal, constraints = {} } = params as {
          goal?: unknown;
          constraints?: Record<string, unknown>;
        };
        const plan = await planTask(String(goal ?? ""), constraints);
        send({ id, jsonrpc: "2.0", result: plan });
        return;
      }
      case "agent.execute": {
        const {
          plan,
          budget = { steps: 8, tokens: 16000, seconds: 60 },
          runLevel = "read-only"
        } = params as {
          plan: unknown;
          budget?: { steps?: number; tokens?: number; seconds?: number };
          runLevel?: "read-only" | "advisory" | "lab-only";
        };
        const normalizedBudget = {
          steps: Number(budget?.steps ?? 8),
          tokens: Number(budget?.tokens ?? 16000),
          seconds: Number(budget?.seconds ?? 60)
        };
        const report = await executePlan(plan as any, { budget: normalizedBudget, runLevel });
        send({ id, jsonrpc: "2.0", result: report });
        return;
      }
      default: {
        send({ id, jsonrpc: "2.0", error: { code: -32601, message: `Unknown method: ${method}` } });
        return;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    send({ id, jsonrpc: "2.0", error: { code: -32000, message } });
  }
}

const rl = createInterface({ input: In });
rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const payload = JSON.parse(line) as RequestPayload;
    void handle(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send({ id: "0", jsonrpc: "2.0", error: { code: -32700, message: `Parse error: ${message}` } });
  }
});
