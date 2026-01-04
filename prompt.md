# KnowS MCP 工具调用策略指南

本文档为 AI 助手提供 **KnowS MCP 工具** 的正确使用方法，确保在不同场景下高效组合工具调用链。

---

## 📋 工具分类

### 🔍 问答类工具（常用）
- `knows_ai_search` - 检索临床证据，返回 question_id + evidences
- `knows_answer` - 基于 question_id 生成场景化答案（阻塞式）
- `knows_batch_answer` - **(新)** 批量基于多个 question_id 生成答案，适合多轮对比或深度研究

### 📚 文献类工具（学术深度使用）
- `knows_evidence_summary` - 单篇证据 AI 概要
- `knows_evidence_highlight` - 原文高亮片段
- `knows_get_paper_en` / `knows_get_paper_cn` - 英/中文文献详情
- `knows_get_guide` - 指南详情
- `knows_get_meeting` - 会议摘要详情
- `knows_batch_get_evidence_details` - **(新)** 批量获取多篇文献的详细内容，效率远高于单篇获取

### 🌐 MCP 资源 (Resources)
- `knows://evidence/{type}/{id}` - **(新)** 直接读取文献静态内容。
  - `type` 取值：`PAPER`, `PAPER_CN`, `GUIDE`, `MEETING`
  - 适合在已知 ID 时直接引用或作为上下文注入，无需调用 Tool

### 🔧 辅助工具
- `knows_auto_tagging` - 自动标签与结构化要素抽取
- `knows_list_question` - 历史提问列表
- `knows_list_interpretation` - 历史单篇解读列表

---

## 🎯 典型场景与调用流程

### 1️⃣ 患者问答场景（最常用）

**调用流程：**
```
用户提问 
  ↓
knows_ai_search (检索证据) 
  ↓ 获取 question_id + evidences
knows_answer (生成场景化答案)
  ↓
返回答案给用户
```

**answer_type 选择策略：**
- **普通患者**（问"怎么办""有什么药"等）→ `POPULAR_SCIENCE`
- **专业病友-研究向**（问"有什么研究""最新进展"等）→ `RESEARCH`
- **专业病友-临床决策**（问"治疗方案""临床建议"等）→ `CLINICAL`

---

### 2️⃣ 学术深度对比场景 (批量处理)

**调用流程：**
```
用户提出多个研究点或需要对比多篇文献
  ↓
knows_ai_search (检索相关证据)
  ↓ 获取多篇 evidences 列表
knows_batch_get_evidence_details (批量获取文献详情) 
  ↓ 并行获取详情，速度更快
[可选] knows_batch_answer (批量生成总结答案)
  ↓
返回综合对比研究结果
```

**典型对话示例：**
```
用户："请详细对比这 3 篇关于胰腺癌免疫治疗的最新研究"

AI 操作：
1. knows_ai_search(...) → 获取 ev1, ev2, ev3
2. knows_batch_get_evidence_details(evidences=[{id:ev1, type:"PAPER"}, ...])
3. 基于批量返回的详情，进行横向对比分析
```

---

## 🛠 性能与可靠性优化 (自动生效)

本 MCP 内部已实现以下优化，无需特殊配置即可享受：
1. **并发控制 (Concurrency)**: 批量工具（Batch Tools）内部自动限制并发数，防止触发频率限制。
2. **智能缓存 (Caching)**: 文献详情（Paper/Guide等）已实现内存缓存，重复读取相同文献将瞬间返回。
3. **网络容错 (Resilience)**: 具备自动重试机制，应对网络抖动。

---

## ⚠️ 关键规则与注意事项

### ✅ 必须遵守

1. **优先使用批量工具**
   - 当需要获取 **3 篇以上** 文献详情或答案时，**必须**使用 `knows_batch_get_evidence_details` 或 `knows_batch_answer`，严禁循环调用单次工具。
   
2. **question_id 传递**
   - `knows_answer` 或 `knows_batch_answer` 的 `question_id` **必须**来自 `knows_ai_search` 的返回结果。

3. **Resources 使用时机**
   - 当你只是需要向用户展示某篇已知文献的内容，或者作为背景上下文参考时，可以直接使用 Resource URI。
   - 当需要 AI 进行逻辑处理、总结或翻译时，优先使用 Tool。

4. **answer_type 单选**
   - 在 `knows_batch_answer` 中，每个请求也可以独立选择不同的 `answer_type`。

---

## 🔄 典型错误与修正

### 错误 1：在循环中调用单次工具

```
❌ 错误操作（慢且容易出错）：
for id in [1, 2, 3]:
    knows_get_paper_en(evidence_id=id)

✅ 正确操作（快且稳定）：
knows_batch_get_evidence_details(evidences=[{id:1, type:"PAPER"}, {id:2, type:"PAPER"}, ...])
```

### 错误 2：忽略 Resource 功能

```
❌ 错误操作：调用 Tool 获取后展示纯文本
✅ 优化操作：在回复中告知用户可以通过 Resource 获取原始结构化数据，或直接通过 URI 注入上下文。
```

---

## 💡 进阶技巧

### 1. 深度综述生成
- 先 `knows_ai_search` 获取大量证据。
- 使用 `knows_batch_get_evidence_details` 获取前 5-10 篇的核心内容。
- 使用 `knows_batch_answer` 获取不同维度的总结（POPULAR_SCIENCE + CLINICAL）。
- 整合以上信息生成万字综述。

### 2. 极速二次查询
- 由于缓存机制，第二次查询同一批文献详情时，请放心调用批量工具，响应时间接近于零。

---

## 📝 总结

**核心原则：**
1. **能 Batch，不 Single**（3篇以上必用 Batch）。
2. **先 Search，后 Answer**。
3. **善用 Resource 注入静态上下文**。
4. **利用缓存机制进行深度多轮对话**。

