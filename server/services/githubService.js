import axios from 'axios';
export const fetchRepoTree = async (owner, repo) => {
    try {

        const tryBranches = ["main", "master"];

        let treeData = null;
        let usedBranch = null;

        for (const branch of tryBranches) {
            try {
                const res = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
                    { headers: { "User-Agent": "Intelligent-Docs-App" } }
                );
                treeData = res.data;
                usedBranch = branch;
                break;
            } catch (err) {
                // try next
            }
        }

        if (!treeData) {
            const repo = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}`,
                { headers: { "User-Agent": "Intelligent-Docs-App" } }
            );
            const branch = repo.data.default_branch;

            const res = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
                { headers: { "User-Agent": "Intelligent-Docs-App" } }
            );

            treeData = res.data;
            usedBranch = branch; //will be used as chache that this user mostly uses this branch
        }

        return {
            repoData: treeData,
            branch: usedBranch
        };
    } catch (error) {
        console.error(error)
    }
}

export const fetchRawCodeFiles = async (owner, repo, cleanFilesList, branch) => {

    const fetchedCodeData = await Promise.all(
        cleanFilesList.map(async (file) => {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;

            try {
                const fileResponse = await fetch(rawUrl);
                const content = await fileResponse.text();

                return { path: file.path, content: content };
            } catch (err) {
                console.error(`Failed to download: ${file.path}`);
                return null;
            }
        })
    );

    return fetchedCodeData.filter(file => file !== null);
};