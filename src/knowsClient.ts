import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { LRUCache } from "lru-cache";
import type { KnowsConfig } from "./config.js";
import type { Logger } from "./logger.js";

export type AiSearchRequest = {
  query: string;
  data_scope: string[];
};

export type AiSearchEvidence = {
  id: string;
  title: string;
  type: string;
  label?: string[];
  has_pdf?: boolean;
};

export type AiSearchResponse = {
  question_id: string;
  evidences: AiSearchEvidence[];
};

export type AnswerRequest = {
  question_id: string;
  answer_type: string; // API 实际期望字符串，不是数组
};

export type AnswerResponse = {
  content: string;
};

export type EvidenceSummaryRequest = {
  evidence_id: string;
};

export type EvidenceSummaryResponse = {
  summary: string;
};

export type EvidenceHighlightRequest = {
  evidence_id: string;
};

export type EvidenceHighlightResponse = {
  highlights: unknown[];
};

export type EvidenceDetailRequest = {
  evidence_id: string;
  translate_to_chinese?: boolean;
};

export type EvidencePaperEnResponse = Record<string, unknown>;
export type EvidencePaperCnResponse = Record<string, unknown>;
export type EvidenceGuideResponse = Record<string, unknown>;
export type EvidenceMeetingResponse = Record<string, unknown>;

export type AutoTaggingRequest = {
  content?: string;
  evidence_id?: string;
  tagging_type: string;
};

export type AutoTaggingResponse = Record<string, unknown>;

export type ListQuestionRequest = {
  from_time?: number;
  to_time?: number;
  page?: number;
  page_size?: number;
};

export type ListQuestionResponse = Record<string, unknown>;

export type ListInterpretationRequest = {
  from_time?: number;
  to_time?: number;
  page?: number;
  page_size?: number;
};

export type ListInterpretationResponse = Record<string, unknown>;

export type KnowsClient = {
  aiSearch: (req: AiSearchRequest) => Promise<AiSearchResponse>;
  answer: (req: AnswerRequest) => Promise<AnswerResponse>;
  evidenceSummary: (
    req: EvidenceSummaryRequest
  ) => Promise<EvidenceSummaryResponse>;
  evidenceHighlight: (
    req: EvidenceHighlightRequest
  ) => Promise<EvidenceHighlightResponse>;
  getPaperEn: (
    req: EvidenceDetailRequest
  ) => Promise<EvidencePaperEnResponse>;
  getPaperCn: (
    req: EvidenceDetailRequest
  ) => Promise<EvidencePaperCnResponse>;
  getGuide: (req: EvidenceDetailRequest) => Promise<EvidenceGuideResponse>;
  getMeeting: (
    req: EvidenceDetailRequest
  ) => Promise<EvidenceMeetingResponse>;
  autoTagging: (req: AutoTaggingRequest) => Promise<AutoTaggingResponse>;
  listQuestion: (
    req: ListQuestionRequest
  ) => Promise<ListQuestionResponse>;
  listInterpretation: (
    req: ListInterpretationRequest
  ) => Promise<ListInterpretationResponse>;
};

export function createKnowsClient(
  config: KnowsConfig,
  logger: Logger
): KnowsClient {
  const http: AxiosInstance = axios.create({
    baseURL: config.baseUrl,
    headers: {
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    timeout: 120000,
  });

  // Configure retries
  axiosRetry(http, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Retry on network errors or 5xx status codes
      return (
        axiosRetry.isNetworkError(error) ||
        axiosRetry.isRetryableError(error)
      );
    },
    onRetry: (retryCount, error, requestConfig) => {
      logger.info(
        { retryCount, error: error.message, url: requestConfig.url },
        "Retrying request"
      );
    },
  });

  // Add response interceptor for error logging
  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        logger.error(
          {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
            request_url: error.config?.url,
            request_data: error.config?.data,
          },
          "HTTP request failed"
        );
      } else {
        logger.error({ error: error.message }, "HTTP request error");
      }
      throw error;
    }
  );

  // Initialize LRU Cache
  const evidenceCache = new LRUCache<string, Record<string, unknown>>({
    max: 500, // Maximum number of items
    ttl: 1000 * 60 * 60, // 1 hour TTL
  });

  function getCacheKey(type: string, id: string, translate?: boolean): string {
    return `${type}:${id}:${!!translate}`;
  }

  return {
    async aiSearch(req: AiSearchRequest): Promise<AiSearchResponse> {
      const payload = {
        query: req.query,
        data_scope: req.data_scope,
      };
      logger.debug({ payload }, "knows ai_search request");

      const response = await http.post("/knows/ai_search", payload);

      const data = response.data?.data ?? response.data;

      logger.debug({ data }, "knows ai_search response");

      return {
        question_id: data.question_id,
        evidences: data.evidences ?? [],
      };
    },

    async answer(req: AnswerRequest): Promise<AnswerResponse> {
      const payload = {
        question_id: req.question_id,
        answer_type: req.answer_type,
      };
      logger.debug({ payload }, "knows answer request");
      logger.debug({ answer_type_is_array: Array.isArray(req.answer_type) }, "answer_type type check");

      const response = await http.post("/knows/answer", payload);

      const data = response.data?.data ?? response.data;

      logger.debug({ data }, "knows answer response");

      return {
        content: data.content,
      };
    },

    async evidenceSummary(
      req: EvidenceSummaryRequest
    ): Promise<EvidenceSummaryResponse> {
      const response = await http.post("/knows/evidence/summary", {
        evidence_id: req.evidence_id,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows evidence summary response");

      return {
        summary: data.summary,
      };
    },

    async evidenceHighlight(
      req: EvidenceHighlightRequest
    ): Promise<EvidenceHighlightResponse> {
      const response = await http.post("/knows/evidence/highlight", {
        evidence_id: req.evidence_id,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows evidence highlight response");

      return {
        highlights: data.highlights ?? [],
      };
    },

    async getPaperEn(
      req: EvidenceDetailRequest
    ): Promise<EvidencePaperEnResponse> {
      const cacheKey = getCacheKey("PAPER", req.evidence_id, req.translate_to_chinese);
      const cached = evidenceCache.get(cacheKey);
      if (cached) {
        logger.debug({ evidence_id: req.evidence_id }, "Cache hit for getPaperEn");
        return cached;
      }

      const response = await http.post("/knows/evidence/get_paper_en", {
        evidence_id: req.evidence_id,
        translate_to_chinese: req.translate_to_chinese,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows get_paper_en response");

      evidenceCache.set(cacheKey, data);
      return data;
    },

    async getPaperCn(
      req: EvidenceDetailRequest
    ): Promise<EvidencePaperCnResponse> {
      const cacheKey = getCacheKey("PAPER_CN", req.evidence_id, false);
      const cached = evidenceCache.get(cacheKey);
      if (cached) {
         logger.debug({ evidence_id: req.evidence_id }, "Cache hit for getPaperCn");
        return cached;
      }

      const response = await http.post("/knows/evidence/get_paper_cn", {
        evidence_id: req.evidence_id,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows get_paper_cn response");

      evidenceCache.set(cacheKey, data);
      return data;
    },

    async getGuide(req: EvidenceDetailRequest): Promise<EvidenceGuideResponse> {
      const cacheKey = getCacheKey("GUIDE", req.evidence_id, req.translate_to_chinese);
      const cached = evidenceCache.get(cacheKey);
      if (cached) {
         logger.debug({ evidence_id: req.evidence_id }, "Cache hit for getGuide");
        return cached;
      }

      const response = await http.post("/knows/evidence/get_guide", {
        evidence_id: req.evidence_id,
        translate_to_chinese: req.translate_to_chinese,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows get_guide response");

      evidenceCache.set(cacheKey, data);
      return data;
    },

    async getMeeting(
      req: EvidenceDetailRequest
    ): Promise<EvidenceMeetingResponse> {
      const cacheKey = getCacheKey("MEETING", req.evidence_id, req.translate_to_chinese);
      const cached = evidenceCache.get(cacheKey);
      if (cached) {
         logger.debug({ evidence_id: req.evidence_id }, "Cache hit for getMeeting");
        return cached;
      }

      const response = await http.post("/knows/evidence/get_meeting", {
        evidence_id: req.evidence_id,
        translate_to_chinese: req.translate_to_chinese,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows get_meeting response");

      evidenceCache.set(cacheKey, data);
      return data;
    },

    async autoTagging(req: AutoTaggingRequest): Promise<AutoTaggingResponse> {
      const response = await http.post("/knows/auto_tagging", {
        content: req.content,
        evidence_id: req.evidence_id,
        tagging_type: req.tagging_type,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows auto_tagging response");

      return data;
    },

    async listQuestion(
      req: ListQuestionRequest
    ): Promise<ListQuestionResponse> {
      const response = await http.post("/knows/list_question", {
        from_time: req.from_time,
        to_time: req.to_time,
        page: req.page,
        page_size: req.page_size,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows list_question response");

      return data;
    },

    async listInterpretation(
      req: ListInterpretationRequest
    ): Promise<ListInterpretationResponse> {
      const response = await http.post("/knows/list_interpretion", {
        from_time: req.from_time,
        to_time: req.to_time,
        page: req.page,
        page_size: req.page_size,
      });

      const data = response.data?.data ?? response.data;
      logger.debug({ data }, "knows list_interpretion response");

      return data;
    },
  };
}
