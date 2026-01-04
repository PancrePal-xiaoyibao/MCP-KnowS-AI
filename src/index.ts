#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pLimit from "p-limit";
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

  server.tool(
    "knows_batch_get_evidence_details",
    {
      evidences: z.array(z.object({
        evidence_id: z.string().min(1),
        type: z.enum(["PAPER", "PAPER_CN", "GUIDE", "MEETING"])
      })),
      translate_to_chinese: z.boolean().optional(),
    },
    async (args) => {
      const limit = pLimit(5);
      const promises = args.evidences.map((item) => limit(async () => {
        let detail;
        const req = {
          evidence_id: item.evidence_id,
          translate_to_chinese: args.translate_to_chinese
        };

        try {
          switch (item.type) {
            case "PAPER":
              detail = await client.getPaperEn(req);
              break;
            case "PAPER_CN":
              detail = await client.getPaperCn(req);
              break;
            case "GUIDE":
              detail = await client.getGuide(req);
              break;
            case "MEETING":
              detail = await client.getMeeting(req);
              break;
          }
          return {
            evidence_id: item.evidence_id,
            type: item.type,
            status: "success",
            data: detail
          };
        } catch (error) {
           return {
            evidence_id: item.evidence_id,
            type: item.type,
            status: "error",
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }));

      const results = await Promise.all(promises);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results),
          },
        ],
      };
    }
  );

  server.resource(
    "evidence",
    "knows://evidence/{type}/{id}",
    async (uri) => {
      // Manual parsing to handle URI parameters
      // URI format: knows://evidence/{type}/{id}
      // host: evidence
      // pathname: /{type}/{id}
      const url = new URL(uri.href);
      const pathParts = url.pathname.split("/").filter(Boolean);
      
      if (pathParts.length < 2) {
         throw new Error("Invalid resource URI format. Expected knows://evidence/{type}/{id}");
      }
      
      const evidenceType = pathParts[0].toUpperCase();
      const evidenceId = pathParts[1];
      
      let result;

      try {
        switch (evidenceType) {
            case "PAPER":
              result = await client.getPaperEn({ evidence_id: evidenceId });
              break;
            case "PAPER_CN":
              result = await client.getPaperCn({ evidence_id: evidenceId });
              break;
            case "GUIDE":
              result = await client.getGuide({ evidence_id: evidenceId });
              break;
            case "MEETING":
              result = await client.getMeeting({ evidence_id: evidenceId });
              break;
            default:
              throw new Error(`Unknown evidence type: ${evidenceType}. Supported: PAPER, PAPER_CN, GUIDE, MEETING`);
        }
      } catch(e) {
          throw new Error(`Failed to fetch resource ${uri}: ${e instanceof Error ? e.message : String(e)}`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(result, null, 2),
            mimeType: "application/json"
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
