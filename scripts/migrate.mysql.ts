// scripts/migrate.mysql.ts — 应用 SQL 迁移到 MySQL / TDSQL-C
// 用法：npm run db:migrate   （需先配置 MYSQL* 环境变量）
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
// 仅应用 MySQL 版迁移（*.mysql.sql）
const MIGRATION_RE = /\.mysql\.sql$/;

function splitStatements(sql: string): string[] {
  const clean = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  return clean
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const host = process.env.MYSQLHOST;
  const port = Number(process.env.MYSQLPORT ?? 3306);
  const database = process.env.MYSQLDATABASE;
  const user = process.env.MYSQLUSER;
  const password = process.env.MYSQLPASSWORD;

  if (!host || !user || !password || !database) {
    console.error("❌ Missing MYSQL env vars (MYSQLHOST / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE)");
    console.error("   Copy .env.example to .env.local and fill in");
    process.exit(1);
  }

  const ssl =
    process.env.MYSQLSSL === "require" || process.env.MYSQLSSL === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  console.log(`🔌 Connecting to ${user}@${host}:${port}/${database}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database, ssl });
  console.log("✅ Connected");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(20) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => MIGRATION_RE.test(f))
    .sort();

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const version = file.replace(MIGRATION_RE, "");
    const [rows] = await conn.query(
      "SELECT 1 FROM schema_migrations WHERE version = ?",
      [version],
    );
    if ((rows as any[]).length > 0) {
      console.log(`⏭  Skip ${version} (already applied)`);
      skipped++;
      continue;
    }

    console.log(`🔄 Apply ${version}...`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    try {
      for (const stmt of splitStatements(sql)) {
        await conn.query(stmt);
      }
      await conn.query("INSERT INTO schema_migrations (version) VALUES (?)", [version]);
      console.log(`✅ Apply ${version} OK`);
      applied++;
    } catch (err) {
      console.error(`❌ Apply ${version} FAILED:`, err);
      process.exit(1);
    }
  }

  const [tables] = await conn.query("SHOW TABLES");
  console.log("📋 Tables:", (tables as any[]).map((t) => Object.values(t)[0]).join(", "));
  await conn.end();

  console.log("");
  console.log(`📊 Summary: ${applied} applied, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
