export function loadConfig() {
    const apiKey = process.env.KNOWS_API_KEY;
    const baseUrl = process.env.KNOWS_API_BASE_URL;
    const logLevel = process.env.LOG_LEVEL ?? "info";
    // 从环境变量读取默认搜索范围，支持逗号分隔，如 "GUIDE,PAPER"
    const defaultDataScopeStr = process.env.DEFAULT_DATA_SCOPE;
    let defaultDataScope = ["PAPER", "PAPER_CN", "GUIDE", "MEETING"]; // 兜底默认值：全开
    if (defaultDataScopeStr) {
        const parsed = defaultDataScopeStr.split(",").map(s => s.trim()).filter(Boolean);
        const validScopes = ["PAPER", "PAPER_CN", "GUIDE", "MEETING"];
        const filtered = parsed.filter(s => validScopes.includes(s));
        if (filtered.length > 0) {
            defaultDataScope = filtered;
        }
    }
    if (!apiKey) {
        throw new Error("KNOWS_API_KEY is required");
    }
    if (!baseUrl) {
        throw new Error("KNOWS_API_BASE_URL is required");
    }
    return {
        apiKey,
        baseUrl,
        logLevel,
        defaultDataScope,
    };
}
