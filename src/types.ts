export type DataScope = "PAPER" | "PAPER_CN" | "GUIDE" | "MEETING";
export type AnswerType = "CLINICAL" | "RESEARCH" | "POPULAR_SCIENCE";
export type EvidenceType = "PAPER" | "PAPER_CN" | "GUIDE" | "MEETING";

export type TaggingType =
  | "THERAPEUTIC_AREA"
  | "ORGANISM"
  | "REGION"
  | "POPULATION_CHARACTERISTICS"
  | "PARTICIPANT_AGE"
  | "POPULATION_SEX"
  | "SAMPLE_SIZE"
  | "RESEARCH_GROUP"
  | "TREATMENT_REGIMEN_OF_RESEARCH_GROUP"
  | "CONTROL_GROUP"
  | "OUTCOME"
  | "PRIMARY_OUTCOME"
  | "LENGTH_OF_FOLLOW_UP"
  | "MAIN_FINDING"
  | "EFFECT_SIZE_AND_95CI_FOR_PRIMARY_OUTCOME"
  | "TRIAL_NUMBER"
  | "FUNDING_SOURCE"
  | "LIMITATION"
  | "STUDY_TYPE"
  | "ORIGINAL_NON_ORIGINAL_STUDY"
  | "STUDY_PHASE"
  | "CLINICAL_STAGE"
  | "BIOMARKER_STATUS"
  | "TREATMENT_LINE"
  | "INCLUSION_EXCLUSION_BASE_ON_POPULATION_CHARACTERISTICS"
  | "INCLUSION_EXCLUSION_BASE_ON_TREATMENT_LINE"
  | "INCLUSION_EXCLUSION_BASE_ON_INTERVENTION"
  | "INCLUSION_EXCLUSION_BASE_ON_OUTCOME"
  | "RANDOM_SEQUENCE_GENERATION"
  | "ALLOCATION_CONCEALMENT"
  | "BLINDING_OF_OUTCOME_ASSESSMENT"
  | "INCOMPLETE_OUTCOME_DATA"
  | "BLINDING_OF_PARTICIPANTS_AND_PERSONNEL";

export type BlockType =
  | "caption"
  | "footnote"
  | "equation"
  | "list-item"
  | "footer"
  | "header"
  | "figure"
  | "heading"
  | "table"
  | "paragraph";

export interface Evidence {
  id: string;
  summary?: string;
  title: string;
  type: EvidenceType;
  label: string[];
  has_pdf?: boolean;
}

export interface AiSearchResponse {
  question_id: string;
  evidences: Evidence[];
}

export interface EvidenceSummaryResponse {
  summary: string;
}

export interface HighlightBlock {
  block_id?: string;
  block_type: BlockType;
  text: string;
  files: string[];
  page_number: number;
}

export interface AnswerResponse {
  content: string;
}

export interface PaperEnResponse {
  title_en: string;
  title_cn: string;
  publish_date: string;
  impact_factor: number;
  study_type: string;
  journal: string;
  authors: string[];
  doi: string;
  abstract_en: string;
  abstract_cn: string;
  cas_journal_division: string;
  cas_journal_division_sub: string;
  wos_jif_quartile: string;
  hasPdf: boolean;
}

export interface PaperCnResponse {
  title_en: string;
  title_cn: string;
  publish_date: string;
  impact_factor: number;
  study_type: string;
  journal: string;
  authors: string[];
  doi: string;
  abstract_en: string;
  abstract_cn: string;
}

export interface GuideResponse {
  title_en: string;
  title_cn: string;
  publish_date: string;
  organizations: string[];
}

export interface MeetingResponse {
  title_en: string;
  title_cn: string;
  publish_date: string;
  study_type: string;
  conference: string;
  sponsor: string;
  data_source: string;
  authors: string;
  doi: string;
  abstract_en: string;
  abstract_cn: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  user_id: string;
  time: string;
  clinical_answer: boolean;
  research_answer: boolean;
  popular_science_answer: boolean;
}

export interface ListQuestionResponse {
  total_count: number;
  total_page: number;
  items: QuestionItem[];
}

export interface InterpretationItem {
  id: string;
  user_id: string;
  evidence_type: EvidenceType;
  evidence_title: string;
  time: string;
}

export interface ListInterpretationResponse {
  total_count: number;
  total_page: number;
  items: InterpretationItem[];
}

export interface TaggingResponse {
  result?: string;
  extract_result?: string;
  judgment_result?: string;
  judgment_reason?: string;
  reason?: string;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}
