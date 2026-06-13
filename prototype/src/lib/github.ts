// ============================================================
// Step 1: Data Ingestion Engine — GitHub API Client (FAST)
// ============================================================

import { Repository, CommitInsight, RawGitHubMetadata } from "./types";

const GITHUB_API = "https://api.github.com";

// Token is injected per-request from the OAuth session
let currentToken: string | null = null;

export function setGitHubToken(token: string | null) {
  currentToken = token;
}

async function fetchJSON(url: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "IDR-Agent",
  };

  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) throw new Error("GitHub user not found");
    if (res.status === 403) throw new Error("GitHub API rate limit hit. Please sign in with GitHub.");
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

export async function searchGitHubIssues(
  keywords: string[],
  languages: string[]
): Promise<unknown[]> {
  const langFilter = languages.slice(0, 3).map((l) => `language:${l}`).join("+");
  const keywordQuery = keywords.slice(0, 5).join("+");
  const query = `${keywordQuery}+label:good-first-issue+state:open+${langFilter}`;

  try {
    const result = await fetchJSON(
      `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=10&sort=updated`
    );
    return result.items || [];
  } catch {
    return [];
  }
}

// ============================================================
// FAST Ingestion — minimal API calls
// ============================================================

export async function ingestGitHubProfile(
  username: string
): Promise<RawGitHubMetadata> {
  // 1. Fetch profile + repos in parallel (2 API calls)
  const [profileData, repos] = await Promise.all([
    fetchJSON(`${GITHUB_API}/users/${username}`),
    fetchJSON(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=pushed&type=owner`),
  ]);

  const profile = {
    name: profileData.name,
    bio: profileData.bio,
    public_repos: profileData.public_repos,
    followers: profileData.followers,
    following: profileData.following,
    avatar_url: profileData.avatar_url,
    html_url: profileData.html_url,
    created_at: profileData.created_at,
  };

  // Filter forks, map to our type, and KEEP ONLY TOP 15 to avoid LLM token limits
  const nonForkedRepos: Repository[] = repos
    .filter((r: Record<string, unknown>) => !r.fork)
    .slice(0, 15)
    .map((repo: Record<string, unknown>) => ({
      name: repo.name as string,
      description: repo.description as string | null,
      language: repo.language as string | null,
      languages_url: repo.languages_url as string,
      stargazers_count: repo.stargazers_count as number,
      forks_count: repo.forks_count as number,
      open_issues_count: repo.open_issues_count as number,
      size: repo.size as number,
      created_at: repo.created_at as string,
      updated_at: repo.updated_at as string,
      pushed_at: repo.pushed_at as string,
      html_url: repo.html_url as string,
      topics: (repo.topics as string[]) || [],
      fork: false,
      has_tests: false,
      default_branch: repo.default_branch as string,
    }));

  // 2. Use the primary language from repo listing (already available, 0 API calls)
  const aggregatedLanguages: Record<string, number> = {};
  for (const repo of nonForkedRepos) {
    if (repo.language) {
      aggregatedLanguages[repo.language] = (aggregatedLanguages[repo.language] || 0) + repo.size;
    }
  }

  // 3. Fetch detailed languages + package.json for top 5 repos ONLY (max 10 API calls)
  const topRepos = nonForkedRepos.slice(0, 5);
  await Promise.all(
    topRepos.map(async (repo) => {
      try {
        // Detailed languages
        const langs = await fetchJSON(repo.languages_url);
        repo.detailed_languages = langs;
        Object.entries(langs).forEach(([lang, bytes]) => {
          aggregatedLanguages[lang] = (aggregatedLanguages[lang] || 0) + (bytes as number);
        });
      } catch { /* skip */ }

      try {
        // Dependencies from package.json
        const content = await fetchJSON(
          `${GITHUB_API}/repos/${username}/${repo.name}/contents/package.json`
        );
        if (content.content) {
          const decoded = atob(content.content.replace(/\n/g, ""));
          const pkg = JSON.parse(decoded);
          repo.dependencies = [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {}),
          ];

          // Infer tests from devDependencies
          const testDeps = ["jest", "vitest", "mocha", "cypress", "playwright", "@testing-library"];
          repo.has_tests = repo.dependencies.some((d) =>
            testDeps.some((t) => d.includes(t))
          );
        }
      } catch { /* no package.json */ }
    })
  );

  // 4. Commit insights from repo data (0 API calls — infer from pushed_at)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const commitInsights: CommitInsight[] = nonForkedRepos.slice(0, 10).map((repo) => {
    const pushed = new Date(repo.pushed_at);
    const recent = pushed > ninetyDaysAgo;
    const daysSincePush = (now.getTime() - pushed.getTime()) / (1000 * 60 * 60 * 24);
    const freq: CommitInsight["commit_frequency"] =
      daysSincePush < 7 ? "high" : daysSincePush < 30 ? "medium" : daysSincePush < 90 ? "low" : "inactive";

    return {
      repo_name: repo.name,
      total_commits: 1, // We don't fetch this anymore for speed
      recent_activity: recent,
      commit_frequency: freq,
    };
  });

  return {
    repositories: nonForkedRepos,
    languages: aggregatedLanguages,
    commit_history_insights: commitInsights,
    profile,
  };
}
