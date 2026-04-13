import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX_NAME);

export const saveVectorsToPinecone = async (vectors, repoUrl) => {
    try {
        if (!vectors || vectors.length === 0) {
            console.warn("⚠️ No vectors to upsert.");
            return false;
        }

        if (!repoUrl) {
            throw new Error("❌ repoUrl (namespace) is required");
        }

        const namespace = index.namespace(repoUrl);

        await namespace.upsert({records: vectors});

        console.log(`🌲 Saved ${vectors.length} vectors to namespace: ${repoUrl}`);
        return true;

    } catch (error) {
        console.error("❌ Pinecone Upsert Error:", error);
        return false;
    }
};

// src/services/pineconeService.js

// Add this function
// src/services/pineconeService.js

// 🚨 UPDATE THIS FUNCTION
export const deleteVectorsFromPinecone = async (pineconeIdsArray, repoUrl) => {
    try {
        if (!pineconeIdsArray || pineconeIdsArray.length === 0) {
            console.warn("⚠️ No IDs provided for deletion.");
            return;
        }

        if (!repoUrl) {
            throw new Error("❌ repoUrl (namespace) is required for deletion");
        }

        const ns = index.namespace(repoUrl);
        console.log('ns', ns);
        const BATCH_SIZE = 1000;

        for (let i = 0; i < pineconeIdsArray.length; i += BATCH_SIZE) {
            const batch = pineconeIdsArray.slice(i, i + BATCH_SIZE);
            console.log(batch);

            console.log(`🪓 Deleting batch of ${batch.length} vectors...`);

            await ns.deleteMany({ids: batch});
        }

        console.log(`✅ Deleted ${pineconeIdsArray.length} vectors from namespace: ${repoUrl}`);

    } catch (error) {
        console.error("❌ Pinecone Delete Error:", error);
        throw error;
    }
};

export const searchSimilarVectors = async (queryEmbedding, repoUrl, topK = 3) => {
    try {
        if (!repoUrl) {
            throw new Error("❌ repoUrl (namespace) is required");
        }

        const ns = index.namespace(repoUrl);

        console.log(`🔍 Querying namespace: ${repoUrl}`);
        console.log(`📏 Vector length: ${queryEmbedding.length}`);

        const queryResponse = await ns.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true
        });

        console.log(`🌲 Found ${queryResponse.matches?.length || 0} matches`);

        return queryResponse.matches?.map(match => match.id) || [];

    } catch (error) {
        console.error("❌ Pinecone Search Error:", error);
        return [];
    }
};