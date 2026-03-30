import crypto from 'crypto'; // Built into Node.js for generating unique IDs
import { extractOwnerAndRepo, filterRelevantFiles } from '../utils/githubHelper.js';
import { fetchRepoTree, fetchRawCodeFiles } from '../services/githubService.js';
import { chunkCodeIntelligently } from '../services/astService.js';
import { generateDocForChunk, generateEmbedding } from '../services/aiService.js';
import { saveVectorsToPinecone } from '../services/pineconeService.js';
import { Chunk } from '../models/Chunk.js'; // The MongoDB Model

// A simple helper to pause JavaScript execution (The Rate Limit Throttle)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        console.log(`🧠 Generating Docs & Embeddings for ${allProjectChunks.length} chunks...`);
        
        const dbRecords = [];
        const pineconeVectors = [];

        // THE THROTTLED LOOP: Processes every single chunk safely
        for (let i = 0; i < allProjectChunks.length; i++) {
            const chunk = allProjectChunks[i];
            console.log(`   -> [${i + 1}/${allProjectChunks.length}] Processing: ${chunk.type} in ${chunk.filePath}`);
            
            try {
                // 1. Generate the human-readable documentation
                const explanation = await generateDocForChunk(chunk);
                
                // 2. Generate the math vector
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

                // 🛑 THE THROTTLE: Pause for 8 seconds before the next chunk.
                // This guarantees we never hit the Google 429 API Limit!
                if (i < allProjectChunks.length - 1) {
                    console.log("      ⏱️ Sleeping for 15 seconds to respect API limits...");
                    await delay(15000);
                }

            } catch (chunkError) {
                // If one chunk fails, log it and move to the next one!
                console.error(`      ⚠️ Failed to process chunk in ${chunk.filePath}:`, chunkError.message);
            }
        }

        // 6. Save to MongoDB in one massive batch!
        if (dbRecords.length > 0) {
            await Chunk.insertMany(dbRecords);
            console.log(`🍃 Saved ${dbRecords.length} chunks to MongoDB.`);
        }

        // 7. Save to Pinecone in one massive batch!
        if (pineconeVectors.length > 0) {
            await saveVectorsToPinecone(pineconeVectors);
        }

        console.log("✨ Full Ingestion and Storage Complete!");

        res.json({ 
            message: "Code successfully analyzed and stored in DBs!", 
            documentedResults: dbRecords 
        });

    } catch (error) {
        console.error("❌ System Error:", error);
        res.status(500).json({ error: "Failed to process repository" });
    }
}