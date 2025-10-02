import { spawn } from 'node:child_process';
import path from 'node:path';

export interface RealityLedgerEvent {
  event_id?: string;
  ts?: string;
  keyword?: string;
  profile?: string;
  provider?: string;
  model?: string;
  run_level?: string;
  input_hash?: string;
  output_hash?: string;
  args?: unknown;
  artifact?: unknown;
}

export async function appendRealityEvent(
  projectRoot: string,
  event: RealityLedgerEvent
): Promise<void> {
  const scriptPath = path.join(projectRoot, 'reality_ledger', 'reality_ledger.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const payload = JSON.stringify(event);

  await new Promise<void>((resolve) => {
    const child = spawn(pythonCmd, [scriptPath, 'append'], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    child.on('error', () => resolve());
    child.on('exit', () => resolve());

    child.stdin?.write(payload);
    child.stdin?.end();
  });
}
