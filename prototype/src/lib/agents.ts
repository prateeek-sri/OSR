// ============================================================
// Agent Pipeline — All 6 agents in a sequential graph
// ============================================================

import { callGemini } from "./gemini";
import { ingestGitHubProfile, searchGitHubIssues } from "./github";
import type {
  GlobalState,
  AnalysisResults,
  StructuralGap,
  RecommendedIssue,
  CoachingBlueprint,
  Milestone,
  TechnicalProficiency,
} from "./types";

// ─────────────────────────────────────────────
// Step 1: Data Ingestion Engine
// ─────────────────────────────────────────────

export async function runIngestionAgent(
  username: string,
  targetRole: string
): Promise<GlobalState> {
  const rawData = await ingestGitHubProfile(username);

  const state: GlobalState = {
    user_context: {
      github_username: username,
      target_role: targetRole,
    },
    raw_github_metadata: rawData,
    analysis_results: {
      technical_proficiency: {},
      employability_index: 0,
      structural_gaps: [],
      summary: "",
    },
    remediation_strategy: {
      recommended_repos_and_issues: [],
      active_coaching_blueprint: null,
    },
    dynamic_roadmap: {
      milestones: [],
    },
  };

  return state;
}

// ─────────────────────────────────────────────
// Step 2: Profile Analysis Agent (Skill Map)
// ─────────────────────────────────────────────

export async function runProfileAnalysisAgent(
  state: GlobalState
): Promise<GlobalState> {
  // 🚀 FAST & FREE HEURISTIC (No Gemini API needed for this step anymore)
  const technical_proficiency: TechnicalProficiency = {};
  let totalBytes = 0;
  
  Object.values(state.raw_github_metadata.languages).forEach(b => totalBytes += b);

  // Map languages to scores based on byte percentage
  Object.entries(state.raw_github_metadata.languages).forEach(([lang, bytes]) => {
    const percentage = (bytes / totalBytes) * 100;
    
    // Ignore random tiny files (like a Dockerfile from a cloned template)
    if (percentage < 3) return;

    let score = 50; // baseline for small but present languages
    if (percentage > 40) score = 92;
    else if (percentage > 15) score = 78;
    else if (percentage > 5) score = 65;

    technical_proficiency[lang] = {
      score,
      evidence: [`Primary language (${percentage.toFixed(1)}% of codebase)`],
      category: "language"
    };
  });

  // Infer frameworks from dependencies
  const allDeps = new Set<string>();
  state.raw_github_metadata.repositories.forEach(r => r.dependencies?.forEach(d => allDeps.add(d)));
  
  const knownFrameworks: Record<string, "language" | "framework" | "tool" | "concept"> = {
    react: "framework",
    "next": "framework",
    express: "framework",
    mongoose: "tool",
    tailwindcss: "tool",
    jest: "tool"
  };

  allDeps.forEach(dep => {
    Object.keys(knownFrameworks).forEach(fw => {
      if (dep.includes(fw)) {
        technical_proficiency[fw] = {
          score: 85,
          evidence: [`Used in package.json dependencies`],
          category: knownFrameworks[fw]
        };
      }
    });
  });

  let baselineScore = 0;
  const skills = Object.values(technical_proficiency);
  if (skills.length > 0) {
    const avgScore = skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length;
    const repoBonus = Math.min(state.raw_github_metadata.repositories.length * 1.5, 25);
    baselineScore = Math.round(Math.min(Math.max(avgScore * 0.75 + repoBonus, 45), 96));
  } else {
    baselineScore = 50;
  }

  return {
    ...state,
    analysis_results: {
      ...state.analysis_results,
      technical_proficiency,
      employability_index: baselineScore,
      summary: `Analyzed ${state.raw_github_metadata.repositories.length} repositories. Strong foundation in ${Object.keys(state.raw_github_metadata.languages).slice(0, 2).join(" and ")}.`,
    },
  };
}

// ─────────────────────────────────────────────
// Step 3: Recruiter Evol Agent (Gap Finder)
// ─────────────────────────────────────────────

export async function runGapFinderAgent(
  state: GlobalState
): Promise<GlobalState> {
  const systemPrompt = `You are an elite Tech Recruiter and Engineering Manager with 15+ years of experience at FAANG companies. Review the user's technical proficiency matrix against standard industry benchmarks for their SPECIFIC target role.

Target Role: "${state.user_context.target_role}"

CRITICAL INSTRUCTION: You MUST strictly tailor your gap analysis to the Target Role above. 
- If the role is "Data Science" or "ML", focus on Python, SQL, Machine Learning, Pandas, Data Pipelines, etc. 
- If the role is "Frontend", focus on React, CSS, Accessibility, etc.
- If the role is "Backend", focus on Databases, APIs, caching, etc.

Your job:
1. Identify exactly what production-grade elements are missing from their portfolio relative to "${state.user_context.target_role}".
2. Translate these technical omissions into business-value hiring risks.
3. Calculate an overall employability index (0-100) specifically for this target role.

Return ONLY valid JSON in this exact format:
{
  "employability_index": <number 0-100>,
  "structural_gaps": [
    {
      "gap_id": "<snake_case_identifier>",
      "title": "<Human readable title>",
      "description": "<What's missing and why it matters for this specific role>",
      "severity": "<critical|high|medium|low>",
      "category": "<backend|frontend|data|ml|devops|testing|architecture>",
      "hiring_risk": "<Business-value impact of this gap>"
    }
  ]
}

Be specific and actionable. Maximum 6 gaps, minimum 2.`;

  const userData = JSON.stringify(
    {
      target_role: state.user_context.target_role,
      technical_proficiency: state.analysis_results.technical_proficiency,
      repositories: state.raw_github_metadata.repositories.map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        has_tests: r.has_tests,
        dependencies: r.dependencies,
      })),
      total_repos: state.raw_github_metadata.repositories.length,
      languages: state.raw_github_metadata.languages,
    },
    null,
    2
  );

  const response = await callGemini(systemPrompt, userData);
  const cleanResponse = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleanResponse);

  return {
    ...state,
    analysis_results: {
      ...state.analysis_results,
      employability_index: parsed.employability_index || 0,
      structural_gaps: (parsed.structural_gaps || []) as StructuralGap[],
    },
  };
}

// ─────────────────────────────────────────────
// Step 4: OS Matchmaker Agent (Open Source Finder)
// ─────────────────────────────────────────────

export async function runMatchmakerAgent(
  state: GlobalState
): Promise<GlobalState> {
  const gaps = state.analysis_results.structural_gaps;
  const topLanguages = Object.entries(state.raw_github_metadata.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  const allIssues: RecommendedIssue[] = [];
  const gapBatches = gaps.slice(0, 1);

  for (const gap of gapBatches) {
    const keywords = gap.gap_id.split("_").filter((w) => w.length > 2);
    const categoryKeywords: Record<string, string[]> = {
      backend: ["api", "server", "backend", "rest"],
      frontend: ["ui", "component", "frontend", "react"],
      devops: ["docker", "ci", "deploy", "kubernetes"],
      testing: ["test", "jest", "vitest", "cypress"],
      security: ["auth", "jwt", "session", "security"],
      architecture: ["architecture", "pattern", "design"],
    };

    const searchKeywords = [...keywords, ...(categoryKeywords[gap.category] || [])].slice(0, 5);
    const issues = await searchGitHubIssues(searchKeywords, topLanguages);

    // 🚀 FAST & FREE HEURISTIC (No Gemini API needed)
    issues.slice(0, 3).forEach((issue: unknown) => {
      const raw = issue as Record<string, unknown>;
      const repoUrl = raw.repository_url as string;
      const repoFullName = repoUrl ? repoUrl.replace("https://api.github.com/repos/", "") : "";
      
      const labels = ((raw.labels as Array<{ name: string }>) || []).map((l) => l.name);
      
      // Calculate a pseudo compatibility score based on labels and title matching
      let score = 75; 
      if (labels.some(l => searchKeywords.includes(l.toLowerCase()))) score += 10;
      const title = raw.title as string;
      if (title && searchKeywords.some(k => title.toLowerCase().includes(k))) score += 10;

      allIssues.push({
        id: raw.id as number,
        title: raw.title as string,
        html_url: raw.html_url as string,
        repo_full_name: repoFullName,
        repo_url: `https://github.com/${repoFullName}`,
        labels,
        body: raw.body as string | null,
        language: topLanguages[0] || "Unknown",
        gap_addressed: gap.gap_id,
        compatibility_score: Math.min(score, 99),
        difficulty: labels.includes("good first issue") ? "beginner" : "intermediate",
      });
    });
  }

  allIssues.sort((a, b) => b.compatibility_score - a.compatibility_score);

  return {
    ...state,
    remediation_strategy: {
      ...state.remediation_strategy,
      recommended_repos_and_issues: allIssues.slice(0, 5),
    },
  };
}

// ─────────────────────────────────────────────
// Step 5: Contrib Coach Agent
// ─────────────────────────────────────────────

export async function runCoachAgent(
  state: GlobalState,
  issueIndex: number
): Promise<GlobalState> {
  const issue =
    state.remediation_strategy.recommended_repos_and_issues[issueIndex];
  if (!issue) {
    return state;
  }

  const systemPrompt = `You are a senior open-source maintainer and mentor. Analyze the target issue and create a hyper-localized 3-step action guide for a developer who wants to contribute.

Your guide should:
1. Tell them exactly which file paths to inspect
2. Explain the precise area where the logic gap exists
3. Outline the architectural fix required — WITHOUT writing the complete solution

Be practical, specific, and encouraging.

Return ONLY valid JSON:
{
  "repo_overview": "<1-2 sentence description of what this repo does>",
  "steps": [
    {
      "step_number": 1,
      "title": "<Step title>",
      "description": "<Detailed description of what to do>",
      "file_path": "<Likely file path to inspect, if applicable>",
      "key_insight": "<The most important thing to understand>"
    }
  ],
  "prerequisites": ["<list of things they should know/setup>"],
  "estimated_time": "<e.g. '2-4 hours'>"
}`;

  const issueData = JSON.stringify({
    issue_title: issue.title,
    issue_body: issue.body,
    issue_url: issue.html_url,
    repo_name: issue.repo_full_name,
    labels: issue.labels,
    developer_languages: Object.entries(state.raw_github_metadata.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([l]) => l),
    gap_being_addressed: issue.gap_addressed,
  });

  const response = await callGemini(systemPrompt, issueData);
  const cleanResponse = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleanResponse);

  const blueprint: CoachingBlueprint = {
    issue_url: issue.html_url,
    issue_title: issue.title,
    repo_overview: parsed.repo_overview || "",
    steps: parsed.steps || [],
    prerequisites: parsed.prerequisites || [],
    estimated_time: parsed.estimated_time || "Unknown",
  };

  return {
    ...state,
    remediation_strategy: {
      ...state.remediation_strategy,
      active_coaching_blueprint: blueprint,
    },
  };
}

// ─────────────────────────────────────────────
// Step 6: Career Roadmap Agent
// ─────────────────────────────────────────────

export async function runRoadmapAgent(
  state: GlobalState
): Promise<GlobalState> {
  const systemPrompt = `You are a senior career coach and technical strategist. Based on the developer's current skills, identified gaps, and target role, create a dynamic career roadmap with clear milestones.

Target Role: "${state.user_context.target_role}"

CRITICAL INSTRUCTION: If the developer has not used modern, industry-standard DevOps or Cloud tools (like Docker, Kubernetes, CI/CD, AWS/GCP), you MUST aggressively recommend them as "future" or "active" milestones. Provide a reality-check that these are mandatory for modern engineering roles.

Create exactly 3 types of milestones:
1. VERIFIED milestones: Skills and strengths they already have (status: "verified")
2. ACTIVE milestones: Linked to their current gaps and recommended issues (status: "active")
3. FUTURE milestones: Advanced goals for long-term growth, specifically pushing modern architecture, Docker, Kubernetes, and Cloud (status: "future")

Return ONLY valid JSON:
{
  "overall_learning_summary": "<A 2-3 sentence overview explaining what the user will learn by following this roadmap and how it will directly improve their employability score for their target role.>",
  "milestones": [
    {
      "id": "<unique_snake_case_id>",
      "title": "<Milestone title>",
      "description": "<What this milestone represents>",
      "status": "<verified|active|future>",
      "skills_involved": ["<skill1>", "<skill2>"],
      "linked_gap_id": "<gap_id if applicable, null otherwise>",
      "completion_criteria": ["<criterion1>", "<criterion2>"],
      "resources": [
        { "title": "<Name of specific YouTube video tutorial or course>", "url": "<Actual YouTube video URL (must be a youtube.com/watch?v=... link)>" }
      ]
    }
  ]
}

Generate 5-8 milestones total. Make them specific, actionable, and always include 1-2 high-quality YouTube video resources (with real youtube.com URLs) for every active and future milestone.`;

  const userData = JSON.stringify({
    technical_proficiency: state.analysis_results.technical_proficiency,
    structural_gaps: state.analysis_results.structural_gaps,
    employability_index: state.analysis_results.employability_index,
    recommended_issues: state.remediation_strategy.recommended_repos_and_issues
      .slice(0, 5)
      .map((i) => ({
        title: i.title,
        gap: i.gap_addressed,
        url: i.html_url,
      })),
    target_role: state.user_context.target_role,
  });

  const response = await callGemini(systemPrompt, userData);
  const cleanResponse = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleanResponse);

  return {
    ...state,
    dynamic_roadmap: {
      overall_learning_summary: parsed.overall_learning_summary || "",
      milestones: (parsed.milestones || []) as Milestone[],
    },
  };
}
