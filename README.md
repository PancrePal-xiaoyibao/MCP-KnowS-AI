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
| `KNOWS_API_HOST` | 否 | API 地址，默认 `https://api.nullht.com`（公开开发者 API）。若要接入内部 `/knows/*` 接口，可覆盖为 `https://dev-api.nullht.com` |
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

KnowS 有两套 API。`ai_search` 使用**公开开发者 API**（`/v1/evidences/*`，Bearer 鉴权），
开箱可用；其余工具使用**内部 API**（`/knows/*`），需要单独向 KnowS 申请授权，
否则在生产环境调用会返回 `403 Application is not allowed to access the requested API`。

| 工具 | 接口 | 说明 |
|------|------|------|
| `ai_search` | 公开 `/v1` | AI 检索，返回相关医学证据列表。`data_scope` 支持 `PAPER` / `PAPER_CN` / `MEETING` / `GUIDE` / `TRIAL` / `PACKAGE_INSERT`，可一次检索多类（省略时默认 `["PAPER","GUIDE"]`） |
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
