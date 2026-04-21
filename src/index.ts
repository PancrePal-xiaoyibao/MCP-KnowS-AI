#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KnowSClient } from "./client.js";

const apiKey = process.env.KNOWS_API_KEY;
const apiHost = process.env.KNOWS_API_HOST ?? "https://dev-api.nullht.com";

if (!apiKey) {
  console.error("KNOWS_API_KEY environment variable is required");
  process.exit(1);
}

const client = new KnowSClient(apiHost, apiKey);

const server = new McpServer({
  name: "knows-mcp",
  version: "1.0.0",
  description: "KnowS 医学证据检索与分析平台 MCP Server",
});

// --- AI 搜索 ---
server.tool(
  "ai_search",
  "AI 检索：用户提问，返回与该问题相关的医学证据列表",
  {
    query: z.string().describe("用户提问的问题文本"),
    data_scope: z
      .array(z.enum(["PAPER", "PAPER_CN", "GUIDE", "MEETING"]))
      .describe("检索范围的证据类型"),
  },
  async ({ query, data_scope }) => {
    const result = await client.aiSearch(query, data_scope);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 单篇证据 AI 总结 ---
server.tool(
  "evidence_summary",
  "对单篇证据进行 AI 概要总结",
  {
    evidence_id: z.string().describe("证据 ID"),
  },
  async ({ evidence_id }) => {
    const result = await client.evidenceSummary(evidence_id);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 所有证据 AI 总结（流式收集） ---
server.tool(
  "all_evidence_summary",
  "获取所有证据的单篇 AI 总结（收集完整的流式响应后返回）",
  {},
  async () => {
    const result = await client.allEvidenceSummaryStream();
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// --- 证据被引内容 ---
server.tool(
  "evidence_highlight",
  "返回单篇证据被引用的原文部分（高亮内容）",
  {
    evidence_id: z.string().describe("证据 ID"),
  },
  async ({ evidence_id }) => {
    const result = await client.evidenceHighlight(evidence_id);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 场景总结 ---
server.tool(
  "answer",
  "基于问题和检索出来的证据，生成场景总结（非流式）",
  {
    question_id: z.string().describe("问题 ID（来自 ai_search 返回的 question_id）"),
    answer_type: z
      .array(z.enum(["CLINICAL", "RESEARCH", "POPULAR_SCIENCE"]))
      .describe("回答类型：临床、学术研究、科普"),
  },
  async ({ question_id, answer_type }) => {
    const result = await client.answer(question_id, answer_type);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 场景总结（流式收集） ---
server.tool(
  "answer_stream",
  "基于问题和检索出来的证据，生成场景总结（收集完整的流式响应后返回）",
  {
    question_id: z.string().describe("问题 ID"),
    answer_type: z
      .array(z.enum(["CLINICAL", "RESEARCH", "POPULAR_SCIENCE"]))
      .describe("回答类型"),
  },
  async ({ question_id, answer_type }) => {
    const result = await client.answerStream(question_id, answer_type);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// --- 自动标签 ---
server.tool(
  "auto_tagging",
  "对证据进行自动化标签提取（如研究类型、疾病领域、样本量等）",
  {
    content: z.string().optional().describe("文本内容（与 evidence_id 二选一）"),
    evidence_id: z.string().optional().describe("证据 ID（与 content 二选一，用于需要全文的标签类型）"),
    tagging_type: z
      .enum([
        "THERAPEUTIC_AREA",
        "ORGANISM",
        "REGION",
        "POPULATION_CHARACTERISTICS",
        "PARTICIPANT_AGE",
        "POPULATION_SEX",
        "SAMPLE_SIZE",
        "RESEARCH_GROUP",
        "TREATMENT_REGIMEN_OF_RESEARCH_GROUP",
        "CONTROL_GROUP",
        "OUTCOME",
        "PRIMARY_OUTCOME",
        "LENGTH_OF_FOLLOW_UP",
        "MAIN_FINDING",
        "EFFECT_SIZE_AND_95CI_FOR_PRIMARY_OUTCOME",
        "TRIAL_NUMBER",
        "FUNDING_SOURCE",
        "LIMITATION",
        "STUDY_TYPE",
        "ORIGINAL_NON_ORIGINAL_STUDY",
        "STUDY_PHASE",
        "CLINICAL_STAGE",
        "BIOMARKER_STATUS",
        "TREATMENT_LINE",
        "INCLUSION_EXCLUSION_BASE_ON_POPULATION_CHARACTERISTICS",
        "INCLUSION_EXCLUSION_BASE_ON_TREATMENT_LINE",
        "INCLUSION_EXCLUSION_BASE_ON_INTERVENTION",
        "INCLUSION_EXCLUSION_BASE_ON_OUTCOME",
        "RANDOM_SEQUENCE_GENERATION",
        "ALLOCATION_CONCEALMENT",
        "BLINDING_OF_OUTCOME_ASSESSMENT",
        "INCOMPLETE_OUTCOME_DATA",
        "BLINDING_OF_PARTICIPANTS_AND_PERSONNEL",
      ])
      .describe("标签类型"),
  },
  async ({ content, evidence_id, tagging_type }) => {
    const result = await client.autoTagging({
      content,
      evidence_id,
      tagging_type,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 英文文献详情 ---
server.tool(
  "get_paper_en",
  "获取英文文献的详细信息（标题、摘要、影响因子、分区等）",
  {
    evidence_id: z.string().describe("证据 ID"),
    translate_to_chinese: z.boolean().optional().describe("是否翻译标题和摘要为中文，默认 false"),
  },
  async ({ evidence_id, translate_to_chinese }) => {
    const result = await client.getPaperEn(evidence_id, translate_to_chinese);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 中文文献详情 ---
server.tool(
  "get_paper_cn",
  "获取中文文献的详细信息",
  {
    evidence_id: z.string().describe("证据 ID"),
  },
  async ({ evidence_id }) => {
    const result = await client.getPaperCn(evidence_id);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 指南详情 ---
server.tool(
  "get_guide",
  "获取医学指南的详细信息",
  {
    evidence_id: z.string().describe("证据 ID"),
    translate_to_chinese: z.boolean().optional().describe("是否翻译标题为中文，默认 false"),
  },
  async ({ evidence_id, translate_to_chinese }) => {
    const result = await client.getGuide(evidence_id, translate_to_chinese);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 会议详情 ---
server.tool(
  "get_meeting",
  "获取医学会议记录的详细信息",
  {
    evidence_id: z.string().describe("证据 ID"),
    translate_to_chinese: z.boolean().optional().describe("是否翻译标题和摘要为中文，默认 false"),
  },
  async ({ evidence_id, translate_to_chinese }) => {
    const result = await client.getMeeting(evidence_id, translate_to_chinese);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 获取问题列表 ---
server.tool(
  "list_questions",
  "获取用户的历史提问列表，支持时间范围和分页",
  {
    from_time: z.number().optional().describe("起始时间戳（毫秒），例：1729246077911"),
    to_time: z.number().optional().describe("终止时间戳（毫秒）"),
    page: z.number().optional().describe("页码，从 1 开始，默认 1"),
    page_size: z.number().optional().describe("每页条数，最大 50"),
  },
  async (params) => {
    const result = await client.listQuestions(params);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 获取文献解读列表 ---
server.tool(
  "list_interpretations",
  "获取用户的单篇文献 AI 解读历史记录，支持时间范围和分页",
  {
    from_time: z.number().optional().describe("起始时间戳（毫秒）"),
    to_time: z.number().optional().describe("终止时间戳（毫秒）"),
    page: z.number().optional().describe("页码，从 1 开始，默认 1"),
    page_size: z.number().optional().describe("每页条数，最大 50"),
  },
  async (params) => {
    const result = await client.listInterpretations(params);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// --- 创建证据（PDF） ---
server.tool(
  "create_evidence_by_pdf",
  "通过上传 PDF 文件创建新的证据",
  {
    pdf_base64: z.string().describe("PDF 文件的 Base64 编码内容"),
  },
  async ({ pdf_base64 }) => {
    const result = await client.createEvidenceByPdf(pdf_base64);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
