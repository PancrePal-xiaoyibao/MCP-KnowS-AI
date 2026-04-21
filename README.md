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
| `KNOWS_API_KEY` | 是 | KnowS API 密钥 |
| `KNOWS_API_HOST` | 否 | API 地址，默认 `https://dev-api.nullht.com` |

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
```

## 工具列表

| 工具 | 说明 |
|------|------|
| `ai_search` | AI 检索，根据问题返回相关医学证据列表 |
| `evidence_summary` | 单篇证据 AI 概要总结 |
| `all_evidence_summary` | 获取所有证据的 AI 总结 |
| `evidence_highlight` | 获取证据被引用的原文内容 |
| `answer` | 基于问题和证据生成场景总结 |
| `answer_stream` | 场景总结（流式收集） |
| `auto_tagging` | 证据自动化标签提取 |
| `get_paper_en` | 英文文献详情 |
| `get_paper_cn` | 中文文献详情 |
| `get_guide` | 指南详情 |
| `get_meeting` | 会议详情 |
| `list_questions` | 历史提问列表 |
| `list_interpretations` | 文献解读历史列表 |
| `create_evidence_by_pdf` | 通过 PDF 创建新证据 |

## 系统提示词

项目附带了推荐的系统提示词 [`SYSTEM_PROMPT.md`](./SYSTEM_PROMPT.md)，用于指导 AI 助手基于 KnowS 工具进行结构化的医学文献调研。

## 发版

```bash
# 更新 package.json 中的 version 后
git tag v0.x.x
git push origin v0.x.x
```

推送 `v*` tag 后，GitHub Actions 会自动运行测试并发布到 GitHub Packages。
