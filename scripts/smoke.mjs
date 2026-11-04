#!/usr/bin/env node
/**
 * 真实 API 冒烟测试（需要 KNOWS_API_KEY，会产生真实网络请求与配额消耗）。
 *
 * 用法：
 *   KNOWS_API_KEY=sk-knows-xxx npm run smoke
 *   KNOWS_API_KEY=sk-knows-xxx KNOWS_API_HOST=https://api.nullht.com npm run smoke
 *
 * 覆盖：六类证据检索端点全部打通，并抽查返回结构。
 * 这类测试不能放进 CI（CI 无 key），CI 只跑离线的 npm test。
 */
import { KnowSClient, PUBLIC_EVIDENCE_ENDPOINTS } from "../build/client.js";

const apiKey = process.env.KNOWS_API_KEY;
if (!apiKey) {
  console.error("缺少 KNOWS_API_KEY 环境变量，无法执行冒烟测试。");
  process.exit(1);
}

const apiHost = process.env.KNOWS_API_HOST ?? "https://api.nullht.com";
const query = process.env.KNOWS_SMOKE_QUERY ?? "What evidence supports NPM1 mutation in MDS?";
const client = new KnowSClient(apiHost, apiKey);

const kinds = Object.keys(PUBLIC_EVIDENCE_ENDPOINTS);

console.log(`host     : ${apiHost}`);
console.log(`query    : ${query}`);
console.log(`kinds    : ${kinds.join(", ")}`);
console.log("");

let failed = 0;

for (const kind of kinds) {
  const path = PUBLIC_EVIDENCE_ENDPOINTS[kind];
  const startedAt = Date.now();
  try {
    const result = await client.aiSearchPublic(query, [kind]);
    const elapsed = Date.now() - startedAt;
    const first = result.evidences[0];
    const detail = first
      ? `首条: ${String(first.title).slice(0, 70)}${first.publish_date ? ` (${first.publish_date})` : ""}`
      : "返回 0 条";
    const ok = result.evidences.length > 0;
    if (!ok) failed += 1;
    console.log(
      `${ok ? "✅" : "⚠️ "} ${kind.padEnd(15)} ${String(result.evidences.length).padStart(3)} 条  ${String(elapsed).padStart(5)}ms  ${path}`
    );
    console.log(`   ${detail}`);
  } catch (error) {
    failed += 1;
    console.log(`❌ ${kind.padEnd(15)} 失败  ${path}`);
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 多类型合并检索（模拟一次调用拿多类证据）
console.log("\n--- 多类型合并检索 ---");
try {
  const startedAt = Date.now();
  const merged = await client.aiSearchPublic(query, ["PAPER", "GUIDE", "MEETING"]);
  const elapsed = Date.now() - startedAt;
  console.log(
    `✅ 合并返回 ${merged.total} 条（${elapsed}ms），question_ids: ${JSON.stringify(merged.question_ids)}`
  );
  const byKind = merged.evidences.reduce((acc, item) => {
    const key = item.evidence_kind ?? "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`   分布: ${JSON.stringify(byKind)}`);
  if (merged.errors?.length) {
    console.log(`   errors: ${JSON.stringify(merged.errors)}`);
    failed += 1;
  }
} catch (error) {
  failed += 1;
  console.log(`❌ 合并检索失败: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");
if (failed > 0) {
  console.error(`冒烟测试存在 ${failed} 项失败。`);
  process.exit(1);
}
console.log("冒烟测试全部通过。");
