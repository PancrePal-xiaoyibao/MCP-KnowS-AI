import axios from "axios";
export function createKnowsClient(config, logger) {
    const http = axios.create({
        baseURL: config.baseUrl,
        headers: {
            "x-api-key": config.apiKey,
            "Content-Type": "application/json",
        },
        timeout: 30000,
    });
    // Add response interceptor for error logging
    http.interceptors.response.use((response) => response, (error) => {
        if (error.response) {
            logger.error({
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
                request_url: error.config?.url,
                request_data: error.config?.data,
            }, "HTTP request failed");
        }
        else {
            logger.error({ error: error.message }, "HTTP request error");
        }
        throw error;
    });
    return {
        async aiSearch(req) {
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
        async answer(req) {
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
        async evidenceSummary(req) {
            const response = await http.post("/knows/evidence/summary", {
                evidence_id: req.evidence_id,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows evidence summary response");
            return {
                summary: data.summary,
            };
        },
        async evidenceHighlight(req) {
            const response = await http.post("/knows/evidence/highlight", {
                evidence_id: req.evidence_id,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows evidence highlight response");
            return {
                highlights: data.highlights ?? [],
            };
        },
        async getPaperEn(req) {
            const response = await http.post("/knows/evidence/get_paper_en", {
                evidence_id: req.evidence_id,
                translate_to_chinese: req.translate_to_chinese,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows get_paper_en response");
            return data;
        },
        async getPaperCn(req) {
            const response = await http.post("/knows/evidence/get_paper_cn", {
                evidence_id: req.evidence_id,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows get_paper_cn response");
            return data;
        },
        async getGuide(req) {
            const response = await http.post("/knows/evidence/get_guide", {
                evidence_id: req.evidence_id,
                translate_to_chinese: req.translate_to_chinese,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows get_guide response");
            return data;
        },
        async getMeeting(req) {
            const response = await http.post("/knows/evidence/get_meeting", {
                evidence_id: req.evidence_id,
                translate_to_chinese: req.translate_to_chinese,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows get_meeting response");
            return data;
        },
        async autoTagging(req) {
            const response = await http.post("/knows/auto_tagging", {
                content: req.content,
                evidence_id: req.evidence_id,
                tagging_type: req.tagging_type,
            });
            const data = response.data?.data ?? response.data;
            logger.debug({ data }, "knows auto_tagging response");
            return data;
        },
        async listQuestion(req) {
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
        async listInterpretation(req) {
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
