// ============================================================
// IDR — Global State Schema (LangGraph-style shared state)
// ============================================================

export interface UserContext {
  github_username: string;
  target_role: string;
}

export interface Repository {
  name: string;
  description: string | null;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  html_url: string;
  topics: string[];
  fork: boolean;
  has_tests: boolean;
  default_branch: string;
  detailed_languages?: Record<string, number>;
  dependencies?: string[];
}

export interface CommitInsight {
  repo_name: string;
  total_commits: number;
  recent_activity: boolean; // committed in last 90 days
  commit_frequency: "high" | "medium" | "low" | "inactive";
}

export interface RawGitHubMetadata {
  repositories: Repository[];
  languages: Record<string, number>; // language -> total bytes
  commit_history_insights: CommitInsight[];
  profile: {
    name: string | null;
    bio: string | null;
    public_repos: number;
    followers: number;
    following: number;
    avatar_url: string;
    html_url: string;
    created_at: string;
  } | null;
}

export interface TechnicalProficiency {
  [skill: string]: {
    score: number; // 0-100
    evidence: string[];
    category: "language" | "framework" | "tool" | "concept";
  };
}

export interface StructuralGap {
  gap_id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  hiring_risk: string;
}

export interface AnalysisResults {
  technical_proficiency: TechnicalProficiency;
  employability_index: number; // 0-100
  structural_gaps: StructuralGap[];
  summary: string;
}

export interface RecommendedIssue {
  id: number;
  title: string;
  html_url: string;
  repo_full_name: string;
  repo_url: string;
  labels: string[];
  body: string | null;
  language: string;
  gap_addressed: string;
  compatibility_score: number; // 0-100
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface CoachingBlueprint {
  issue_url: string;
  issue_title: string;
  repo_overview: string;
  steps: {
    step_number: number;
    title: string;
    description: string;
    file_path?: string;
    key_insight: string;
  }[];
  prerequisites: string[];
  estimated_time: string;
}

export interface RemediationStrategy {
  recommended_repos_and_issues: RecommendedIssue[];
  active_coaching_blueprint: CoachingBlueprint | null;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: "verified" | "active" | "future";
  skills_involved: string[];
  linked_gap_id?: string;
  linked_issue_url?: string;
  completion_criteria: string[];
  resources?: { title: string; url: string }[];
}

export interface DynamicRoadmap {
  overall_learning_summary?: string;
  milestones: Milestone[];
}

// The complete global state
export interface GlobalState {
  user_context: UserContext;
  raw_github_metadata: RawGitHubMetadata;
  analysis_results: AnalysisResults;
  remediation_strategy: RemediationStrategy;
  dynamic_roadmap: DynamicRoadmap;
}

// Pipeline step tracking
export type PipelineStep =
  | "idle"
  | "ingesting"
  | "analyzing"
  | "gap_finding"
  | "matching"
  | "coaching"
  | "roadmapping"
  | "complete"
  | "error";

export interface PipelineStatus {
  current_step: PipelineStep;
  completed_steps: PipelineStep[];
  error?: string;
  progress_message?: string;
}
