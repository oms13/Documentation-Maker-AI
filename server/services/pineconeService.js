import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX_NAME);

export const saveVectorsToPinecone = async (vectors) => {
    try {
        await index.upsert(vectors);
        console.log(`🌲 Successfully saved ${vectors.length} vectors to Pinecone.`);
    } catch (error) {
        console.error("Pinecone Upsert Error:", error.message);
    }
};

export const searchSimilarVectors = async (queryEmbedding, repoUrl, topK = 3) => {
    try {
        console.log(`🔍 Querying Pinecone with vector length: ${queryEmbedding.length}`);
        
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: topK,
            includeMetadata: true,
            // 🚨 We are commenting out the filter temporarily to guarantee we get results!
            // filter: { repoUrl: repoUrl } 
        });
        
        console.log(`🌲 Pinecone found ${queryResponse.matches.length} matches!`);
        
        // Return just the IDs of the closest matches
        return queryResponse.matches.map(match => match.id);
    } catch (error) {
        // We log the FULL error now so we can see if it fails
        console.error("❌ Pinecone Search Error:", error); 
        return [];
    }
};