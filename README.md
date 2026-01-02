# KnowS MCP Server

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview
A Model Context Protocol (MCP) server that integrates with the **KnowS** evidence & question-answering API. It enables LLMs to use two core workflows:

- **Scenario 1: Patient Q&A and information support**
  - Search clinical evidence and retrieve `question_id + evidences`
  - Generate clinical / research / popular-science answers tailored to patients and peer-support communities

- **Scenario 2: Academic retrieval and deep research**
  - Fetch structured details for single papers, guidelines, and conference abstracts
  - Run auto-tagging and query history for evidence-based research workflows


### Features
- ✅ MCP server using stdio transport
- ✅ KnowS HTTP client with `x-api-key` authentication
- ✅ Clear separation between **patient-facing QA tools** and **research-oriented evidence tools**
- ✅ TypeScript with strict typing
- ✅ Jest-based unit/integration test hooks (to be implemented)

### Tech Stack
- Node.js (ES Modules)
- TypeScript
- `@modelcontextprotocol/sdk`
- Axios
- dotenv

### Installation

#### Option 1: Install from npm (Recommended)
```bash
npm install knows-mcp-server
```

#### Option 2: Build from source
From project root:
```bash
npm install
```

Build:
```bash
npm run build
```

Run (after build):
```bash
npm start
```

Development (watch):
```bash
npm run dev
```

### Configuration

The server reads configuration from **environment variables**. During local development, they can be managed via a `.env` file (loaded by `dotenv`), and in MCP deployment they should be set in the MCP config (e.g. Claude Desktop `env` block).

Supported variables:

- `KNOWS_API_KEY` (required): Your KnowS `x-api-key`
- `KNOWS_API_BASE_URL` (required): API base URL, e.g. `https://dev-api.nullht.com` or `https://api.nullht.com`
- `LOG_LEVEL` (optional): Log level, e.g. `info`, `debug`, `error` (defaults to `info`)
- `DEFAULT_DATA_SCOPE` (optional): Default evidence types for `knows_ai_search`, e.g. `"GUIDE,PAPER"` (defaults to all types if not set)

#### Example `.env` (local dev)

```env
# Test environment
KNOWS_API_KEY=your_test_api_key_here
KNOWS_API_BASE_URL=https://dev-api.nullht.com
LOG_LEVEL=info

# Default evidence search scope (optional, for speed)
# If not set, defaults to all: PAPER,PAPER_CN,GUIDE,MEETING
# DEFAULT_DATA_SCOPE=GUIDE,PAPER

# Production example (comment out test values and enable these when needed)
# KNOWS_API_KEY=your_prod_api_key_here
# KNOWS_API_BASE_URL=https://api.nullht.com
```

#### Example MCP config (Claude Desktop)

In `claude_desktop_config.json` (or equivalent):

```json
{
  "mcpServers": {
    "knows-mcp": {
      "command": "npx",
      "args": ["knows-mcp-server"],
      "env": {
        "KNOWS_API_KEY": "your_api_key_here",
        "KNOWS_API_BASE_URL": "https://dev-api.nullht.com",
        "DEFAULT_DATA_SCOPE": "GUIDE,PAPER",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

For **production**, change the environment values accordingly, for example:
- Set `KNOWS_API_BASE_URL` to `https://api.nullht.com`
- Use your production `KNOWS_API_KEY` (do not reuse test keys in production)



> Note: In local development, `.env` is loaded automatically; in deployment, the MCP host should pass environment variables via its own configuration.

### MCP Tools

#### 1. `knows_ai_search`
**Purpose**: Question → evidence search, returns a `question_id` and a list of evidences.

- **Parameters**:
  - `question` (string, required): User question text
  - `data_scope` (string[], optional): Evidence types, any of `"PAPER" | "PAPER_CN" | "GUIDE" | "MEETING"`. If not provided, uses `DEFAULT_DATA_SCOPE` from config or defaults to all types.
- **Backend API**: `POST /knows/ai_search`

#### 2. `knows_answer`
**Purpose**: Generate a scene-based answer for a given `question_id`.

- **Parameters**:
  - `question_id` (string, required)
  - `answer_type` (string, required): One of `"CLINICAL" | "RESEARCH" | "POPULAR_SCIENCE"`
- **Backend API**: `POST /knows/answer`
- **Usage hint**: Use the routing strategy described in the design doc (keywords: 科普/研究/临床) to choose `answer_type` automatically.

#### 3. `knows_evidence_summary`
**Purpose**: Get AI-generated summary for a single evidence item.

- **Parameters**:
  - `evidence_id` (string, required)
- **Backend API**: `POST /knows/evidence/summary`

#### 4. `knows_evidence_highlight`
**Purpose**: Get highlighted original-text snippets for a given evidence (for citation / context).

- **Parameters**:
  - `evidence_id` (string, required)
- **Backend API**: `POST /knows/evidence/highlight`

#### 5. `knows_get_paper_en`
**Purpose**: Get structured details of an English paper.

- **Parameters**:
  - `evidence_id` (string, required)
  - `translate_to_chinese` (boolean, optional): Whether to translate title/abstract
- **Backend API**: `POST /knows/evidence/get_paper_en`

#### 6. `knows_get_paper_cn`
**Purpose**: Get structured details of a Chinese paper.

- **Parameters**:
  - `evidence_id` (string, required)
- **Backend API**: `POST /knows/evidence/get_paper_cn`

#### 7. `knows_get_guide`
**Purpose**: Get guideline details.

- **Parameters**:
  - `evidence_id` (string, required)
  - `translate_to_chinese` (boolean, optional)
- **Backend API**: `POST /knows/evidence/get_guide`

#### 8. `knows_get_meeting`
**Purpose**: Get conference abstract details.

- **Parameters**:
  - `evidence_id` (string, required)
  - `translate_to_chinese` (boolean, optional)
- **Backend API**: `POST /knows/evidence/get_meeting`

#### 9. `knows_auto_tagging`
**Purpose**: Auto-tagging for research metadata (disease, population, outcome, etc.).

- **Parameters**:
  - `content` (string, optional): Raw text
  - `evidence_id` (string, optional): Evidence ID (used for full-text)
  - `tagging_type` (string, required): One of the types defined in the KnowS docs
- **Backend API**: `POST /knows/auto_tagging`

#### 10. `knows_list_question`
**Purpose**: Get history of user questions.

- **Parameters**:
  - `from_time` (number, optional): Timestamp (ms)
  - `to_time` (number, optional): Timestamp (ms)
  - `page` (number, optional)
  - `page_size` (number, optional)
- **Backend API**: `POST /knows/list_question`

#### 11. `knows_list_interpretation`
**Purpose**: Get history of single-evidence interpretations.

- **Parameters**:
  - `from_time` (number, optional)
  - `to_time` (number, optional)
  - `page` (number, optional)
  - `page_size` (number, optional)
- **Backend API**: `POST /knows/list_interpretion`

### Testing

Suggested npm scripts (already in `package.json`):

- `npm test`: Run Jest unit/integration tests (to be implemented)
- Unit tests should focus on:
  - `config` (env handling)
  - `knowsClient` (HTTP error handling, response mapping)
  - MCP tools (parameter validation & mapping)
- Integration tests should simulate `ai_search → evidence_summary → answer` flows.

---

<a name="chinese"></a>
## 中文

### 项目概述
这是一个用于对接 **KnowS 问答与证据 API** 的 Model Context Protocol (MCP) 服务器，使大模型能够调用 KnowS 的两大类核心服务场景：

- **场景 1：患者问答和信息求助**
  - 检索临床证据，获取 `question_id + evidences`
  - 生成面向患者 / 专业病友的场景化答案（临床 / 学术 / 科普）

- **场景 2：学术检索和深度研究**
  - 查询单篇文献、指南、会议等的结构化详情
  - 进行自动标签、历史记录查询等学术研究工作流

### 功能特性
- ✅ 基于 stdio 传输的 MCP 服务器
- ✅ 使用 `x-api-key` 认证的 KnowS HTTP 客户端
- ✅ 清晰区分 **问答/场景工具** 和 **文献/证据工具**
- ✅ TypeScript 强类型
- ✅ 预留 Jest 测试脚本

### 环境变量与 .env

本项目通过环境变量管理配置：
- 本地开发：
  - 使用 `.env` 文件（由 `dotenv` 自动加载）
- 部署到 MCP 客户端：
  - 在 MCP 配置（如 Claude Desktop 的 `mcpServers.*.env`）里设置相同的环境变量

支持的变量：

- `KNOWS_API_KEY`：KnowS 提供的 `x-api-key`（必填）
- `KNOWS_API_BASE_URL`：KnowS API 基础地址，如 `https://dev-api.nullht.com` 或 `https://api.nullht.com`（必填）
- `LOG_LEVEL`：日志级别，可选，默认 `info`
- `DEFAULT_DATA_SCOPE`：`knows_ai_search` 的默认证据类型，如 `"GUIDE,PAPER"`（可选，不设置则默认全部类型）

**示例 `.env`：**

```env
# 测试环境（本地开发）
KNOWS_API_KEY=你的测试环境_api_key
KNOWS_API_BASE_URL=https://dev-api.nullht.com
LOG_LEVEL=info

# 默认证据搜索范围（可选，提升速度）
# 不设置则默认全开：PAPER,PAPER_CN,GUIDE,MEETING
# DEFAULT_DATA_SCOPE=GUIDE,PAPER

# 如切换生产环境，可改为：
# KNOWS_API_KEY=你的生产环境_api_key
# KNOWS_API_BASE_URL=https://api.nullht.com
```

**示例 MCP 配置（Claude Desktop）：**

```json
{
  "mcpServers": {
    "knows-mcp": {
      "command": "npx",
      "args": ["knows-mcp-server"],
      "env": {
        "KNOWS_API_KEY": "你的_api_key",
        "KNOWS_API_BASE_URL": "https://dev-api.nullht.com",
        "DEFAULT_DATA_SCOPE": "GUIDE,PAPER",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**生产环境**：请将环境变量值替换为生产环境对应的值，例如：
- 将 `KNOWS_API_BASE_URL` 改为 `https://api.nullht.com`
- 使用你的生产环境 `KNOWS_API_KEY`（请勿复用测试环境的 key）

> 注意：本地开发使用 `.env`；正式部署时，由 MCP 宿主（例如 Claude Desktop）通过 `env` 字段注入同名环境变量即可，无需再使用 `.env`。

### MCP 工具一览（按场景）

#### 一、问答 / 场景类工具（面向患者 & 专业病友）

- **`knows_ai_search`**：提问 → 检索证据列表
  - 参数：`question`、`data_scope[]`（可选，PAPER / PAPER_CN / GUIDE / MEETING）
  - 作用：返回 `question_id + evidences`，后续可用于 `knows_answer` 或文献工具。
  - 优先级：运行时参数 > 环境变量 `DEFAULT_DATA_SCOPE` > 默认全开

- **`knows_answer`**：基于 `question_id` 生成场景化答案
  - 参数：`question_id`，`answer_type`（单个值：CLINICAL / RESEARCH / POPULAR_SCIENCE）
  - 场景：
    - 普通患者：多用 `POPULAR_SCIENCE`
    - 专业病友-研究向：多用 `RESEARCH`
    - 专业病友-临床决策向：多用 `CLINICAL + RESEARCH`
  - LLM 可根据中文关键词（“科普”“研究”“临床”等）和提问风格自动选择 answer_type。

#### 二、文献 / 证据类工具（面向专业使用者）

- **`knows_evidence_summary`**：单篇证据 AI 概要
- **`knows_evidence_highlight`**：原文高亮片段（用于引用和溯源）
- **`knows_get_paper_en` / `knows_get_paper_cn`**：英/中文文献详情
- **`knows_get_guide`**：指南详情
- **`knows_get_meeting`**：会议摘要详情
- **`knows_auto_tagging`**：自动标签与结构化要素抽取
- **`knows_list_question`**：历史提问列表
- **`knows_list_interpretation`**：历史单篇解读列表

典型学术工作流示例：
1. 通过 `knows_ai_search` 找到相关 evidences，并选出若干 `evidence_id`
2. 用 `knows_evidence_summary` + `knows_evidence_highlight` 理解核心结论与原文段落
3. 用 `knows_get_paper_en/cn` / `knows_get_guide` / `knows_get_meeting` 获取详细结构化信息
4. 若需结构化要素（如研究类型、样本量、终点），用 `knows_auto_tagging`
5. 最后如需要面向患者/病友的总结，可用 `knows_answer` 生成相应风格的答案

---

如你后续决定固定包名、补充更多 MCP 工具或测试用例，可以在本 README 的基础上增量更新。当前版本已经覆盖了：环境变量 → MCP 部署配置 → 工具参数 → 典型使用场景的完整链路。