#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

// Minimal migration runner using Supabase SQL API (requires service role via PostgREST not available).
// Alternative: connect via pg connection string. For simplicity, this script just prints the files.
// In real use, prefer a proper migration tool or direct DB connection.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

(async () => {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Applying ${files.length} migration(s):`);
  for (const f of files) {
    const p = path.join(migrationsDir, f);
    const sql = fs.readFileSync(p, 'utf8');
    console.log(`\n--- ${f} ---`);
    console.log(sql.split('\n').slice(0, 10).join('\n')); // preview first 10 lines
    console.log('\nNOTE: Hook up to your DB runner to actually execute.');
  }
})();
