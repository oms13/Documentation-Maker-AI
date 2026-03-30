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