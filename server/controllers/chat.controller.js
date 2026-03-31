import { generateEmbedding, generateAnswerFromContext } from '../services/aiService.js';
import { searchSimilarVectors } from '../services/pineconeService.js';
import { Chunk } from '../models/Chunk.js';

export const askCodebase = async (req, res) => {
    try {
        const { question, repoUrl } = req.body;

        if (!question || !repoUrl) {
            return res.status(400).json({ error: "Missing question or repoUrl" });
        }

        console.log(`\n💬 New Question: "${question}"`);

        // 1. Turn the user's question into math
        console.log("1. Generating embedding for question...");
        const queryEmbedding = await generateEmbedding(question);

        // 2. Search Pinecone for the closest 3 code chunks
        console.log("2. Searching Vector Database...");
        const matchedVectorIds = await searchSimilarVectors(queryEmbedding, repoUrl, 3);

        if (matchedVectorIds.length === 0) {
            return res.json({ answer: "I couldn't find any relevant code to answer that.", sources: [] });
        }

        // 3. Fetch the actual text for those chunks from MongoDB using the IDs
        console.log(`3. Fetching ${matchedVectorIds.length} chunks from MongoDB...`);
        const contextChunks = await Chunk.find({ pineconeId: { $in: matchedVectorIds } });

        // 4. Pass the exact code and the user's question to Gemini
        console.log("4. Asking AI to generate an answer...");
        const answer = await generateAnswerFromContext(question, contextChunks);

        // Extract just the file paths so the frontend can display them as "Sources"
        const sourceFiles = [...new Set(contextChunks.map(chunk => chunk.filePath))];

        console.log("✅ Answer generated successfully!");

        // 5. Send it all back to React!
        res.json({
            answer: answer,
            sources: sourceFiles
        });

    } catch (error) {
        console.error("❌ Chat Error:", error);
        res.status(500).json({ error: "Failed to process chat query" });
    }
};