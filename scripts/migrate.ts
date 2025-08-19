#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(`create table if not exists migrations (id text primary key, run_at timestamptz default now());`);

  const dir = path.join(process.cwd(), 'scripts', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const id = f;
    const { rows } = await client.query('select 1 from migrations where id=$1', [id]);
    if (rows.length > 0) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`Applying ${f}...`);
    await client.query('begin');
    try {
      // replace ${HOUSEHOLD_SLUG} env placeholder
      const rendered = sql.replaceAll('${HOUSEHOLD_SLUG}', process.env.HOUSEHOLD_SLUG || 'old-rectory');
      await client.query(rendered);
      await client.query('insert into migrations(id) values($1)', [id]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  await client.end();
  console.log('Migrations complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
