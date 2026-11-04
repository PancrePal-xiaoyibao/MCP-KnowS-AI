/**
 * 公开开发者 API（/v1）相关逻辑的离线单元测试。
 *
 * 这些用例不发起任何网络请求（fetch 由测试桩替换），因此可以在 CI 里
 * 无 key、无网络的情况下运行：`npm test`。
 */
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_API_HOST,
  KnowSApiError,
  KnowSClient,
  LEGACY_SUPPORTED_KINDS,
  PUBLIC_EVIDENCE_ENDPOINTS,
  publicEvidenceEndpoint,
  resolveApiHost,
  shouldFallbackToLegacy,
} from "../build/client.js";

const BASE = "https://api.nullht.com";

/** 替换 globalThis.fetch，返回恢复函数 */
function stubFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => handler(String(url), init ?? {});
  return () => {
    globalThis.fetch = original;
  };
}

/** 造一个 JSON 响应；status>=400 时视为失败响应 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const restores = [];
afterEach(() => {
  while (restores.length > 0) {
    const restore = restores.pop();
    if (restore) restore();
  }
});

describe("证据类型 → 端点映射", () => {
  test("覆盖全部六类证据", () => {
    const kinds = Object.keys(PUBLIC_EVIDENCE_ENDPOINTS).sort();
    assert.deepEqual(kinds, [
      "GUIDE",
      "MEETING",
      "PACKAGE_INSERT",
      "PAPER",
      "PAPER_CN",
      "TRIAL",
    ]);
  });

  test("路径与官方 OpenAPI 合约一致", () => {
    assert.equal(PUBLIC_EVIDENCE_ENDPOINTS.PAPER, "/v1/evidences/ai_search_paper_en");
    assert.equal(PUBLIC_EVIDENCE_ENDPOINTS.PAPER_CN, "/v1/evidences/ai_search_paper_cn");
    assert.equal(PUBLIC_EVIDENCE_ENDPOINTS.MEETING, "/v1/evidences/ai_search_meeting");
    assert.equal(PUBLIC_EVIDENCE_ENDPOINTS.GUIDE, "/v1/evidences/ai_search_guide");
    assert.equal(PUBLIC_EVIDENCE_ENDPOINTS.TRIAL, "/v1/evidences/ai_search_trial");
    assert.equal(
      PUBLIC_EVIDENCE_ENDPOINTS.PACKAGE_INSERT,
      "/v1/evidences/ai_search_package_insert"
    );
  });

  test("publicEvidenceEndpoint 对未知类型返回 undefined", () => {
    assert.equal(publicEvidenceEndpoint("PAPER"), "/v1/evidences/ai_search_paper_en");
    assert.equal(publicEvidenceEndpoint("NOPE"), undefined);
  });
});

describe("aiSearchPublic", () => {
  test("使用 Bearer 鉴权并打到正确的 URL", async () => {
    const seen = [];
    restores.push(
      stubFetch((url, init) => {
        seen.push({ url, headers: init.headers });
        return jsonResponse({ question_id: "q1", evidences: [] });
      })
    );

    const client = new KnowSClient(BASE, "test-key");
    await client.aiSearchPublic("anything", ["PAPER"]);

    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, `${BASE}/v1/evidences/ai_search_paper_en`);
    assert.equal(seen[0].headers.Authorization, "Bearer test-key");
  });

  test("baseUrl 末尾斜杠不会产生双斜杠", async () => {
    const urls = [];
    restores.push(
      stubFetch((url) => {
        urls.push(url);
        return jsonResponse({ question_id: "q", evidences: [] });
      })
    );

    const client = new KnowSClient(`${BASE}/`, "k");
    await client.aiSearchPublic("q", ["GUIDE"]);

    assert.equal(urls[0], `${BASE}/v1/evidences/ai_search_guide`);
  });

  test("多类型结果合并，并逐条标记 evidence_kind", async () => {
    restores.push(
      stubFetch((url) => {
        if (url.endsWith("ai_search_paper_en")) {
          return jsonResponse({
            question_id: "q-paper",
            evidences: [{ id: "a", title: "Paper A" }],
          });
        }
        return jsonResponse({
          question_id: "q-guide",
          evidences: [{ id: "b", title: "Guide B" }],
        });
      })
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchPublic("q", ["PAPER", "GUIDE"]);

    assert.equal(result.total, 2);
    assert.equal(result.evidences.length, 2);
    assert.equal(result.evidences[0].evidence_kind, "PAPER");
    assert.equal(result.evidences[1].evidence_kind, "GUIDE");
    assert.equal(result.question_ids.PAPER, "q-paper");
    assert.equal(result.question_ids.GUIDE, "q-guide");
    // 多类型时不再输出单一 question_id
    assert.equal(result.question_id, undefined);
  });

  test("单一类型成功时保留 question_id，兼容旧输出形状", async () => {
    restores.push(
      stubFetch(() => jsonResponse({ question_id: "q-only", evidences: [{ id: "a", title: "A" }] }))
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchPublic("q", ["PAPER"]);

    assert.equal(result.question_id, "q-only");
    assert.equal(result.evidences[0].evidence_kind, "PAPER");
  });

  test("单类失败不影响其它类型，并记录 errors", async () => {
    restores.push(
      stubFetch((url) => {
        if (url.endsWith("ai_search_guide")) {
          return jsonResponse({ code: 500, message: "boom" }, 500);
        }
        return jsonResponse({ question_id: "q", evidences: [{ id: "a", title: "A" }] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchPublic("q", ["PAPER", "GUIDE"]);

    assert.equal(result.total, 1);
    assert.equal(result.evidences.length, 1);
    assert.equal(result.errors?.length, 1);
    assert.equal(result.errors?.[0].kind, "GUIDE");
  });

  test("全部类型失败时抛出错误", async () => {
    restores.push(stubFetch(() => jsonResponse({ code: 500 }, 500)));

    const client = new KnowSClient(BASE, "k");
    await assert.rejects(
      () => client.aiSearchPublic("q", ["PAPER", "TRIAL"]),
      /所有证据类型检索均失败/
    );
  });

  test("data_scope 为空时抛出明确错误", async () => {
    const client = new KnowSClient(BASE, "k");
    await assert.rejects(() => client.aiSearchPublic("q", []), /data_scope 不能为空/);
  });

  test("重复类型只请求一次", async () => {
    let calls = 0;
    restores.push(
      stubFetch(() => {
        calls += 1;
        return jsonResponse({ question_id: "q", evidences: [] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    await client.aiSearchPublic("q", ["PAPER", "PAPER"]);

    assert.equal(calls, 1);
  });

  test("并发检索六类时每个端点各请求一次", async () => {
    const urls = [];
    restores.push(
      stubFetch((url) => {
        urls.push(url);
        return jsonResponse({ question_id: "q", evidences: [] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    await client.aiSearchPublic("q", [
      "PAPER",
      "PAPER_CN",
      "MEETING",
      "GUIDE",
      "TRIAL",
      "PACKAGE_INSERT",
    ]);

    assert.equal(urls.length, 6);
    assert.deepEqual(
      urls.sort(),
      Object.values(PUBLIC_EVIDENCE_ENDPOINTS)
        .map((p) => `${BASE}${p}`)
        .sort()
    );
  });
});

describe("旧内部接口的错误提示", () => {
  test("403 时附带切换到公开接口的指引", async () => {
    restores.push(stubFetch(() => jsonResponse({ code: 403, message: "denied" }, 403)));

    const client = new KnowSClient(BASE, "k");
    await assert.rejects(
      () => client.evidenceSummary("x"),
      (err) => {
        assert.match(err.message, /403/);
        assert.match(err.message, /ai_search/);
        assert.match(err.message, /\/v1\/evidences/);
        return true;
      }
    );
  });
});

describe("host 解析与环境变量别名", () => {
  test("KNOWS_API_HOST 优先级最高", () => {
    assert.equal(
      resolveApiHost({
        KNOWS_API_HOST: "https://a.example.com",
        KNOWS_API_BASE_URL: "https://b.example.com",
      }),
      "https://a.example.com"
    );
  });

  test("兼容旧包(0.1.x)的 KNOWS_API_BASE_URL", () => {
    assert.equal(
      resolveApiHost({ KNOWS_API_BASE_URL: "https://dev-api.nullht.com" }),
      "https://dev-api.nullht.com"
    );
  });

  test("都未设置时使用默认 host", () => {
    assert.equal(resolveApiHost({}), DEFAULT_API_HOST);
  });

  test("去除尾部斜杠，避免拼接出双斜杠", () => {
    assert.equal(resolveApiHost({ KNOWS_API_HOST: "https://x.example.com///" }), "https://x.example.com");
  });

  test("空白值回落到默认 host", () => {
    assert.equal(resolveApiHost({ KNOWS_API_HOST: "   " }), DEFAULT_API_HOST);
  });
});

describe("回退判定", () => {
  test("401/403/404 触发回退", () => {
    for (const status of [401, 403, 404]) {
      assert.equal(
        shouldFallbackToLegacy(new KnowSApiError(status, "/v1/x", "")),
        true,
        `status ${status} 应触发回退`
      );
    }
  });

  test("其它状态码与普通错误不触发回退", () => {
    assert.equal(shouldFallbackToLegacy(new KnowSApiError(500, "/v1/x", "")), false);
    assert.equal(shouldFallbackToLegacy(new KnowSApiError(429, "/v1/x", "")), false);
    assert.equal(shouldFallbackToLegacy(new Error("boom")), false);
    assert.equal(shouldFallbackToLegacy(new TypeError("fetch failed")), false);
  });

  test("内部接口仅支持四类证据", () => {
    assert.deepEqual([...LEGACY_SUPPORTED_KINDS].sort(), ["GUIDE", "MEETING", "PAPER", "PAPER_CN"]);
  });
});

describe("aiSearchSmart 双通道自适应", () => {
  test("/v1 返回 403 时自动回退到内部 /knows/ai_search", async () => {
    const urls = [];
    restores.push(
      stubFetch((url) => {
        urls.push(url);
        if (url.includes("/v1/evidences/")) {
          return jsonResponse({ code: 403, message: "Application is not allowed" }, 403);
        }
        return jsonResponse({
          question_id: "legacy-q",
          evidences: [{ id: "a", title: "Legacy A", summary: "s", type: "PAPER" }],
        });
      })
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchSmart("q", ["PAPER"]);

    assert.equal(result.total, 1);
    assert.equal(result.question_id, "legacy-q");
    assert.equal(result.question_ids.PAPER, "legacy-q");
    assert.equal(result.evidences[0].evidence_kind, "PAPER");
    assert.ok(
      urls.some((u) => u.endsWith("/knows/ai_search")),
      "应回退请求内部接口"
    );
  });

  test("公开 API 正常时不触发回退", async () => {
    const urls = [];
    restores.push(
      stubFetch((url) => {
        urls.push(url);
        return jsonResponse({ question_id: "pub-q", evidences: [{ id: "x", title: "X" }] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchSmart("q", ["PAPER"]);

    assert.equal(urls.length, 1);
    assert.ok(urls[0].includes("/v1/evidences/"));
    assert.equal(result.question_id, "pub-q");
  });

  test("仅请求内部不支持的类型时给出明确错误", async () => {
    restores.push(
      stubFetch((url) => {
        if (url.includes("/v1/")) return jsonResponse({ code: 403 }, 403);
        return jsonResponse({ question_id: "q", evidences: [] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    await assert.rejects(
      () => client.aiSearchSmart("q", ["TRIAL"]),
      /内部 \/knows\/ai_search 仅支持/
    );
  });

  test("混合类型回退时保留可用类型，缺失类型记入 errors", async () => {
    restores.push(
      stubFetch((url) => {
        if (url.includes("/v1/")) return jsonResponse({ code: 403 }, 403);
        return jsonResponse({ question_id: "q", evidences: [{ id: "a", title: "A" }] });
      })
    );

    const client = new KnowSClient(BASE, "k");
    const result = await client.aiSearchSmart("q", ["PAPER", "TRIAL"]);

    assert.equal(result.total, 1);
    assert.equal(result.errors?.length, 1);
    assert.equal(result.errors?.[0].kind, "TRIAL");
  });

  test("网络错误不触发回退，避免掩盖真实故障", async () => {
    let calls = 0;
    restores.push(
      stubFetch(() => {
        calls += 1;
        throw new TypeError("network down");
      })
    );

    const client = new KnowSClient(BASE, "k");
    await assert.rejects(() => client.aiSearchSmart("q", ["PAPER"]), /network down/);
    assert.equal(calls, 1, "不应发生回退请求");
  });
});
