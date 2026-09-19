// scripts/seed-demo.ts — 给本地/云端 MySQL 种入 3 篇 demo 文章 + 12 个常用 tag + 多对多关联
// 用法：npm run db:seed
// 幂等：重复执行不报错，已存在的 slug / (article_id, tag_id) 会跳过。
//
// 环境变量加载顺序：
//   1. 进程环境（MYSQLHOST/MYSQLUSER 等已显式传入时优先）
//   2. .env.local（开发者本地配置，gitignore）
//   3. .env（如果存在）
//   4. 内置兜底（匹配 docker-compose.yml 的本地开发默认值）
//
// 方言：MySQL。INSERT 用 INSERT IGNORE 实现「存在则跳过」，再 SELECT id 取回主键
// （CHAR(36) UUID 无自增，不能依赖 insertId）。

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import type { OkPacket, RowDataPacket } from "mysql2";

// 加载 .env.local（Next.js 之外需要手动 dotenv）
for (const name of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), name);
  if (existsSync(path)) loadEnv({ path, override: false });
}

// ---------- Tag 定义 ----------
// 覆盖本项目主流用法。slug 永久 ID，name 显示名，aliases 兼容老外链。
const TAGS: { slug: string; name: string; aliases?: string[] }[] = [
  { slug: "wechat-ai",        name: "微信 AI",   aliases: ["wechat-ai", "微信AI"] },
  { slug: "ai-assistant",     name: "AI 助手",   aliases: ["ai-assistant", "assistant"] },
  { slug: "search",           name: "搜索",      aliases: ["search", "AI搜索"] },
  { slug: "official-account", name: "公众号",    aliases: ["official-account", "OA"] },
  { slug: "miniprogram",      name: "小程序",    aliases: ["miniprogram", "wxapp"] },
  { slug: "automation",       name: "自动化",    aliases: ["automation", "auto-reply"] },
  { slug: "customer-service", name: "客服",      aliases: ["customer-service", "客服系统"] },
  { slug: "cloudbase",        name: "云开发",    aliases: ["cloudbase", "微信云开发"] },
  { slug: "mvp",              name: "MVP 实战",  aliases: ["mvp", "实战"] },
  { slug: "beginner",         name: "入门",      aliases: ["beginner", "新手"] },
  { slug: "advanced",         name: "进阶",      aliases: ["advanced", "高阶"] },
  { slug: "rag",              name: "RAG",       aliases: ["rag", "检索增强"] },
];

// ---------- Article 定义 ----------
type DemoArticle = {
  slug: string;
  title: string;
  summary: string;
  source_url: string;
  tags: string[]; // tag slugs
  markdown: string;
};

const ARTICLES: DemoArticle[] = [
  {
    slug: "wechat-ask-ai-guide",
    title: "微信「问一问」AI 搜索：从尝鲜到精通",
    summary: "微信内嵌 AI 搜索「问一问」全攻略：入口、提问技巧、参考来源核查、效率组合拳，覆盖日常问答、信息核实、学习辅助三大场景。",
    source_url: "https://example.feishu.cn/docx/demo-ask-ai-guide",
    tags: ["wechat-ai", "ai-assistant", "search", "beginner", "advanced"],
    markdown: `# 微信「问一问」AI 搜索：从尝鲜到精通

微信在 8.0.50+ 版本内嵌的 **「问一问」AI 搜索**，把搜索框升级成了对话框。它不是简单调用大模型回答——背后接入了微信生态的内容（公众号、视频号、网页），回答时会把来源标注出来。

## 一、入口在哪

三种打开方式，从易到难：

1. **搜索框上方 banner**：微信主界面顶部搜索栏下，AI 入口（带"试"字标签）
2. **聊天对话窗口**：长按消息 → "AI 解读"（单条消息内容解读）
3. **网页/聊天里选中文字**：长按 → "问一问"（针对选中内容提问）

> **版本要求**：iOS / Android 均需 8.0.50 以上，且部分功能灰度中。

## 二、提问模板：让回答从"能用"到"好用"

「问一问」对**结构化提问**反应最好。下面是三个高频场景的模板：

### 场景 1：信息核实
\`\`\`
{陈述句} 是真的吗？请用最新权威来源核对。
\`\`\`
例：「小米 SU7 Ultra 在纽北跑出 6 分 46 秒是真的吗？请用最新权威来源核对。」

### 场景 2：跨平台对比
\`\`\`
比较 {A} 和 {B} 在 {维度} 上的差异，给出表格。
\`\`\`

### 场景 3：基于公众号内容提问
\`\`\`
根据公众号「{名字}」近期文章，{问题}
\`\`\`
（AI 会优先检索该公众号的内容）

## 三、关键注意点

- **不擅长算术**：复杂数学题仍要靠外部工具；它会承认"算不出来"而不是瞎编
- **不查实时数据**：训练数据有截止时间，问"今天天气"会失败
- **隐私保护**：上传图片/文档会用于本轮回答，**不会**永久存储或用于训练
- **来源可见**：每条结论都能展开看引用的公众号文章，点击可跳转

## 四、和外部 AI 的对比

| 维度 | 问一问 | 外部 AI |
|---|---|---|
| 中文公众号内容 | ✅ 内置索引 | ❌ 需手动粘贴 |
| 实时信息 | ❌ | ✅（部分） |
| 长文档解读 | ✅ 100 页内 | ✅ 视模型而定 |
| 跨平台对话 | ❌ 微信内 | ✅ |

## 五、效率组合拳

把「问一问」当**信息入口**，复杂任务导出到专业工具：

1. 在「问一问」快速扫读公众号文章要点
2. 把关键段落复制到专业 AI 做深度分析
3. 结果用 Markdown 笔记工具整理

这条链路的优势是：把"找到信息"和"理解信息"解耦，每个环节用最合适的工具。

---

*下一篇会写「公众号接入 AI 自动回复」，关注不迷路。*
`,
  },

  {
    slug: "wechat-oa-ai-auto-reply",
    title: "公众号接入 AI 自动回复：让 7×24 客服成为可能",
    summary: "从 0 到 1 把公众号客服消息接入大模型：完整步骤、Prompt 模板、上下文管理、限流策略、常见踩坑与上线检查清单。",
    source_url: "https://example.feishu.cn/docx/demo-oa-ai-reply",
    tags: ["wechat-ai", "ai-assistant", "official-account", "automation", "customer-service", "advanced"],
    markdown: `# 公众号接入 AI 自动回复：让 7×24 客服成为可能

公众号的客服消息（48 小时内用户发的消息）天然适合 AI 接。这篇讲怎么从 0 搭一个真正能用的 AI 客服，不是"能回复"那种玩具。

## 一、整体架构

\`\`\`
用户消息
  ↓
微信服务器（POST 到你配置的 URL）
  ↓
你的后端（验证签名 → 拿到 XML）
  ↓
调用大模型 API（带上下文）
  ↓
组装客服消息 XML，回给微信
  ↓
用户收到回复
\`\`\`

技术栈选型：

| 组件 | 选型 | 备注 |
|---|---|---|
| 后端运行时 | Node.js 20+ | 微信 SDK 生态成熟 |
| 大模型 API | 任意 | DeepSeek / 豆包 / GPT 都行，看预算 |
| 上下文存储 | Redis | 48h TTL 自动过期 |
| 部署 | CloudBase 函数 | 免运维、按量付费 |

## 二、关键代码骨架

### 1. 消息路由（验证 + 解析）
\`\`\`ts
import crypto from "node:crypto";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const { signature, timestamp, nonce } = Object.fromEntries(url.searchParams);
  const body = await req.text();

  // 验证签名（必须！否则会被别人乱调）
  const token = process.env.WX_TOKEN!;
  const sha1 = crypto.createHash("sha1")
    .update([token, timestamp, nonce].sort().join(""))
    .digest("hex");
  if (sha1 !== signature) return new Response("invalid", { status: 401 });

  // 解析 XML → JSON（用 fast-xml-parser）
  const msg = parseWechatXML(body);

  // 只处理文本消息
  if (msg.MsgType !== "text") return new Response("success");

  // 异步处理（5s 内必须返回"success"）
  // 用 CloudBase 异步触发 / 入消息队列
  await enqueueReply(msg);

  return new Response("success");
}
\`\`\`

### 2. AI 回复生成
\`\`\`ts
import { Redis } from "@upstash/redis";

const SYSTEM_PROMPT = \`你是「{公众号名}」的 AI 助手。
- 知识范围：{列出公众号专注的领域}
- 不知道就说不知道，不要编造
- 用简体中文，控制在 200 字内
- 不要使用 markdown 格式（公众号不支持）
\`;

async function generateReply(userId: string, userMsg: string) {
  const redis = Redis.fromEnv();

  // 取出最近 10 轮上下文
  const history = await redis.lrange(\`chat:\${userId}\`, -20, -1) as string[];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(h => JSON.parse(h)),
    { role: "user", content: userMsg },
  ];

  const reply = await callLLM(messages);

  // 写回上下文
  await redis.rpush(\`chat:\${userId}\`,
    JSON.stringify({ role: "user", content: userMsg }),
    JSON.stringify({ role: "assistant", content: reply })
  );
  await redis.expire(\`chat:\${userId}\`, 48 * 3600);

  return reply;
}
\`\`\`

## 三、Prompt 模板要点

一个**能用**的客服 Prompt 至少包含：

1. **身份锚定**：「你是 XXX 公众号的助手」
2. **领域边界**：明确能回答什么、不能回答什么
3. **格式约束**：不要 markdown（公众号会显示原始字符）
4. **长度限制**：200 字内最佳
5. **兜底策略**：不知道就说不知道，附上转人工的入口

## 四、限流与成本控制

| 策略 | 阈值 | 实现 |
|---|---|---|
| 单用户 QPS | 5 req/min | Redis 计数器 |
| 单公众号日调用 | 10000 次/日 | 总量计数 + 告警 |
| 单次上下文长度 | 2000 tokens | 超出截断最早消息 |

**大模型成本估算**（以 DeepSeek 为例）：
- 输入 ¥0.14 / 百万 tokens，输出 ¥0.28 / 百万 tokens
- 单次问答约 1500 tokens 输入 + 200 tokens 输出 ≈ ¥0.0003
- 1 万次/日 ≈ ¥3/日

## 五、上线检查清单

- [ ] 签名校验开启（**最重要**，不校验会被刷）
- [ ] 异步处理（5s 内只回 success，真回复走队列）
- [ ] 上下文 TTL = 48h（用户发消息后 48h 内才能回复）
- [ ] 兜底话术（AI 报错时给友好提示）
- [ ] 转人工入口（在每条回复末尾加）
- [ ] 敏感词过滤（至少过滤竞品名、违禁词）
- [ ] 日志脱敏（不要把用户消息打到公开日志）

## 六、最容易踩的坑

1. **5s 超时**：微信要求 5 秒内返回。AI 调用常超时，**必须**异步处理
2. **客服消息窗口**：用户主动发消息后 48h 内可回复，**之后只能群发**
3. **签名验证**：token 是你公众号后台设的，**别硬编码到代码里**
4. **消息去重**：用户连发三条，前两条可能还在处理，要保证回复不会乱序

---

下一篇会讲**小程序 + 云开发**怎么搭一个 AI 客服 MVP，比公众号复杂一点但更可控。
`,
  },

  {
    slug: "wechat-mp-ai-customer-service",
    title: "小程序 + 微信云开发 + AI：3 天搭一个能用的智能客服 MVP",
    summary: "用微信云开发 + DeepSeek + 向量检索，3 天搭一个真实可用的小程序 AI 客服 MVP：含架构、代码骨架、上线检查、灰度发布与降级策略。",
    source_url: "https://example.feishu.cn/docx/demo-mp-ai-cs",
    tags: ["wechat-ai", "ai-assistant", "miniprogram", "cloudbase", "customer-service", "rag", "mvp", "advanced"],
    markdown: `# 小程序 + 微信云开发 + AI：3 天搭一个能用的智能客服 MVP

公众号 AI 客服做完了，**小程序**的需求来了——产品页、订单页、客服按钮都要 AI。这次讲怎么用**微信云开发**（一站式后端）3 天搭一个能上线的 MVP。

## 一、为什么选云开发

| 维度 | 自建后端 | 微信云开发 |
|---|---|---|
| 鉴权 | 自己写 wx.login 换 session | \`wx.cloud.callFunction\` 内置 |
| 数据库 | 申请 + 配置 + 运维 | \`wx.cloud.database()\` 直用 |
| 文件存储 | OSS/COS 配置 + 跨域 | \`wx.cloud.uploadFile\` 直用 |
| 计费 | 多套账单 | 一套按量计费 |
| 学习曲线 | 陡 | 平（前端同学 1 天上手） |

FREE 层够 MVP 用（数据库 2GB、函数 4 万次/月、存储 5GB）。

## 二、整体架构

\`\`\`
┌─────────────────────────────────────┐
│           小程序前端                  │
│  - 客服按钮（自定义 tabbar）          │
│  - WebView 聊天组件                   │
└────────────┬────────────────────────┘
             │ wx.cloud.callFunction
             ↓
┌─────────────────────────────────────┐
│        云函数 (Node.js 20)           │
│  - ai-chat: 主入口，带限流           │
│  - ai-embedding: 文档向量化          │
│  - ai-feedback: 反馈收集            │
└──┬──────────────┬───────────────┬────┘
   ↓              ↓               ↓
┌──────┐   ┌──────────┐   ┌─────────┐
│ 云DB │   │ 云存储    │   │ 大模型   │
│ (mongo)│  │ (文件)   │   │ API     │
└──────┘   └──────────┘   └─────────┘
\`\`\`

## 三、核心代码（云函数）

### 1. ai-chat：主入口
\`\`\`ts
// cloudfunctions/ai-chat/index.ts
import { init, database } from "wx-server-sdk";
init();

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY!;

export async function onCall({ event, OPENID }: { event: any; OPENID: string }) {
  const { message, sessionId } = event;
  const db = database();

  // 1. 限流：单用户 30 req/min
  const rateKey = \`rate:\${OPENID}\`;
  const rate = await db.collection("rate_limits").doc(rateKey).get();
  if (rate.data?.count >= 30) {
    return { code: 429, msg: "请求太频繁，请稍后再试" };
  }
  await db.collection("rate_limits").doc(rateKey).set({
    data: { count: (rate.data?.count ?? 0) + 1, updatedAt: Date.now() }
  });

  // 2. RAG：先查向量库
  const queryEmbedding = await getEmbedding(message);
  const matches = await db.collection("docs").where({
    embedding: db.command.expr({ $near: { $geometry: queryEmbedding } })
  }).limit(3).get();

  const context = matches.data.map(d => d.content).join("\\n\\n---\\n\\n");

  // 3. 组装 prompt 调 LLM
  const systemPrompt = \`你是小程序「{产品名}」的智能客服。
产品文档如下：
\${context}

如果文档里有答案，直接引用；如果没有，礼貌说"这个问题我还没学到，可以转人工吗？"
答案控制在 150 字内，不要 markdown。\`;

  const resp = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Authorization": \`Bearer \${DEEPSEEK_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 300,
      temperature: 0.3
    })
  });
  const data = await resp.json();
  const reply = data.choices[0].message.content;

  // 4. 记录对话（用于后续分析）
  await db.collection("chat_logs").add({
    data: { OPENID, sessionId, message, reply, ts: Date.now() }
  });

  return { code: 0, reply };
}

async function getEmbedding(text: string): Promise<number[]> {
  // 调用 embedding API（这里略）
  // 生产用 text-embedding-3-small 或 bge-large
  return [];
}
\`\`\`

### 2. ai-embedding：文档批量向量化
\`\`\`ts
// 把产品文档按段切分 → 调 embedding API → 写回云数据库
// 定时触发（每天一次），增量更新
\`\`\`

## 四、前端：极简聊天组件

不需要任何 UI 库，**30 行**就够：

\`\`\`tsx
// pages/chat/index.tsx
import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await wx.cloud.callFunction({
        name: "ai-chat",
        data: { message: userMsg.content, sessionId: "s1" }
      });
      setMessages(m => [...m, { role: "assistant", content: res.result.reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "网络开小差，请重试" }]);
    } finally { setLoading(false); }
  };

  return (
    <view className="flex flex-col h-screen">
      <scroll-view scroll-y className="flex-1 p-4">
        {messages.map((m, i) => (
          <view key={i} className={\`mb-3 \${m.role === "user" ? "text-right" : ""}\`}>
            <view className={\`inline-block p-2 rounded \${m.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100"}\`}>
              {m.content}
            </view>
          </view>
        ))}
      </scroll-view>
      <view className="flex p-2 border-t">
        <input value={input} onInput={e => setInput(e.detail.value)} className="flex-1 border rounded px-2" />
        <button onClick={send} className="ml-2 px-4 bg-blue-500 text-white rounded" disabled={loading}>
          {loading ? "..." : "发送"}
        </button>
      </view>
    </view>
  );
}
\`\`\`

## 五、上线与降级

### 灰度发布
\`\`\`ts
// ai-chat 加一个开关
const GRAY_PCT = 0.2; // 20% 流量走 AI，其余走 fallback
if (Math.random() > GRAY_PCT) {
  return { code: 0, reply: "客服繁忙，请稍后重试或转人工" };
}
\`\`\`

### 降级策略
| 触发条件 | 降级动作 |
|---|---|
| LLM API 5xx | 直接返回 fallback 文案 |
| LLM 延迟 > 3s | 超时即返回 fallback |
| embedding 服务挂 | 跳过 RAG，仅用基础 prompt |
| 单用户错误率 > 50% | 临时禁用该用户 AI 入口 |

### 监控指标
- **可用性**：函数成功率（应 > 99.5%）
- **延迟**：P95 调用时长（应 < 3s）
- **成本**：单次问答 token 消耗（监控异常飙升）
- **满意度**：用户主动点"👍/👎"比例

## 六、3 天时间表（参考）

| 时段 | 内容 |
|---|---|
| Day 1 上午 | 注册云开发、配环境、初始化数据库 |
| Day 1 下午 | ai-chat 云函数骨架，调通 LLM 直连 |
| Day 2 上午 | 文档向量化 + RAG 检索 |
| Day 2 下午 | 小程序前端聊天组件 |
| Day 3 上午 | 限流、灰度、监控、敏感词 |
| Day 3 下午 | 内测 + 修 bug + 上线 |

## 七、最容易踩的坑

1. **云函数冷启动**：第一次调用要 1-2s，可以加 \`preload\` 提前热
2. **OPENID 不能信**：所有写操作都用 \`OPENID\`（云开发自动注入），不要从 event 里取
3. **embedding 维度匹配**：写入时和查询时**必须用同一个模型**，否则维度对不上
4. **超时配置**：云函数默认 3s 超时，LLM 调用要异步或加 timeout config
5. **小程序网络限制**：发布前要加 request 合法域名

---

下一篇会写**怎么评估 AI 客服的"好不好用"**——一套可量化的指标体系。
`,
  },
];

// ---------- 执行 ----------
async function main() {
  // ---------- 解析连接参数 ----------
  // 本地优先策略：
  //   - MYSQLHOST 未设置，或是 .env 模板占位符（your-*/example.com）→ 视为本地开发，
  //     全部使用 docker-compose.yml 的默认值
  //     （127.0.0.1 / wx_ai_tips / app_user / local_dev_password，无 SSL）。
  //   - MYSQLHOST 是真实主机（来自 .env.local 或 shell 显式 export）→ 使用用户提供的
  //     MYSQLUSER / MYSQLDATABASE / MYSQLPASSWORD，并按 MYSQLSSL 决定是否启用 SSL。
  const isPlaceholder = (v?: string): boolean =>
    !v || /^(your[-_]|xxxxxxxx|replace-with)/i.test(v) || v.includes("example.com");

  const useLocal = isPlaceholder(process.env.MYSQLHOST);
  const host = useLocal ? "127.0.0.1" : process.env.MYSQLHOST!;
  const port = Number(process.env.MYSQLPORT ?? 3306);
  const database = useLocal ? "wx_ai_tips" : (process.env.MYSQLDATABASE ?? "wx_ai_tips");
  const user = useLocal ? "app_user" : (process.env.MYSQLUSER ?? "mysql");
  const password = useLocal ? "local_dev_password" : (process.env.MYSQLPASSWORD ?? "");
  const ssl =
    !useLocal && (process.env.MYSQLSSL === "require" || process.env.MYSQLSSL === "true")
      ? { rejectUnauthorized: false }
      : undefined;

  const source = useLocal ? "docker-compose defaults" : "shell/.env.local";
  console.log(`🔌 Connecting to ${user}@${host}:${port}/${database} (source: ${source}, ssl: ${!!ssl})...`);
  const conn = await mysql.createConnection({ host, port, user, password, database, ssl });
  console.log("✅ Connected");

  // ---- 1. 种 tags ----
  console.log("\n🏷  Seeding tags...");
  let tagsInserted = 0, tagsSkipped = 0;
  for (const t of TAGS) {
    // I-2.3: aliases 至少包含自身 slug
    const aliases = Array.from(new Set([t.slug, ...(t.aliases ?? [])]));
    const [res] = await conn.query<OkPacket>(
      `INSERT IGNORE INTO tags (slug, name, aliases)
       VALUES (?, ?, ?)`,
      [t.slug, t.name, JSON.stringify(aliases)],
    );
    if (res.affectedRows > 0) { tagsInserted++; console.log(`  + ${t.slug}`); }
    else { tagsSkipped++; }
  }
  console.log(`   ${tagsInserted} inserted, ${tagsSkipped} skipped`);

  // ---- 2. 种 articles ----
  console.log("\n📄 Seeding articles...");
  let articlesInserted = 0, articlesSkipped = 0;
  const articleIdBySlug = new Map<string, string>();

  for (const a of ARTICLES) {
    const [res] = await conn.query<OkPacket>(
      `INSERT IGNORE INTO articles
         (slug, title, summary, content_markdown, source_url, status, published_at)
       VALUES (?, ?, ?, ?, ?, 'published', NOW())`,
      [a.slug, a.title, a.summary, a.markdown, a.source_url],
    );
    const articleId: string = (
      await conn.query<(RowDataPacket & { id: string })[]>(
        `SELECT id FROM articles WHERE slug = ?`,
        [a.slug],
      )
    )[0][0]!.id;
    if (res.affectedRows > 0) { articlesInserted++; console.log(`  + ${a.slug} (id=${articleId})`); }
    else { articlesSkipped++; }
    articleIdBySlug.set(a.slug, articleId);
  }
  console.log(`   ${articlesInserted} inserted, ${articlesSkipped} skipped`);

  // ---- 3. 种 article_tags ----
  console.log("\n🔗 Linking article_tags...");
  let linksInserted = 0, linksSkipped = 0;
  for (const a of ARTICLES) {
    const articleId = articleIdBySlug.get(a.slug)!;
    for (const tagSlug of a.tags) {
      const tagRows = (
        await conn.query<(RowDataPacket & { id: string })[]>(
          `SELECT id FROM tags WHERE slug = ?`,
          [tagSlug],
        )
      )[0];
      if (tagRows.length === 0) {
        console.warn(`  ⚠️  tag not found: ${tagSlug} (skipped)`);
        continue;
      }
      const tagId = tagRows[0]!.id;
      const [res] = await conn.query<OkPacket>(
        `INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)`,
        [articleId, tagId],
      );
      if (res.affectedRows > 0) linksInserted++;
      else linksSkipped++;
    }
  }
  console.log(`   ${linksInserted} inserted, ${linksSkipped} skipped`);

  // ---- 4. 一次 import_events 记录（演示用）----
  console.log("\n📋 Recording seed import event...");
  const [importRes] = await conn.query<OkPacket>(
    `INSERT INTO import_events (source, status, finished_at, counts)
     VALUES ('feishu', 'succeeded', NOW(), ?)`,
    [JSON.stringify({
      articles: articlesInserted,
      tags: tagsInserted,
      links: linksInserted,
      mode: "seed-demo",
    })],
  );
  console.log(`   import_event insertId=${importRes.insertId}`);

  await conn.end();

  console.log("\n📊 Summary:");
  console.log(`   Tags:     +${tagsInserted} / skip ${tagsSkipped}`);
  console.log(`   Articles: +${articlesInserted} / skip ${articlesSkipped}`);
  console.log(`   Links:    +${linksInserted} / skip ${linksSkipped}`);
  console.log("\n✅ Seed done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
