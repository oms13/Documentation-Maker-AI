import crypto from 'crypto';
import { extractOwnerAndRepo, filterRelevantFiles } from '../utils/githubHelper.js';
import { fetchRawCodeFiles, fetchRepoTree } from '../services/githubService.js';
import { chunkCodeIntelligently } from '../services/astService.js';
// 🚨 Changed generateDocForChunk to generateDocsForBatch
import { generateDocsForBatch, generateEmbedding, generateMasterRepoDoc } from '../services/aiService.js';
import { createRepoDoc, saveRecordsToDb, updateRepoDocumentation } from '../services/mongoService.js';
import { saveVectorsToPinecone } from '../services/pineconeService.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const repoIngest = async (req, res) => {
    try {
        const { url } = req.body;
        const repoInfo = await createRepoDoc(url);
        const repoId = repoInfo._id;

        if (!repoId) {
            console.log("Unable to create DB for this Repo");
            return;
        }

        console.log(`\n🚀 Starting Analysis for: ${url}`);

        const { owner, repo } = extractOwnerAndRepo(url);
        const { repoData, branch } = await fetchRepoTree(owner, repo);

        const cleanFilesList = filterRelevantFiles(repoData.tree);
        const finalCodebase = await fetchRawCodeFiles(owner, repo, cleanFilesList, branch);

        let allProjectChunks = [];
        finalCodebase.forEach(file => {
            if (file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
                allProjectChunks.push(...chunkCodeIntelligently(file.content, file.path));
            }
        });
        console.log(`🔪 Chopped repo into ${allProjectChunks.length} logical chunks.`);
        console.log(`🧠 Generating Docs & Embeddings in batches...`);

        const dbRecords = [];
        const pineconeVectors = [];

        // --- 🚨 NEW BATCH PROCESSING LOGIC ---
        const BATCH_SIZE = 10;

        for (let i = 0; i < allProjectChunks.length; i += BATCH_SIZE) {
            const currentBatch = allProjectChunks.slice(i, i + BATCH_SIZE);
            console.log(`📦 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${currentBatch.length} chunks)...`);

            try {
                // 1. Ask Gemini to document all chunks in this batch at once
                const batchExplanations = await generateDocsForBatch(currentBatch);
                // 2. Loop through the batch locally to create embeddings and format data
                for (let j = 0; j < currentBatch.length; j++) {
                    const chunk = currentBatch[j];

                    // Match the explanation to the chunk using the index, with a safe fallback
                    const explanationObj = batchExplanations?.find(exp => exp.id === j);
                    const explanation = explanationObj ? explanationObj.explanation : "Analyzed code chunk.";

                    const textToEmbed = `Code:\n${chunk.content}\n\nExplanation:\n${explanation}`;
                    const embeddingArray = await generateEmbedding(textToEmbed);

                    if (embeddingArray) {
                        const uniqueId = crypto.randomUUID();

                        dbRecords.push({
                            repoId: repoId,
                            filePath: chunk.filePath,
                            type: chunk.type,
                            content: chunk.content,
                            aiDocumentation: explanation,
                            pineconeId: uniqueId
                        });

                        pineconeVectors.push({
                            id: String(uniqueId),
                            values: Array.from(embeddingArray),
                            metadata: {
                                filePath: chunk.filePath,
                                repoUrl: url
                            }
                        });
                    }
                }

                // 3. Sleep briefly between batches instead of between chunks
                if (i + BATCH_SIZE < allProjectChunks.length) {
                    console.log("   ⏱️ Pausing 15 seconds between batches to respect API limits...");
                    await delay(15000);
                }

            } catch (error) {
                console.error(`   ⚠️ Failed to process batch starting at index ${i}:`, error.message);
            }
        }
        // --- END BATCH LOGIC ---

        if (dbRecords.length > 0) {
            if (! await saveRecordsToDb(dbRecords, repoId)) {
                console.log("Unable to Store the Chunks in DB");
                return;
            }
            console.log(`🍃 Saved ${dbRecords.length} chunks to MongoDB.`);
        }

        if (pineconeVectors.length > 0) {
            if (!await saveVectorsToPinecone(pineconeVectors)) {
                console.log("Unable to Store the Chunks in the Vector DB");
                return;
            }
        }

        // --- 📝 AUTO-DOCUMENTER LOGIC ---
        console.log("📝 Synthesizing Master Documentation...");


        // //COMMENT FROM HERE
        // if (repoInfo.finalDocumentation) {
        //     return res.json({
        //         message: "Code successfully analyzed and documented!",
        //         totalChunksCreated: repoInfo.chunks.length,
        //         masterDocumentation: repoInfo.finalDocumentation
        //     });
        // }
        // const dbRecords = repoInfo.chunks; //just for testing REMOVE IT!!!!!!!!!!
        // // TO HERE

        const allExplanations = dbRecords.map(record => `File: ${record.filePath}\nWhat it does: ${record.aiDocumentation}`).join('\n\n');

        const masterDoc = await generateMasterRepoDoc(allExplanations, url);
        await updateRepoDocumentation(repoId, masterDoc);

        console.log("✨ Full Ingestion, Storage, and Documentation Complete!");

        res.json({
            message: "Code successfully analyzed and documented!",
            totalChunksCreated: dbRecords.length,
            masterDocumentation: masterDoc
        });

    } catch (error) {
        console.error("❌ System Error:", error);
        res.status(500).json({ error: "Failed to process repository" });
    }
}