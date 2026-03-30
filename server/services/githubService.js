export const fetchRepoTree = async (owner, repo) => {
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    
    const response = await fetch(githubApiUrl, {
        headers: { "User-Agent": "Intelligent-Docs-App" }
    });
    
    return await response.json();
};

export const fetchRawCodeFiles = async (owner, repo, cleanFilesList) => {
    const branch = "main";
    
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