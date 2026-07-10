// Runs an additive SQL migration file against the Neon DB, one statement at a
// time. Usage: node scripts/run-migration.mjs scripts/migrations/001-...sql
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to.sql>");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
const raw = await readFile(new URL(`../${file}`, import.meta.url), "utf8");

// Strip line comments, then split on semicolons into individual statements.
const statements = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 70);
  try {
    await sql.query(stmt);
    console.log("✓", label);
  } catch (err) {
    console.error("✗", label, "\n  ", err.message);
    process.exit(1);
  }
}
console.log(`\nDone — ${statements.length} statement(s) applied.`);
