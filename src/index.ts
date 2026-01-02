import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createKnowsClient } from "./knowsClient.js";
import { createLogger } from "./logger.js";
import { loadConfig } from "./config.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger();
  const client = createKnowsClient(config, logger);

  const server = new McpServer({
    name: "knows-mcp",
    version: "0.1.0",
  });

  server.tool(
    "knows_ai_search",
    {
      question: z.string().min(1),
      data_scope: z.array(z.enum(["PAPER", "PAPER_CN", "GUIDE", "MEETING"])).optional(),
    },
    async (args) => {
      // 优先级：运行时参数 > 环境变量配置 > 全开
      const dataScope = args.data_scope ?? config.defaultDataScope;
      
      const result = await client.aiSearch({
        query: args.question,
        data_scope: dataScope,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_answer",
    {
      question_id: z.string().min(1),
      answer_type: z.enum(["CLINICAL", "RESEARCH", "POPULAR_SCIENCE"]),
    },
    async (args) => {
      const result = await client.answer({
        question_id: args.question_id,
        answer_type: args.answer_type,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_evidence_summary",
    {
      evidence_id: z.string().min(1),
    },
    async (args) => {
      const result = await client.evidenceSummary({
        evidence_id: args.evidence_id,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_evidence_highlight",
    {
      evidence_id: z.string().min(1),
    },
    async (args) => {
      const result = await client.evidenceHighlight({
        evidence_id: args.evidence_id,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_get_paper_en",
    {
      evidence_id: z.string().min(1),
      translate_to_chinese: z.boolean().optional(),
    },
    async (args) => {
      const result = await client.getPaperEn({
        evidence_id: args.evidence_id,
        translate_to_chinese: args.translate_to_chinese,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_get_paper_cn",
    {
      evidence_id: z.string().min(1),
    },
    async (args) => {
      const result = await client.getPaperCn({
        evidence_id: args.evidence_id,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_get_guide",
    {
      evidence_id: z.string().min(1),
      translate_to_chinese: z.boolean().optional(),
    },
    async (args) => {
      const result = await client.getGuide({
        evidence_id: args.evidence_id,
        translate_to_chinese: args.translate_to_chinese,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_get_meeting",
    {
      evidence_id: z.string().min(1),
      translate_to_chinese: z.boolean().optional(),
    },
    async (args) => {
      const result = await client.getMeeting({
        evidence_id: args.evidence_id,
        translate_to_chinese: args.translate_to_chinese,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_auto_tagging",
    {
      content: z.string().optional(),
      evidence_id: z.string().optional(),
      tagging_type: z.string().min(1),
    },
    async (args) => {
      const result = await client.autoTagging({
        content: args.content,
        evidence_id: args.evidence_id,
        tagging_type: args.tagging_type,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_list_question",
    {
      from_time: z.number().optional(),
      to_time: z.number().optional(),
      page: z.number().optional(),
      page_size: z.number().optional(),
    },
    async (args) => {
      const result = await client.listQuestion({
        from_time: args.from_time,
        to_time: args.to_time,
        page: args.page,
        page_size: args.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  server.tool(
    "knows_list_interpretation",
    {
      from_time: z.number().optional(),
      to_time: z.number().optional(),
      page: z.number().optional(),
      page_size: z.number().optional(),
    },
    async (args) => {
      const result = await client.listInterpretation({
        from_time: args.from_time,
        to_time: args.to_time,
        page: args.page,
        page_size: args.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("KnowS MCP server started");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
