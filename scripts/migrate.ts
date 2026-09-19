// scripts/migrate.ts — 应用 SQL 迁移到 Postgres
// 用法：pnpm db:migrate
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

async function main() {
  const host = process.env.PGHOST;
  const port = Number(process.env.PGPORT ?? 5432);
  const database = process.env.PGDATABASE ?? "postgres";
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;

  if (!host || !user || !password) {
    console.error("❌ Missing PG env vars (PGHOST / PGUSER / PGPASSWORD)");
    console.error("   Copy .env.example to .env.local and fill in");
    process.exit(1);
  }

  console.log(`🔌 Connecting to ${user}@${host}:${port}/${database}...`);

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log("✅ Connected");

  // 确保迁移追踪表存在
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(20) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 读取所有迁移文件（数字前缀排序）
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");

    // 检查是否已应用
    const result = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1",
      [version],
    );

    if ((result.rowCount ?? 0) > 0) {
      console.log(`⏭  Skip ${version} (already applied)`);
      skipped++;
      continue;
    }

    console.log(`🔄 Apply ${version}...`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      await client.query("COMMIT");
      console.log(`✅ Apply ${version} OK`);
      applied++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ Apply ${version} FAILED:`, err);
      process.exit(1);
    }
  }

  await client.end();

  console.log("");
  console.log(`📊 Summary: ${applied} applied, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});