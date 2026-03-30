import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateDocForChunk = async (chunk) => {
    const prompt = `
    You are an elite Senior Software Architect. Your job is to document a codebase.
    
    File Path: ${chunk.filePath}
    Code Type: ${chunk.type}
    
    Here is the exact code snippet:
    """
    ${chunk.content}
    """
    
    Analyze this code and provide a concise, highly readable documentation block. 
    You MUST include:
    1. A 1-sentence summary of WHAT it does.
    2. An explanation of WHY it exists (the business logic or architecture purpose).
    3. Any parameters, inputs, or outputs it handles.
    
    Format your response in clean Markdown. Keep it professional and strictly focused on the provided snippet.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;

        return response.text();

    } catch (error) {
        console.error(`AI Generation failed for ${chunk.filePath}:`, error.message);
        return "Documentation generation failed for this snippet.";
    }
};

export const generateEmbedding = async (text) => {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding generation failed:", error.message);
        return null;
    }
};


export const generateAnswerFromContext = async (userQuestion, contextDocs) => {
    try {
        const contextString = contextDocs.map(doc => `
--- File: ${doc.filePath} ---
Code:
${doc.content}
`).join('\n');

        const prompt = `
You are an elite Senior Developer helping a junior engineer understand a codebase.
Use the following codebase context to answer the user's question. 

CONTEXT (Relevant Code Snippets):
${contextString}

USER QUESTION:
${userQuestion}

INSTRUCTIONS:
1. Answer clearly and concisely using Markdown.
2. Reference the specific file paths in your explanation.
3. If the answer is not contained in the Context provided, simply say "I cannot find the answer to that in the current codebase context." Do not guess.
`;

        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await chatModel.generateContent(prompt);
        return (await result.response).text();

    } catch (error) {
        console.error("AI Answer Generation Failed:", error.message);
        return "Sorry, I encountered an error while trying to answer your question.";
    }
};