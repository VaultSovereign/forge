import type { Request, Response } from 'express';
import { askGuardian } from '../../../agents/index.js';

export async function postGuardian(req: Request, res: Response) {
  const { input } = req.body ?? {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'input (string) required' });
  }
  try {
    const result = await askGuardian(input); // default model can be overridden
    res.json({
      text: result.outputText, // natural language summary
      events: result.events ?? [], // traces: tool calls, handoffs, etc.
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

