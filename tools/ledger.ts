import { spawn } from 'node:child_process';
import path from 'node:path';

type LedgerEvent = Record<string, unknown>;

export async function appendRealityEvent(projectRoot: string, event: LedgerEvent): Promise<void> {
  const script = path.join(projectRoot, 'reality_ledger', 'reality_ledger.py');
  const python = process.platform === 'win32' ? 'python' : 'python3';

  await new Promise<void>((resolve) => {
    const proc = spawn(python, [script, 'append'], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    proc.on('error', () => resolve());
    proc.on('exit', () => resolve());

    try {
      proc.stdin?.write(JSON.stringify(event));
    } catch {
      // ignore serialization errors; ledger bridge is best-effort
    }
    proc.stdin?.end();
  });
}
