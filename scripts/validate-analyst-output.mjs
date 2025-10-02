#!/usr/bin/env node
/**
 * Validate Research Analyst output against schema
 * Usage: node scripts/validate-analyst-output.mjs <output-file.json>
 */

import { readFile } from 'fs/promises';

const SCHEMA_REQUIREMENTS = {
  required: ['summary', 'details', 'confidence'],
  optional: ['next_steps', 'escalations'],
  confidence: ['high', 'medium', 'low'],
  maxSummaryItems: 3,
};

async function validateAnalystOutput(filepath) {
  try {
    const content = await readFile(filepath, 'utf-8');
    const output = JSON.parse(content);

    // Check required fields
    const missing = SCHEMA_REQUIREMENTS.required.filter((k) => !output[k]);
    if (missing.length) {
      console.error('❌ Missing required fields:', missing.join(', '));
      process.exit(1);
    }

    // Validate summary
    if (!Array.isArray(output.summary)) {
      console.error('❌ Summary must be an array');
      process.exit(1);
    }
    if (output.summary.length === 0) {
      console.error('❌ Summary must contain at least 1 item');
      process.exit(1);
    }
    if (output.summary.length > SCHEMA_REQUIREMENTS.maxSummaryItems) {
      console.error(
        `❌ Summary must contain ≤${SCHEMA_REQUIREMENTS.maxSummaryItems} items (found ${output.summary.length})`
      );
      process.exit(1);
    }

    // Validate details
    if (typeof output.details !== 'string' || output.details.trim().length === 0) {
      console.error('❌ Details must be a non-empty string');
      process.exit(1);
    }

    // Validate confidence
    if (!SCHEMA_REQUIREMENTS.confidence.includes(output.confidence)) {
      console.error(
        `❌ Invalid confidence level: "${output.confidence}" (must be one of: ${SCHEMA_REQUIREMENTS.confidence.join(', ')})`
      );
      process.exit(1);
    }

    // Validate optional arrays if present
    if (output.next_steps && !Array.isArray(output.next_steps)) {
      console.error('❌ next_steps must be an array');
      process.exit(1);
    }
    if (output.escalations && !Array.isArray(output.escalations)) {
      console.error('❌ escalations must be an array');
      process.exit(1);
    }

    // Success
    console.log('✅ Schema validation passed');
    console.log(
      `   - Summary items: ${output.summary.length}/${SCHEMA_REQUIREMENTS.maxSummaryItems}`
    );
    console.log(`   - Details length: ${output.details.length} chars`);
    console.log(`   - Confidence: ${output.confidence}`);
    if (output.next_steps) console.log(`   - Next steps: ${output.next_steps.length} items`);
    if (output.escalations) console.log(`   - Escalations: ${output.escalations.length} items`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

const filepath = process.argv[2];
if (!filepath) {
  console.error('Usage: node scripts/validate-analyst-output.mjs <output-file.json>');
  process.exit(1);
}

validateAnalystOutput(filepath);
