// lib/db.ts — 服务端 MySQL 连接池（仅 Server Component / Route Handler 使用）
//
// 本地优先策略：Next.js 会自动加载 .env（其中含远程 CloudBase 占位符
// your-*.tencentcdb.com），因此这里采用与 scripts/seed-demo.ts 一致的
// 「本地优先」解析：
//   - MYSQLHOST 未设置或为占位符 → 使用 docker-compose 本地默认值
//     （127.0.0.1 / wx_ai_tips / app_user / local_dev_password，无 SSL）
//   - 否则（.env.local 或 shell 提供了真实主机）→ 使用用户提供的配置
import mysql from "mysql2/promise";

const isPlaceholder = (v?: string): boolean =>
  !v || /^(your[-_]|xxxxxxxx|replace-with)/i.test(v) || v.includes("example.com");

const useLocal = isPlaceholder(process.env.MYSQLHOST);

const poolConfig = useLocal
  ? {
      host: "127.0.0.1",
      port: 3306,
      user: "app_user",
      password: "local_dev_password",
      database: "wx_ai_tips",
      connectionLimit: 5,
    }
  : {
      host: process.env.MYSQLHOST!,
      port: Number(process.env.MYSQLPORT ?? 3306),
      user: process.env.MYSQLUSER ?? "mysql",
      password: process.env.MYSQLPASSWORD ?? "",
      database: process.env.MYSQLDATABASE ?? "wx_ai_tips",
      ssl:
        process.env.MYSQLSSL === "require" || process.env.MYSQLSSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
      connectionLimit: 5,
    };

// 开发环境热重载会反复执行模块，用 globalThis 复用连接池，避免连接数爆增。
const globalForDb = globalThis as unknown as { __mysqlPool?: mysql.Pool };
export const pool: mysql.Pool = globalForDb.__mysqlPool ?? mysql.createPool(poolConfig);
if (process.env.NODE_ENV !== "production") globalForDb.__mysqlPool = pool;

// 类型化查询辅助：mysql2 返回 [rows, fields]，这里只取 rows 并带业务类型返回。
// MySQL 的 TIMESTAMP 默认由驱动解析为 JS Date，与仓储层 Date|null 类型一致。
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
