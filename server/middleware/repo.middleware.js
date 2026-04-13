export const validateGithubUrl = (req, res, next) => {
    try {
        let { url } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: "Repository URL is strictly required." });
        }

        url = url.trim();

        const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/;

        if (!githubRegex.test(url)) {
            return res.status(400).json({ error: "Invalid format. Must be a valid GitHub repository URL." });
        }

        let cleanUrl = url.replace(/\/$/, '').replace(/\.git$/, '');
        req.body.url = cleanUrl;

        next();
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export const extractAuthToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            req.token = token;

        } else {
            req.token = null;
        }
        next();
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};