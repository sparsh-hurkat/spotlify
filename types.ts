
export interface KnowledgeSnippet {
  id: string;
  category: 'resume' | 'bio' | 'project' | 'skill' | 'cover_letter';
  title: string;
  content: string;
}

export enum AppTab {
  CONTEXT = 'CONTEXT',
  RESUME = 'RESUME',
  COVER_LETTER = 'COVER_LETTER',
  QA = 'QA',
}

export interface JobContext {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
}

export interface AnalysisResult {
  relevant: string[];
  irrelevant: string[];
  missing_from_kb: string[];
  suggestions: string[];
}

export interface ResumeTabState {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  selectedResumeId: string;
  currentResumeContent: string;
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
}

export interface CoverLetterTabState {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  selectedLetterId: string;
  currentLetterContent: string;
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
}

export interface QATabState {
  question: string;
  answer: string | null;
  isGenerating: boolean;
}

// RAG / Vector Store Types
export interface VectorDoc {
  id: string;
  values: number[];
  metadata: {
    text: string;
    category: string;
    sourceId: string;
    title: string;
    fullContent?: string; // Added to store original content in the first chunk
  };
}

export interface ScoredVectorDoc {
  score: number;
  metadata: {
    text: string;
    category: string;
    sourceId: string;
    title: string;
    fullContent?: string;
  };
}
