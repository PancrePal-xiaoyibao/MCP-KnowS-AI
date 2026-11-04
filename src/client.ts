import type {
  AiSearchResponse,
  AnswerResponse,
  ApiResponse,
  EvidenceSummaryResponse,
  GuideResponse,
  HighlightBlock,
  ListInterpretationResponse,
  ListQuestionResponse,
  MeetingResponse,
  PaperCnResponse,
  PaperEnResponse,
  PublicAiSearchMergedResponse,
  PublicAiSearchResponse,
  PublicEvidence,
  PublicEvidenceKind,
  TaggingResponse,
} from "./types.js";

/**
 * 公开开发者 API 的证据检索端点（/v1，Bearer 鉴权）。
 * 这些端点在 api.nullht.com 上可用，与旧的内部 /knows/* 接口并存。
 */
export const PUBLIC_EVIDENCE_ENDPOINTS = {
  PAPER: "/v1/evidences/ai_search_paper_en",
  PAPER_CN: "/v1/evidences/ai_search_paper_cn",
  MEETING: "/v1/evidences/ai_search_meeting",
  GUIDE: "/v1/evidences/ai_search_guide",
  TRIAL: "/v1/evidences/ai_search_trial",
  PACKAGE_INSERT: "/v1/evidences/ai_search_package_insert",
} as const satisfies Record<PublicEvidenceKind, string>;

/** 取证据类型对应的公开端点，未知类型返回 undefined */
export function publicEvidenceEndpoint(kind: string): string | undefined {
  return (PUBLIC_EVIDENCE_ENDPOINTS as Record<string, string | undefined>)[kind];
}

/** 请求超时（毫秒），可用 KNOWS_TIMEOUT_MS 覆盖 */
const DEFAULT_TIMEOUT_MS = 60_000;

function requestTimeoutMs(): number {
  const raw = Number(process.env.KNOWS_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/** 403 表示该接口未对当前 Application 授权，补充可执行的指引 */
function withAccessHint(status: number, message: string): string {
  if (status !== 403) return message;
  return `${message}（该接口未对当前 API key 授权。若使用生产环境 https://api.nullht.com，请改用 ai_search 工具，它已切换到公开的 /v1/evidences/* 接口；内部 /knows/* 接口需要单独申请权限）`;
}

export class KnowSClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs()),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(withAccessHint(res.status, `KnowS API error ${res.status}: ${text}`));
    }

    const json = (await res.json()) as Record<string, unknown>;

    if (json.code !== undefined && json.code !== 0) {
      throw new Error(`KnowS API error code ${json.code}: ${json.msg}`);
    }

    return (json.data !== undefined ? json.data : json) as T;
  }

  private async postStream(path: string, body: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs()),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(withAccessHint(res.status, `KnowS API error ${res.status}: ${text}`));
    }

    const text = await res.text();
    const chunks: unknown[] = [];

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5);
      try {
        const parsed = JSON.parse(payload);
        const data = parsed.data;
        if (data && typeof data === "object" && data.type === "END") break;
        if (data !== undefined) chunks.push(data);
      } catch {
        // skip malformed lines
      }
    }

    return JSON.stringify(chunks, null, 2);
  }

  async aiSearch(query: string, dataScope: string[]): Promise<AiSearchResponse> {
    return this.post("/knows/ai_search", { query, data_scope: dataScope });
  }

  async evidenceSummary(evidenceId: string): Promise<EvidenceSummaryResponse> {
    return this.post("/knows/evidence/summary", { evidence_id: evidenceId });
  }

  async allEvidenceSummaryStream(): Promise<string> {
    return this.postStream("/knows/all_evidence_summary/stream", {});
  }

  async evidenceHighlight(evidenceId: string): Promise<HighlightBlock[]> {
    const result = await this.post<HighlightBlock[] | { highlights: HighlightBlock[] }>(
      "/knows/evidence/highlight",
      { evidence_id: evidenceId }
    );
    return Array.isArray(result) ? result : result.highlights;
  }

  async answer(questionId: string, answerType: string[]): Promise<AnswerResponse> {
    return this.post("/knows/answer", { question_id: questionId, answer_type: answerType });
  }

  async answerStream(questionId: string, answerType: string[]): Promise<string> {
    return this.postStream("/knows/answer/stream", {
      question_id: questionId,
      answer_type: answerType,
    });
  }

  async createEvidenceByPdf(pdfBase64: string): Promise<{ evidence_id: string }> {
    return this.post("/knows/create_evidence_by_pdf_file", { pdf_file: pdfBase64 });
  }

  async autoTagging(params: {
    content?: string;
    evidence_id?: string;
    tagging_type: string;
  }): Promise<TaggingResponse> {
    return this.post("/knows/auto_tagging", params);
  }

  async getPaperEn(evidenceId: string, translateToChinese?: boolean): Promise<PaperEnResponse> {
    return this.post("/knows/evidence/get_paper_en", {
      evidence_id: evidenceId,
      translate_to_chinese: translateToChinese ?? false,
    });
  }

  async getPaperCn(evidenceId: string): Promise<PaperCnResponse> {
    return this.post("/knows/evidence/get_paper_cn", { evidence_id: evidenceId });
  }

  async getGuide(evidenceId: string, translateToChinese?: boolean): Promise<GuideResponse> {
    return this.post("/knows/evidence/get_guide", {
      evidence_id: evidenceId,
      translate_to_chinese: translateToChinese ?? false,
    });
  }

  async getMeeting(evidenceId: string, translateToChinese?: boolean): Promise<MeetingResponse> {
    return this.post("/knows/evidence/get_meeting", {
      evidence_id: evidenceId,
      translate_to_chinese: translateToChinese ?? false,
    });
  }

  async listQuestions(params: {
    from_time?: number;
    to_time?: number;
    page?: number;
    page_size?: number;
  }): Promise<ListQuestionResponse> {
    return this.post("/knows/list_question", params);
  }

  async listInterpretations(params: {
    from_time?: number;
    to_time?: number;
    page?: number;
    page_size?: number;
  }): Promise<ListInterpretationResponse> {
    return this.post("/knows/list_interpretion", params);
  }

  // -------------------------------------------------------------------------
  // 公开开发者 API（/v1，Bearer 鉴权）
  // -------------------------------------------------------------------------

  private async postPublic<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs()),
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`KnowS API error ${res.status}: ${text}`);
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`KnowS API 返回了非 JSON 响应: ${text.slice(0, 200)}`);
    }

    if (json.code !== undefined && json.code !== 0) {
      throw new Error(`KnowS API error code ${json.code}: ${String(json.msg)}`);
    }

    return (json.data !== undefined ? json.data : json) as T;
  }

  /**
   * 通过公开开发者 API 检索证据，支持一次检索多种证据类型。
   * 端点为 /v1/evidences/ai_search_{paper_en,paper_cn,meeting,guide,trial,package_insert}。
   * 采用 Promise.allSettled，单类失败不影响其它类型的结果。
   */
  async aiSearchPublic(
    query: string,
    kinds: PublicEvidenceKind[]
  ): Promise<PublicAiSearchMergedResponse> {
    const unique = [...new Set(kinds)];
    if (unique.length === 0) {
      throw new Error("data_scope 不能为空，请至少指定一种证据类型");
    }

    const settled = await Promise.allSettled(
      unique.map(async (kind) => {
        const path = PUBLIC_EVIDENCE_ENDPOINTS[kind];
        const res = await this.postPublic<PublicAiSearchResponse>(path, { query });
        return { kind, res };
      })
    );

    const questionIds: Partial<Record<PublicEvidenceKind, string>> = {};
    const evidences: PublicEvidence[] = [];
    const errors: Array<{ kind: PublicEvidenceKind; message: string }> = [];

    settled.forEach((item, index) => {
      const kind = unique[index];
      if (kind === undefined) return;
      if (item.status === "rejected") {
        const reason: unknown = item.reason;
        errors.push({
          kind,
          message: reason instanceof Error ? reason.message : String(reason),
        });
        return;
      }
      const { res } = item.value;
      if (res.question_id) questionIds[kind] = res.question_id;
      for (const evidence of res.evidences ?? []) {
        evidences.push({ ...evidence, evidence_kind: kind });
      }
    });

    if (errors.length === unique.length) {
      throw new Error(
        `所有证据类型检索均失败：${errors.map((e) => `${e.kind}: ${e.message}`).join("; ")}`
      );
    }

    const merged: PublicAiSearchMergedResponse = {
      question_ids: questionIds,
      evidences,
      total: evidences.length,
    };

    if (errors.length === 0 && unique.length === 1) {
      const only = unique[0];
      const questionId = only === undefined ? undefined : questionIds[only];
      if (questionId !== undefined) merged.question_id = questionId;
    }

    if (errors.length > 0) merged.errors = errors;

    return merged;
  }
}
