// 构建时拉取 GitHub 公开数据，缓存到 data/github.json。
// 未登录的 GitHub API 每小时只有 60 次额度，所以默认 12 小时内直接用缓存；
// 网络失败时也回退到缓存，保证离线也能构建。
import fs from 'node:fs/promises';

const CACHE = new URL('../data/github.json', import.meta.url);
const MAX_AGE_MS = 12 * 3600 * 1000;

export async function loadGitHub(user, { refresh = false } = {}) {
  let cache = null;
  try {
    cache = JSON.parse(await fs.readFile(CACHE, 'utf8'));
  } catch {}

  const fresh = cache && Date.now() - Date.parse(cache.fetchedAt) < MAX_AGE_MS;
  if (cache && fresh && !refresh) return cache;

  try {
    const data = await fetchGitHub(user);
    await fs.writeFile(CACHE, JSON.stringify(data, null, 2) + '\n');
    console.log(`[github] refreshed: ${data.repos.length} repos`);
    return data;
  } catch (err) {
    if (cache) {
      console.warn(`[github] fetch failed (${err.message}), using cache from ${cache.fetchedAt}`);
      return cache;
    }
    throw err;
  }
}

async function gh(path) {
  const headers = { 'User-Agent': 'richzds-blog-build', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

async function fetchGitHub(user) {
  const [profile, repos] = await Promise.all([
    gh(`/users/${user}`),
    gh(`/users/${user}/repos?per_page=100&sort=pushed`),
  ]);
  const list = repos.filter((r) => !r.archived && !r.private);

  // fork 的代码不是自己写的，不计入语言统计
  const languages = await Promise.all(
    list.map((r) => (r.fork ? {} : gh(`/repos/${user}/${r.name}/languages`).catch(() => ({})))),
  );

  return {
    fetchedAt: new Date().toISOString(),
    profile: {
      login: profile.login,
      name: profile.name || profile.login,
      bio: (profile.bio || '').trim(),
      avatar: profile.avatar_url,
      url: profile.html_url,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      createdAt: profile.created_at,
    },
    repos: list.map((r, i) => ({
      name: r.name,
      description: r.description || '',
      url: r.html_url,
      homepage: r.homepage || '',
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      fork: r.fork,
      createdAt: r.created_at,
      pushedAt: r.pushed_at,
      languages: languages[i],
    })),
  };
}
