import { spawn } from "node:child_process";

type ForgeArgs = Record<string, unknown>;

type ForgeResult = unknown;

export async function runForge(scroll: string, profile = "@blue", args: ForgeArgs = {}): Promise<ForgeResult> {
  if (!scroll) {
    throw new Error("Scroll name is required");
  }

  const argv = ["dist/cli/forge.js", scroll, profile];

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      argv.push(`--${key}`, JSON.stringify(value));
    } else {
      argv.push(`--${key}`, String(value));
    }
  }

  return await new Promise((resolve, reject) => {
    const proc = spawn("node", argv, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `forge exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(stdout.trim());
      }
    });
  });
}
