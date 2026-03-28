export const repoIngest = async (req, res) => {
    try {
        const { url } = req.body;        

        const urlPart = url.replace('https://github.com/', '').split('/');
        const owner = urlPart[0];
        const repo = urlPart[1].replace('.git',''); // Excellent addition!
        
        const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        
        // FIX 1: Added the User-Agent header so GitHub doesn't block us
        const response = await fetch(githubApiUrl, {
            headers: {
                "User-Agent": "Intelligent-Docs-App" 
            }
        });
        
        // FIX 2: Added 'await' so we actually get the JSON object
        const repoData = await response.json();

        // Safety check to prevent crashing if the repo is private or branch is wrong
        if (!repoData.tree) {
            return res.status(400).json({ 
                error: "GitHub refused to send the tree.",
                details: repoData.message 
            });
        }
        
        console.log(`Successfully fetched blueprint for ${owner}/${repo}. Found ${repoData.tree.length} items.`);
        console.log(repoData.tree);

        res.json({ message: "Blueprint fetched!", totalFiles: repoData.tree.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch repository" });
    }
}