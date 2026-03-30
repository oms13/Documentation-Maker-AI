import crypto from 'crypto'; // Built into Node.js for generating unique IDs
import { extractOwnerAndRepo, filterRelevantFiles } from '../utils/githubHelper.js';
import { fetchRepoTree, fetchRawCodeFiles } from '../services/githubService.js';
import { chunkCodeIntelligently } from '../services/astService.js';
import { generateDocForChunk, generateEmbedding } from '../services/aiService.js';
import { saveVectorsToPinecone } from '../services/pineconeService.js';
import { Chunk } from '../models/Chunk.js'; // The MongoDB Model

export const repoIngest = async (req, res) => {
    try {
        const { url } = req.body;        
        console.log(`\n🚀 Starting Analysis for: ${url}`);

        // --- PHASE 1 & 2: INGESTION & CHUNKING ---
        const { owner, repo } = extractOwnerAndRepo(url);
        const repoData = await fetchRepoTree(owner, repo);
        const cleanFilesList = filterRelevantFiles(repoData.tree);
        const finalCodebase = await fetchRawCodeFiles(owner, repo, cleanFilesList);
        
        let allProjectChunks = [];
        finalCodebase.forEach(file => {
            if (file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
                allProjectChunks.push(...chunkCodeIntelligently(file.content, file.path));
            }
        });

        console.log(`🔪 Chopped repo into ${allProjectChunks.length} logical chunks.`);

        // --- PHASE 3 & 4: AI & DUAL-DATABASE STORAGE ---
        console.log("🧠 Generating Docs & Embeddings (Processing first 3 chunks for testing)...");
        
        const testChunks = allProjectChunks.slice(0, 3);
        const dbRecords = [];
        const pineconeVectors = [];

        for (const chunk of testChunks) {
            console.log(`   -> Processing: ${chunk.type} in ${chunk.filePath}`);
            
            // 1. Generate the human-readable documentation
            const explanation = await generateDocForChunk(chunk);
            
            // 2. Generate the math vector (We embed both the code AND the explanation for better search)
            const textToEmbed = `Code:\n${chunk.content}\n\nExplanation:\n${explanation}`;
            const embeddingArray = await generateEmbedding(textToEmbed);

            if (embeddingArray) {
                // 3. Create a unique ID to link Mongo and Pinecone
                const uniqueId = crypto.randomUUID();

                // 4. Prep data for MongoDB
                dbRecords.push({
                    repoUrl: url,
                    filePath: chunk.filePath,
                    type: chunk.type,
                    content: chunk.content,
                    aiDocumentation: explanation,
                    pineconeId: uniqueId
                });

                // 5. Prep data for Pinecone
                pineconeVectors.push({
                    id: uniqueId,
                    values: embeddingArray,
                    metadata: { 
                        filePath: chunk.filePath,
                        repoUrl: url
                    }
                });
            }
        }

        // 6. Save to MongoDB in one massive batch!
        await Chunk.insertMany(dbRecords);
        console.log(`🍃 Saved ${dbRecords.length} chunks to MongoDB.`);

        // 7. Save to Pinecone in one massive batch!
        if (pineconeVectors.length > 0) {
            await saveVectorsToPinecone(pineconeVectors);
        }

        console.log("✨ Full Ingestion and Storage Complete!");

        res.json({ 
            message: "Code successfully analyzed and stored in DBs!", 
            documentedResults: dbRecords // Send the Mongo records back to React
        });

    } catch (error) {
        console.error("❌ System Error:", error);
        res.status(500).json({ error: "Failed to process repository" });
    }
}