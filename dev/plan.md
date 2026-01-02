# KnowS知识库MCP项目规划

## 项目概述

开发一个Model Context Protocol (MCP)服务器，用于集成KnowS知识库查询API，实现KnowS知识库和智能体回复的读取、搜索和管理功能。

## 项目目标

- 创建符合 MCP 规范的服务器
- 集成 KnowS 问答与证据 API（基于《KnowS对接 For 小胰宝》）
- 提供问题检索、证据列表获取、AI 总结与场景回答等能力
- 支持历史记录查询、证据详情查看、自动标签等扩展功能
- 确保良好的错误处理、统一错误码映射和日志记录
- 提供完整的测试覆盖

## 技术栈

- Node.js (ES Modules)
- TypeScript
- @modelcontextprotocol/sdk
- Axios 或等价 HTTP 客户端库
- dotenv（环境变量配置管理）
- 日志库（如 pino / winston）
- Jest（单元测试与基础集成测试）

## 开发阶段

### 第一阶段：基础架构 

- [ ] 初始化 Node.js + ES Modules 项目结构（如 `src/server.mts`, `src/knowsClient.mts`）
- [ ] 安装并配置 `@modelcontextprotocol/sdk`、HTTP 客户端库（如 `node-fetch` 或 `axios`）
- [ ] 搭建 MCP 服务器基础框架（请求路由、工具注册、资源暴露）
- [ ] 配置文件与环境变量管理（测试/生产 Host、x-api-key、超时、重试策略等）
- [ ] 日志系统实现（结构化日志、请求/响应摘要、错误日志）

### 第二阶段：KnowS API 集成与封装 

- [ ] 基于《KnowS对接 For 小胰宝》文档梳理接口：`/knows/ai_search`、`/knows/answer`、`/knows/answer/stream`、`/knows/evidence/summary`、`/knows/all_evidence.summary/stream`、`/knows/evidence/highlight` 等
- [ ] 封装 KnowS HTTP 客户端：统一 Base URL、公共 Header（`x-api-key`）、鉴权与错误处理
- [ ] 实现核心 API：问题检索（question_id + evidences）、AI 场景总结、单篇证据总结、高亮及证据详情（英文/中文文献、指南、会议）
- [ ] 支持历史记录与自动标签等扩展接口（`/knows/list_question`、`/knows/list_interpretion`、`/knows/auto_tagging`、`/knows/create_evidence_by_pdf_file` 等）
- [ ] 设计并实现 API 响应数据模型（内部 TypeScript 类型 / 接口），包括 Question、Evidence、Answer、TaggingResult、HistoryItem 等

### 第三阶段：MCP 工具与资源实现 

- [ ] 设计 MCP 工具接口：如 `knows_ai_search`、`knows_answer`、`knows_answer_stream`、`knows_evidence_summary`、`knows_evidence_highlight`、`knows_get_evidence_detail`、`knows_list_history` 等
- [ ] 将 MCP 工具的参数与返回值与 KnowS API 模型进行映射（如 data_scope、answer_type、evidence_id 等）
- [ ] 以 question_id、evidence_id 为主键，实现证据与回答的 MCP 资源暴露（按 ID 获取详情/高亮）
- [ ] 对流式接口（如 `/knows/all_evidence.summary/stream`、`/knows/answer/stream`）进行封装，按 MCP 能力提供流式或分片响应
- [ ] 为常见操作设计合理的错误信息与用户提示（如鉴权失败、超时、配额超限）

### 第四阶段：测试与文档

- [ ] 为 KnowS 客户端和 MCP 工具编写单元测试（基于 Jest，Mock HTTP 调用及错误场景）
- [ ] 针对典型使用场景编写集成测试：完整链路包括提问、检索、证据选择、场景总结
- [ ] 撰写 API 使用说明：各 MCP 工具的参数说明、返回结构、错误码说明，以及和原始 KnowS 接口的对应关系
- [ ] 补充部署与本地开发说明（环境变量、启动命令、调试方式）

### 第五阶段：部署和优化

- [ ] 根据实际运行环境设计部署方案（本地、容器或远程 MCP 服务）
- [ ] 性能优化：连接复用、超时设置、结果缓存策略（在配额限制前提下）
- [ ] 完善错误处理与告警（日志等级、关键错误监控接口预留）
- [ ] 最终回归测试，确认所有核心功能与稳定性指标达标

## 项目结构与模块划分（参考）

- `src/index.ts` / `src/server.mts`：MCP 服务器入口，配置 stdio 传输、注册 KnowS 相关工具
- `src/knowsClient.ts`：封装调用 KnowS API 的 HTTP 客户端，处理鉴权（x-api-key）、重试与错误解析
- `src/config.ts`：配置管理模块，从环境变量加载 Host、API Key、超时、速率限制等配置
- `src/logger.ts`：日志系统，统一输出结构化日志（请求、响应摘要、错误栈）
- `src/types.ts`：TypeScript 类型定义（Question、Evidence、Answer、HistoryItem 等）
- `src/tools/*.ts`：各 MCP 工具的具体实现（如 `knows_ai_search`、`knows_answer` 等）
- `tests/**/*.test.ts`：单元测试与集成测试用例

## 开发与测试规范（参考）

- **npm 脚本建议**：
  - `npm run build`：编译 TypeScript 代码
  - `npm run watch`：监听模式编译
  - `npm run dev`：编译并以开发模式运行 MCP 服务器
  - `npm test`：运行 Jest 单元测试与基础集成测试
  - `npm start`：直接运行已编译的服务器（生产/预发布环境）
- **测试策略与 MCP 测试方法**：
  - 单元测试（逻辑层）：覆盖 config、knowsClient（含错误与超时）、各 MCP 工具的参数校验与映射（不依赖真正的 MCP 协议，HTTP 调用使用 Mock）。
  - 集成测试（协议前的业务链路）：模拟完整链路（ai_search → evidence_summary → answer），验证场景路由与 answer_type 策略是否按预期工作，可使用真实的 HTTP sandbox 或对 KnowS API 进行 Mock。
  - MCP 协议层测试：通过 Jest 启动一个 MCP 服务器子进程（运行 `node build/index.js` 或等价入口），使用 `@modelcontextprotocol/sdk` 提供的客户端/测试工具，通过 stdio 发送工具调用请求，校验返回的 result、错误码和资源暴露是否符合预期。
  - 手工验收测试：在 Claude Desktop（或其他 MCP 客户端）中配置 `knows-mcp`，分别以“科普 / 研究 / 临床”三种提示词风格提问，验证 answer_type 路由是否正确，以及 evidence 概要和引用在最终回答中的呈现是否符合预期。

## 部署与集成方式（示例）

- **环境变量约定**：
  - `KNOWS_API_KEY`：KnowS 提供的 x-api-key
  - `KNOWS_API_BASE_URL`：KnowS API 基础 URL（如测试/生产 Host）
  - `KNOWS_ENV`：环境标识（如 `dev` / `prod`）
  - `LOG_LEVEL`：日志级别（如 `info` / `debug` / `error`）
  - `REQUEST_TIMEOUT`：请求超时（毫秒）
- **与桌面客户端（如 Claude Desktop）的集成示例**：
  - 全局安装或本地运行 MCP 服务器后，可在客户端配置中增加类似条目：
  ```json
  {
    "mcpServers": {
      "knows-mcp": {
        "command": "node",
        "args": ["/path/to/knows-mcp/build/index.js"],
        "env": {
          "KNOWS_API_KEY": "your_api_key_here",
          "KNOWS_API_BASE_URL": "https://dev-api.nullht.com",
          "KNOWS_ENV": "dev"
        }
      }
    }
  }
  ```
  - 也可以通过 `npx` 或全局安装的方式启动，命令名称根据实际包名调整。

## 关键功能

1. **问题检索与证据列表**：调用 `/knows/ai_search` 按问题和检索范围（PAPER, PAPER_CN, GUIDE, MEETING）返回 question_id 与 evidences 列表
2. **单篇证据 AI 总结**：调用 `/knows/evidence/summary` 或 `/knows/all_evidence.summary/stream`，生成单篇或多篇证据的概要总结，供 LLM/RAG 作为引用证据信源使用
3. **引用高亮与原文定位**：调用 `/knows/evidence/highlight` 获取某证据在原文中的高亮片段、页码、文本与图片链接
4. **场景总结 / 答案生成**：调用 `/knows/answer` 或 `/knows/answer/stream`，按 answer_type（CLINICAL, RESEARCH, POPULAR_SCIENCE，见「场景路由与 answer_type 策略」）输出混合引用 ID 的场景总结
5. **证据详情查看**：通过 `/knows/evidence/get_paper_en`、`/knows/evidence/get_paper_cn`、`/knows/evidence/get_guide`、`/knows/evidence/get_meeting` 获取结构化证据信息，为研究与临床回答提供支撑
6. **自动化标签与元信息抽取**：调用 `/knows/auto_tagging`，根据文本或 evidence_id 输出研究疾病、研究类型、样本量、主要终点等标签
7. **历史记录与解读列表**：通过 `/knows/list_question`、`/knows/list_interpretion` 获取用户的历史问题与单篇解读记录
8. **证据创建（可选）**：预留 `/knows/create_evidence_by_pdf_file` 接口能力，支持基于 PDF 创建新 evidence

## 场景路由与 answer_type 策略

- **显式中文关键词（最高优先级）**：当原始问题中包含以下任一短词（每个不超过 3 个字）时，LLM 应按对应映射设置 answer_type，并覆盖自动判断：
  - 面向科普：`["科普", "小白", "通俗", "简单讲"]` → `answer_type = ["POPULAR_SCIENCE"]`
  - 面向研究：`["研究", "学术", "文献", "论文", "证据", "指南"]` → `answer_type = ["RESEARCH"]`
  - 面向临床：`["临床", "用药", "治疗", "方案", "处置"]` → `answer_type = ["CLINICAL", "RESEARCH"]`
- **多关键词优先级**：当问题同时包含多类关键词时，优先级为：临床 > 研究 > 科普；例如同时出现“临床”和“科普”时，优先采用 `answer_type = ["CLINICAL", "RESEARCH"]`。
- **无关键词时的自动推断**：
  - 语气日常、少专业术语、关注“会不会”“严不严重”“怎么办”的普通患者场景 → `answer_type = ["POPULAR_SCIENCE"]`
  - 涉及 HR、CI、p 值、RCT、Meta 分析、指南名称、期刊等的深度研究场景 → `answer_type = ["RESEARCH"]`
  - 包含具体分期/分型、合并症、方案选择等内容、明显是在询问“怎么治/用什么药”的临床场景 → `answer_type = ["CLINICAL", "RESEARCH"]`
- **evidence 使用与 RAG 集成**：
  - 典型问答链路：先通过 `/knows/ai_search` 获取 question_id 和 evidences，必要时对 Top-K evidences 调用 `/knows/evidence/summary` 获取概要，再调用 `/knows/answer`/`/knows/answer/stream` 获取场景总结。
  - LLM 在最终回答用户时，可以同时引用 `/knows/answer` 的内容和 evidence 概要，将 evidence 作为可溯源的信源引用（通过 evidence_id 对应到原文/高亮）。
  - 对于文献写作和专业研究场景，优先使用 evidence 相关工具（summary、highlight、detail、auto_tagging），在需要对非专业用户输出结论时，再通过 `knows_answer` 生成对应风格的答案。

## 接口与集成说明（基于《KnowS对接 For 小胰宝》）

- **环境与 Host**：
  - 测试环境：`https://dev-api.nullht.com`（文档中为 `dev-api,nullht.com`，以实际配置为准）
  - 生产环境：`https://api.nullht.com`（文档中为 `api nullht.com`，以实际配置为准）
  - 具体 Host 与路径前缀通过环境变量配置，不在代码中硬编码
- **鉴权方式**：
  - 通过 HTTP Header 传入 `x-api-key`
  - MCP 服务通过环境变量（如 `KNOWS_API_KEY`）读取，不直接保存明文 key
- **核心接口分组**：
  - 问答与场景总结：`POST /knows/ai_search`、`POST /knows/answer`、`POST /knows/answer/stream`
  - 证据摘要与高亮：`POST /knows/evidence/summary`、`POST /knows/all_evidence.summary/stream`、`POST /knows/evidence/highlight`
  - 证据详情：`POST /knows/evidence/get_paper_en`、`POST /knows/evidence/get_paper_cn`、`POST /knows/evidence/get_guide`、`POST /knows/evidence/get_meeting`
  - 自动标签与证据创建：`POST /knows/auto_tagging`、`POST /knows/create_evidence_by_pdf_file`（TODO 类接口）
  - 历史记录：`POST /knows/list_question`、`POST /knows/list_interpretion`
- **错误码与处理**：
  - 对接统一错误码：`-1`（system error）、`40001`（invalid credential，`x-api-key` 无效）
  - 将错误码映射到 MCP 标准错误类型，并在日志中记录原始响应 body 与 request trace，便于排查问题

## 风险评估

- API文档不完整或变更
- 认证机制复杂性
- 性能优化挑战
- MCP规范变更

## 成功标准

- 所有核心功能正常运作
- 测试覆盖率 > 80%
- 响应时间 < 2秒
- 错误率 < 1%
- 完整的文档和使用说明

## api文档

`/Users/qinxiaoqiang/Downloads/mcp-knows/MinerU_markdown_KnowS对接 For 小胰宝_20260102111549_2006927381214375936.md` 这里有详细脚本。

## MCP工具场景详细设计

### 1. 问答 / 场景类工具（患者 & 专业病友）

- **knows_ai_search**（定义在 `src/index.ts`）
  - **入参**：`question: string`，`data_scope: ("PAPER" | "PAPER_CN" | "GUIDE" | "MEETING")[]`
  - **后端接口**：`POST /knows/ai_search`
  - **返回**：`question_id` + `evidences[]` 的 JSON，用于后续调用 `knows_answer` 或文献类工具
- **knows_answer**（定义在 `src/index.ts`）
  - **入参**：`question_id: string`，`answer_type: ("CLINICAL" | "RESEARCH" | "POPULAR_SCIENCE")[]`
  - **后端接口**：`POST /knows/answer`
  - **返回**：包含临床 / 学术 / 科普等风格混杂引用 ID 的 `content` 字段
  - **说明**：与本方案中的 **answer_type 场景路由策略** 对齐，LLM 只需根据问题类型（科普/研究/临床）选择合适的 `answer_type`
  - **流式版本**：`knows_answer_stream` 暂未实现，可后续基于 `POST /knows/answer/stream` 和 SSE 封装

### 2. 文献 / 证据类工具（专业使用者）

- **证据概要与高亮**
  - **knows_evidence_summary**
    - **入参**：`evidence_id: string`
    - **后端接口**：`POST /knows/evidence/summary`
    - **返回**：`{ summary: string }`，供 LLM/RAG 作为证据概要使用
  - **knows_evidence_highlight**
    - **入参**：`evidence_id: string`
    - **后端接口**：`POST /knows/evidence/highlight`
    - **返回**：`{ highlights: [...] }`，用于定位原文片段（页码、文本、图片等）
- **文献 / 指南 / 会议详情**
  - **knows_get_paper_en**
    - **入参**：`evidence_id: string`，`translate_to_chinese?: boolean`
    - **后端接口**：`POST /knows/evidence/get_paper_en`
    - **返回**：英文文献的结构化详情（期刊、IF、摘要、作者等），JSON 原样返回
  - **knows_get_paper_cn**
    - **入参**：`evidence_id: string`
    - **后端接口**：`POST /knows/evidence/get_paper_cn`
  - **knows_get_guide**
    - **入参**：`evidence_id: string`，`translate_to_chinese?: boolean`
    - **后端接口**：`POST /knows/evidence/get_guide`
  - **knows_get_meeting**
    - **入参**：`evidence_id: string`，`translate_to_chinese?: boolean`
    - **后端接口**：`POST /knows/evidence/get_meeting`
  - **说明**：以上工具均返回结构化 JSON，便于在“学术研究 / 写论文”场景中直接解析字段（如 `impact_factor`、`study_type`、`abstract_*` 等）
- **自动标签 / 结构化抽取**
  - **knows_auto_tagging**
    - **入参**：`content?: string`，`evidence_id?: string`，`tagging_type: string`（具体取值见接口文档枚举）
    - **后端接口**：`POST /knows/auto_tagging`
    - **返回**：标签结果及结构化要素的原始 JSON
- **历史记录**
  - **knows_list_question**
    - **入参**：`from_time?: number`，`to_time?: number`，`page?: number`，`page_size?: number`（时间戳，毫秒）
    - **后端接口**：`POST /knows/list_question`
    - **返回**：问题历史列表 JSON
  - **knows_list_interpretation**
    - **入参**：同 `knows_list_question`
    - **后端接口**：`POST /knows/list_interpretion`（注意接口路径拼写）
    - **返回**：单篇文献解读历史列表 JSON

### 3. 场景区分：问答 vs 学术

- **面向患者 & 专业病友（问答/场景类）**：
  - LLM 优先调用 `knows_ai_search` 获取 `question_id + evidences`
  - 再根据问题类型（科普 / 研究 / 临床）选择合适的 `answer_type`，调用 `knows_answer` 生成最终“读者看的答案`
- **面向专业研究者（文献/学术类）**：
  - LLM 直接组合使用文献/证据工具：
    - 使用 `knows_evidence_summary` / `knows_evidence_highlight` 查看某篇证据的概要与原文片段
    - 使用 `knows_get_paper_en/cn`、`knows_get_guide`、`knows_get_meeting` 拉取完整结构化信息
    - 使用 `knows_auto_tagging` 抽取研究要素（疾病、样本量、终点等）
    - 使用 `knows_list_question` / `knows_list_interpretation` 查看历史问题与解读
  - 如需给病友或大众解释研究结论，再回到 `knows_answer` 生成面向人类阅读的总结