// src/controllers/chat.controller.js
import { generateEmbedding, generateAnswerFromContext } from '../services/aiService.js';
import { searchSimilarVectors } from '../services/pineconeService.js';
import { Chunk } from '../models/Chunk.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const askCodebase = async (req, res) => {
    // 🚨 1. SETUP SERVER-SENT EVENTS (SSE) HEADERS
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper function to stream JSON updates to the frontend
    const sendStream = (type, content) => {
        res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
    };

    try {
        const { question, repoUrl } = req.body;

        if (!question || !repoUrl) {
            sendStream('error', "Missing question or repoUrl");
            return res.end();
        }

        console.log(`\n💬 New Question: "${question}"`);

        // --- STEP 1: EMBEDDING ---
        sendStream('status', 'Generating embedding for your question...');
        const queryEmbedding = await generateEmbedding(question);

        // --- STEP 2: VECTOR SEARCH ---
        sendStream('status', 'Searching Vector Database...');
        const matchedVectorIds = await searchSimilarVectors(queryEmbedding, repoUrl, 3);

        if (matchedVectorIds.length === 0) {
            sendStream('complete', { answer: "I couldn't find any relevant code to answer that.", sources: [] });
            return res.end();
        }

        // --- STEP 3: MONGODB FETCH ---
        sendStream('status', 'Fetching code chunks from database...');
        const contextChunks = await Chunk.find({ pineconeId: { $in: matchedVectorIds } });

        // --- STEP 4: AI GENERATION WITH RETRY ---
        sendStream('status', 'Asking AI to formulate a response...');
        
        let answer = null;
        let attempt = 1;
        const MAX_RETRIES = 3;

        while (attempt <= MAX_RETRIES) {
            try {
                answer = await generateAnswerFromContext(question, contextChunks);
                
                if (answer && answer.includes("Sorry, I encountered an error")) {
                    throw new Error("Gemini API Overloaded or Failed");
                }
                
                break; // Success! Break the loop.
            } catch (error) {
                console.warn(`   ⚠️ Gemini answer generation failed (Attempt ${attempt}/${MAX_RETRIES}).`);
                
                if (attempt < MAX_RETRIES) {
                    const waitTime = attempt * 3000; 
                    sendStream('status', `AI overloaded. Retrying in ${waitTime / 1000}s...`);
                    await delay(waitTime);
                } else {
                    console.error("❌ Max retries reached for Gemini Chat.");
                    answer = "I'm sorry, the AI is currently experiencing high traffic. Please try asking again in a few moments.";
                }
            }
            attempt++;
        }

        const sourceFiles = [...new Set(contextChunks.map(chunk => chunk.filePath))];

        console.log("✅ Answer generated successfully!");

        // --- STEP 5: SEND FINAL ANSWER ---
        // Send the complete event and close the connection
        sendStream('complete', { answer: answer, sources: sourceFiles });
        res.end();

    } catch (error) {
        console.error("❌ Chat Error:", error);
        sendStream('error', "Failed to process chat query");
        res.end();
    }
};