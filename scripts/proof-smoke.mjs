#!/usr/bin/env node
/**
 * Proof smoke: run a template, verify ledger appended, emit a small proof JSON.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LEDGER_DIR = path.resolve('ledger')

function today() {
  return new Date().toISOString().slice(0, 10)
}

function dayFile(day) {
  return path.join(LEDGER_DIR, `events-${day}.jsonl`)
}

async function countLines(file) {
  try {
    const data = await fs.readFile(file, 'utf8')
    if (!data) return 0
    return data.split('\n').filter(Boolean).length
  } catch {
    return 0
  }
}

async function run() {
  const day = today()
  const file = dayFile(day)
  const before = await countLines(file)

  const keyword = process.env.PROOF_KEYWORD || 'guardrails-check'
  const args = process.env.PROOF_ARGS || '{"templateYaml":"id:x\\nversion:1.0.0\\nkeyword:test\\ninputs:[]\\nprompts:{system:\\"ok\\",user:\\"hi\\"}"}'
  const model = process.env.PROOF_MODEL || ''

  const cmd = [process.execPath, '--loader', 'ts-node/esm', 'cli/forge-run.ts', 'run', keyword, '--args', args]
  if (model) {
    cmd.push('--model', model)
  }

  await exec(cmd[0], cmd.slice(1), { stdio: 'inherit' })

  const after = await countLines(file)
  const ok = after > before

  const proof = {
    ok,
    day,
    before,
    after,
    delta: after - before,
    keyword,
    createdAt: new Date().toISOString(),
  }

  const outDir = path.join(ROOT, 'receipts', 'proof')
  await fs.mkdir(outDir, { recursive: true })
  const out = path.join(outDir, `${day}.json`)
  await fs.writeFile(out, JSON.stringify(proof, null, 2))

  console.log(JSON.stringify({ ok, proof: out }, null, 2))
  process.exit(ok ? 0 : 1)
}

function exec(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited ${code}`))
      }
    })
    child.on('error', reject)
  })
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
