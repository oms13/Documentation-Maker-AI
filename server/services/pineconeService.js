import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX_NAME);

export const saveVectorsToPinecone = async (vectors) => {
    try {
        if (!vectors || vectors.length === 0) {
            console.warn("⚠️ No vectors to upsert.");
            return false;
        }
        await index.upsert({ records: vectors });

        console.log(`🌲 Successfully saved ${vectors.length} vectors to Pinecone.`);
        return true;

    } catch (error) {
        console.error("Pinecone Upsert Error:", error.message);
        return false;
    }
};

export const searchSimilarVectors = async (queryEmbedding, repoUrl, topK = 3) => {
    try {
        console.log(`🔍 Querying Pinecone with vector length: ${queryEmbedding.length}`);

        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: topK,
            includeMetadata: true,
            filter: { repoUrl: repoUrl }
        });

        console.log(`🌲 Pinecone found ${queryResponse.matches.length} matches!`);

        return queryResponse.matches.map(match => match.id);
    } catch (error) {
        console.error("❌ Pinecone Search Error:", error);
        return [];
    }
};