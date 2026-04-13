// src/services/aiService.js
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { encode } from '@toon-format/toon';
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// --- 1. EMBEDDING GENERATION ---
export const generateEmbedding = async (text) => {
    try {
        const result = await embeddingModel.embedContent(text);
        await delay(1000);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding generation failed:", error.message);
        return null;
    }
};

// --- 2. BATCH DOCUMENTATION (TOON Optimized) ---
export const generateDocsForBatch = async (chunkBatch, maxRetries = 3) => {
    const batchModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.ARRAY,
                description: "List of code chunk explanations",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: {
                            type: SchemaType.INTEGER,
                            description: "The exact numeric ID provided in the prompt"
                        },
                        explanation: {
                            type: SchemaType.STRING,
                            description: "The Markdown-formatted explanation of the code"
                        }
                    },
                    required: ["id", "explanation"]
                }
            }
        }
    });

    const cleanDataArray = chunkBatch.map(chunk => ({
        id: chunk.id,
        type: chunk.type || 'Snippet',
        path: chunk.filePath || 'Unknown',
        code: chunk.minifiedContent
    }));
    
    const toonPayloadString = encode(cleanDataArray);

    const prompt = `
    You are an elite Senior Software Architect. I am providing you with an array of ${chunkBatch.length} code chunks.
    The input data is formatted in TOON (Token-Oriented Object Notation) to save space.
    
    Analyze each chunk and write a concise, highly readable documentation block. 
    For each chunk, you MUST include:
    1. **WHAT:** A 1-2 sentence summary of what the code does.
    2. **WHY:** An explanation of its business logic or architectural purpose.
    3. **I/O:** Any parameters, inputs, or outputs it handles.

    You MUST return ONLY a JSON array of objects. 
    Each object must have exactly two keys:
    1. "id" (an integer that exactly matches the input id)
    2. "explanation" (your Markdown-formatted documentation string)

    Input Data (TOON Format):
    \n${toonPayloadString}\n
    `;

    // 🚨 THE RETRY LOOP: Defends against 503 and 429 API errors
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await batchModel.generateContent(prompt);
            const responseText = result.response.text();

            return JSON.parse(responseText);

        } catch (error) {
            // Check if the error is a temporary server overload (503) or rate limit (429)
            const isRetryableError = error.message.includes('503') || error.message.includes('429');

            if (isRetryableError && attempt < maxRetries) {
                // Exponential Backoff: Wait 10s, then 20s, then give up.
                const waitTime = attempt * 10000;
                console.warn(`   ⏳ Gemini API High Demand (503). Retrying batch attempt ${attempt + 1}/${maxRetries} in ${waitTime / 1000}s...`);
                await delay(waitTime);
            } else {
                // If it fails after all retries, or if it's a fatal error (like a bad API key), log it and move on.
                console.error(`❌ Batch Documentation Error (Attempt ${attempt}):`, error.message);
                return [];
            }
        }
    }
};

// --- 3. CONTEXTUAL Q&A ---
// --- 3. CONTEXTUAL Q&A ---
export const generateAnswerFromContext = async (userQuestion, contextDocs) => {
    try {
        const contextString = contextDocs.map(doc => `--- File: ${doc.filePath} ---\nCode:\n${doc.content}\n`).join('\n');

        const prompt = `
        You are a Principal Software Architect and an expert technical mentor. Your goal is to help a developer understand their codebase deeply and professionally.

        Use ONLY the following codebase context to answer the user's question. 

        CONTEXT (Relevant Code Snippets):
        ${contextString}

        USER QUESTION:
        ${userQuestion}

        INSTRUCTIONS FOR YOUR RESPONSE:
        1. **Direct Answer First:** Start with a clear, direct summary answering the user's core question.
        2. **Detailed Breakdown:** Explain the "how" and "why". Break down the logic step-by-step so the user actually learns how the system works.
        3. **File Referencing:** Always explicitly name the files you are talking about using bold backticks (e.g., **\`src/services/api.js\`**).
        4. **Code Evidence:** Do not just talk about the code—show it. Extract the most important 3-10 lines of code from the context and put them in properly formatted Markdown code blocks (e.g., \`\`\`javascript) to illustrate your points.
        5. **Professional Formatting:** Use Markdown headings (###), bold text, and bullet points to make your response look like a premium documentation page.
        6. **Strict Grounding:** If the answer cannot be confidently deduced from the provided Context, you MUST reply with: "I cannot find the relevant code to answer that in the current context." Do not guess or invent code.
        `;

        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await chatModel.generateContent(prompt);
        return result.response.text();

    } catch (error) {
        console.error("AI Answer Generation Failed:", error.message);
        return "Sorry, I encountered an error while trying to answer your question.";
    }
};


export const generateReadme = async (allChunkExplanations, repoUrl) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an elite Senior Software Architect. 
        I am going to give you a massive list of explanations for every single file and function in a repository located at: ${repoUrl}

        Your job is to synthesize all of these individual pieces into one, cohesive, highly professional "Master Documentation" Markdown file (A README.md).
        
        It must include:
        1. A catchy title and a high-level summary of what the entire project actually does.
        2. A "Tech Stack" section based on the technologies you see used in the chunks.
        3. A "Core Architecture" section explaining how the main pieces connect together.
        4. A "System Flow" Diagram. You MUST generate a Mermaid.js flowchart visualizing the data flow and component interactions. Wrap this strictly in a Markdown mermaid code block (\`\`\`mermaid ... \`\`\`) and use a top-down graph (graph TD).
        5. A breakdown of the primary folders/files and their responsibilities.
        
        Make it clean, use emojis, use bolding, and format it beautifully in Markdown. Do not include raw code unless absolutely necessary for a quick example.

        Here are the individual chunk explanations:
        ${allChunkExplanations}
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("❌ Failed to generate README:", error);
        return "README synthesis failed. Please try chatting with the codebase instead.";
    }
};