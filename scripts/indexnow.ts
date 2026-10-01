#!/usr/bin/env node
/**
 * ToolverAI — IndexNow CLI Submission Utility
 * ============================================
 * Usage:
 *   npm run indexnow -- https://toolverai.com/ https://toolverai.com/deals
 *   npm run indexnow -- --core
 *   npm run indexnow -- --help
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  submitToIndexNow,
  getCorePublicUrls,
  INDEXNOW_DEFAULT_KEY,
  CANONICAL_SITE_URL,
} from '../src/server/indexnow.js';

// Load .env variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ToolverAI IndexNow CLI
======================
Submits canonical URLs directly to Microsoft Bing, Yandex, and IndexNow network.

Commands:
  npm run indexnow -- <url1> <url2>...     Submit specific changed URLs
  npm run indexnow -- --core                Submit core public hub pages once
  npm run indexnow -- --today               Submit core public hub pages for today
  npm run indexnow                          (Default: submits core public pages)

Options:
  --help, -h                                Show this help guide

Key File Location:
  https://toolverai.com/918469d3edf54adf9868b52b9959d0de.txt
`);
    process.exit(0);
  }

  const baseUrl = (process.env.SITE_URL || CANONICAL_SITE_URL).replace(/\/+$/, '');
  const key = (process.env.INDEXNOW_KEY || INDEXNOW_DEFAULT_KEY).trim();

  // Extract explicit URLs from CLI arguments
  const inputUrls = args.filter((arg) => !arg.startsWith('--'));

  let targetUrls: string[] = [];

  if (inputUrls.length > 0) {
    targetUrls = inputUrls;
    console.log(`\n📡 Submitting ${targetUrls.length} custom URL(s) to IndexNow...\n`);
  } else {
    // Default or --core / --today: Submit primary public hub pages
    targetUrls = getCorePublicUrls(baseUrl);
    console.log(`\n📡 Submitting today's core public hub pages to IndexNow...\n`);
  }

  console.log(`Host:        ${new URL(baseUrl).hostname}`);
  console.log(`Key:         ${key}`);
  console.log(`KeyLocation: ${baseUrl}/${key}.txt`);
  console.log(`URLs to submit:`);
  targetUrls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
  console.log('');

  const result = await submitToIndexNow(targetUrls, { baseUrl, key });

  console.log('──────────────────────────────────────────────────────');
  if (result.success) {
    console.log(`✅ SUCCESS (HTTP ${result.status})`);
    console.log(`Message: ${result.message}`);
    console.log(`Accepted URLs: ${result.urlsSubmitted.length}`);
  } else {
    console.log(`⚠️ FAILED / WARNING (HTTP ${result.status})`);
    console.log(`Message: ${result.message}`);
    if (result.error) {
      console.log(`Error detail: ${result.error}`);
    }
  }
  console.log('──────────────────────────────────────────────────────\n');

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('[IndexNow CLI Error]', err);
  process.exit(1);
});
