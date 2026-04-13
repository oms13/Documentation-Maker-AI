import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const fetchRepoTree = async (owner, repo, githubToken = null) => {
    try {
        const activeToken = githubToken || process.env.GITHUB_SYSTEM_TOKEN;

        const headers = { "User-Agent": "RepoMind-App" };
        if (activeToken) {
            headers.Authorization = `Bearer ${activeToken}`;
        }

        const repoMeta = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        const branch = repoMeta.data.default_branch;

        const treeRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
            { headers }
        );

        return {
            repoData: treeRes.data,
            branch: branch
        };
    } catch (error) {
        console.error("❌ GitHub Tree Fetch Error:", error.message);
        return { repoData: null, branch: null };
    }
};
export const fetchRawCodeFiles = async (owner, repo, cleanFilesList, branch, githubToken = null) => {
    const fetchedCodeData = [];
    const CONCURRENCY_LIMIT = 50;

    const activeToken = githubToken || process.env.GITHUB_SYSTEM_TOKEN;
    const headers = { "User-Agent": "RepoMind-App" };
    
    if (activeToken) {
        // 🚨 FIX 1: raw.githubusercontent often expects 'token' instead of 'Bearer'
        headers.Authorization = `token ${activeToken}`;
    }

    for (let i = 0; i < cleanFilesList.length; i += CONCURRENCY_LIMIT) {
        const batch = cleanFilesList.slice(i, i + CONCURRENCY_LIMIT);

        const batchPromises = batch.map(async (file) => {
            // 🚨 FIX 2: Safely URL-encode the path (protects against spaces/special chars)
            // We split by '/' so we don't accidentally encode the slashes into '%2F'
            const safePath = file.path.split('/').map(encodeURIComponent).join('/');
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${safePath}`;

            try {
                const response = await axios.get(rawUrl, {
                    headers: headers,
                    responseType: 'text'
                });

                return { path: file.path, content: String(response.data) };
            } catch (err) {
                // 🚨 FIX 3: Reveal the ACTUAL error so we aren't guessing
                console.error(`⚠️ Failed to download: ${file.path}`);
                console.error(`   -> Reason: ${err.response?.status || 'Network Error'} - ${err.message}`);
                return null;
            }
        });

        const batchResults = await Promise.all(batchPromises);
        fetchedCodeData.push(...batchResults.filter(file => file !== null));
    }

    return fetchedCodeData;
};