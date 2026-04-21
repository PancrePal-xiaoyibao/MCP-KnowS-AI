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
  TaggingResponse,
} from "./types.js";

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
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KnowS API error ${res.status}: ${text}`);
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
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`KnowS API error ${res.status}: ${text}`);
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
}
