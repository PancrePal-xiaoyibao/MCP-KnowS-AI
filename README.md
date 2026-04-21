# KnowS MCP Server

KnowS 医学证据检索与分析平台的 MCP (Model Context Protocol) Server。

## 安装

```bash
bun install
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `KNOWS_API_KEY` | 是 | KnowS API 密钥 |
| `KNOWS_API_HOST` | 否 | API 地址，默认 `https://dev-api.nullht.com` |

## 运行

```bash
KNOWS_API_KEY=your_key bun run start
```

## Claude Code 配置

在 `~/.claude/settings.json` 或项目 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "knows": {
      "command": "bun",
      "args": ["run", "/path/to/KnowS-MCP/src/index.ts"],
      "env": {
        "KNOWS_API_KEY": "your_api_key",
        "KNOWS_API_HOST": "https://api.nullht.com"
      }
    }
  }
}
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
