// server/controllers/auth.controller.js
import axios from 'axios';

export const githubOAuth = async (req, res) => {
    try {
        // The temporary code sent by your React AuthCallback page
        const { code } = req.body; 

        if (!code) {
            return res.status(400).json({ error: "No authorization code provided" });
        }

        // Trade the code for an official access token securely on the server
        const githubResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code
            },
            {
                headers: {
                    // Force GitHub to return a clean JSON object instead of a messy URL string
                    'Accept': 'application/json' 
                }
            }
        );

        const accessToken = githubResponse.data.access_token;

        if (!accessToken) {
            throw new Error("GitHub rejected the code. It may be expired.");
        }

        // Send the token back to React to be saved in localStorage
        res.json({ access_token: accessToken });

    } catch (error) {
        console.error("❌ OAuth Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Authentication failed" });
    }
};