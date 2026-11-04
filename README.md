# KnowS MCP Server

KnowS 医学证据检索与分析平台的 MCP (Model Context Protocol) Server。

## 安装与使用

### 前置条件

本包发布在 GitHub Packages，需要先配置 npm registry。在 `~/.npmrc` 中添加：

```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
@PancrePal-xiaoyibao:registry=https://npm.pkg.github.com
```

> `YOUR_GITHUB_TOKEN` 需要有 `read:packages` 权限。

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `KNOWS_API_KEY` | 是 | KnowS API 密钥，在 [developers.nullht.com](https://developers.nullht.com/) 申请 |
| `KNOWS_API_HOST` | 否 | API 地址，默认 `https://api.nullht.com`（公开开发者 API）。接入内部 `/knows/*` 接口的环境可覆盖为 `https://dev-api.nullht.com` |
| `KNOWS_API_BASE_URL` | 否 | `KNOWS_API_HOST` 的**别名**，兼容旧包 `knows-mcp-server` 0.1.x。两者同时设置时以 `KNOWS_API_HOST` 优先 |
| `KNOWS_DEFAULT_DATA_SCOPE` | 否 | `ai_search` 省略 `data_scope` 时的默认类型，逗号分隔，如 `PAPER,GUIDE`。兼容旧包无前缀版的 `DEFAULT_DATA_SCOPE`，非法值自动回落内置默认 |
| `KNOWS_TIMEOUT_MS` | 否 | 单次请求超时毫秒数，默认 `60000` |

### Claude Code 配置

在 `~/.claude/settings.json` 或项目 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "knows": {
      "command": "npx",
      "args": ["@PancrePal-xiaoyibao/knows-mcp-server"],
      "env": {
        "KNOWS_API_KEY": "your_api_key",
        "KNOWS_API_HOST": "https://api.nullht.com"
      }
    }
  }
}
```

### Claude Desktop 配置

在 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）中添加：

```json
{
  "mcpServers": {
    "knows": {
      "command": "npx",
      "args": ["@PancrePal-xiaoyibao/knows-mcp-server"],
      "env": {
        "KNOWS_API_KEY": "your_api_key",
        "KNOWS_API_HOST": "https://api.nullht.com"
      }
    }
  }
}
```

### 直接运行

```bash
# 通过 npx
KNOWS_API_KEY=your_key npx @PancrePal-xiaoyibao/knows-mcp-server

# 或全局安装后运行
npm install -g @PancrePal-xiaoyibao/knows-mcp-server
KNOWS_API_KEY=your_key knows-mcp-server
```

## 本地开发

```bash
# 安装依赖
npm install

# 使用 bun 开发（热重载）
KNOWS_API_KEY=your_key bun run dev

# 构建
npm run build

# 运行构建产物
KNOWS_API_KEY=your_key npm start

# 离线单元测试（无需 API key，CI 跑的就是这个）
npm test

# 真实 API 冒烟测试（需要 API key，会产生网络请求与配额消耗）
KNOWS_API_KEY=your_key npm run smoke
```

## 工具列表

### 两套 API 与自动适配

KnowS 对外有两套 HTTP 接口：

| 接口组 | 路径 | 鉴权 | 能力 |
|---|---|---|---|
| 公开开发者 API | `/v1/evidences/*` | `Authorization: Bearer` | 6 类证据检索 |
| 内部 API | `/knows/*` | `x-api-key` | 14 个工具（含 AI 摘要、场景总结、全文详情等）|

`ai_search` 采用**双通道自适应**：优先请求公开 `/v1` 接口；若当前环境未开放或未授权
（HTTP `401` / `403` / `404`），自动回退到内部 `/knows/ai_search`。
网络错误与超时**不会**触发回退，避免掩盖真实故障。

因此三种典型配置都能直接使用：

| 你的情况 | 实际行为 |
|---|---|
| 公开级 key + `https://api.nullht.com` | 走 `/v1`，可用 6 类证据（含 `TRIAL` / `PACKAGE_INSERT`）|
| 内部授权 key + 内部 host | `/v1` 不通时回退 `/knows`，可用 4 类证据（`PAPER` / `PAPER_CN` / `GUIDE` / `MEETING`）|
| 沿用旧包变量名 `KNOWS_API_BASE_URL` | 自动识别，不会因变量名不符而静默回落默认 host |

其余 13 个工具依赖内部 `/knows/*`，需单独向 KnowS 申请授权；未授权时调用会返回
`403 Application is not allowed to access the requested API`，并在错误信息中提示改用 `ai_search`。

### 工具清单

| 工具 | 接口 | 说明 |
|------|------|------|
| `ai_search` | 公开 `/v1` → 回退内部 `/knows` | AI 检索，返回相关医学证据列表。`data_scope` 支持 `PAPER` / `PAPER_CN` / `MEETING` / `GUIDE` / `TRIAL` / `PACKAGE_INSERT`，可一次检索多类（省略时默认 `["PAPER","GUIDE"]`，可由 `KNOWS_DEFAULT_DATA_SCOPE` 覆盖） |
| `evidence_summary` | 内部 `/knows` | 单篇证据 AI 概要总结 |
| `all_evidence_summary` | 内部 `/knows` | 获取所有证据的 AI 总结 |
| `evidence_highlight` | 内部 `/knows` | 获取证据被引用的原文内容 |
| `answer` | 内部 `/knows` | 基于问题和证据生成场景总结 |
| `answer_stream` | 内部 `/knows` | 场景总结（流式收集） |
| `auto_tagging` | 内部 `/knows` | 证据自动化标签提取 |
| `get_paper_en` | 内部 `/knows` | 英文文献详情 |
| `get_paper_cn` | 内部 `/knows` | 中文文献详情 |
| `get_guide` | 内部 `/knows` | 指南详情 |
| `get_meeting` | 内部 `/knows` | 会议详情 |
| `list_questions` | 内部 `/knows` | 历史提问列表 |
| `list_interpretations` | 内部 `/knows` | 文献解读历史列表 |
| `create_evidence_by_pdf` | 内部 `/knows` | 通过 PDF 创建新证据 |

## 系统提示词

项目附带了推荐的系统提示词 [`SYSTEM_PROMPT.md`](./SYSTEM_PROMPT.md)，用于指导 AI 助手基于 KnowS 工具进行结构化的医学文献调研。

## 发版

```bash
# 更新 package.json 中的 version 后
git tag v0.x.x
git push origin v0.x.x
```

推送 `v*` tag 后，GitHub Actions 会自动运行测试并发布到 GitHub Packages。
