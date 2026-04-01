import crypto from 'crypto';
import { extractOwnerAndRepo, filterRelevantFiles } from '../utils/githubHelper.js';
import { fetchRawCodeFiles, fetchRepoTree } from '../services/githubService.js';
import { chunkCodeIntelligently } from '../services/astService.js';
import { generateDocForChunk, generateEmbedding, generateMasterRepoDoc } from '../services/aiService.js';
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
        console.log(`🧠 Generating Docs & Embeddings for ${allProjectChunks.length} chunks...`);

        const dbRecords = [];
        const pineconeVectors = [];

        for (let i = 0; i < allProjectChunks.length; i++) {
            const chunk = allProjectChunks[i];
            console.log(`   -> [${i + 1}/${allProjectChunks.length}] Processing: ${chunk.type} in ${chunk.filePath}`);

            try {
                const explanation = await generateDocForChunk(chunk);
                if (!explanation)
                    console.error("Unable to generate Documentation");

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
                        id: uniqueId,
                        values: embeddingArray,
                        metadata: {
                            filePath: chunk.filePath,
                            repoUrl: url
                        }
                    });

                    if (i < allProjectChunks.length - 1) {
                        console.log("      ⏱️ Sleeping for 15 seconds to respect API limits...");
                        await delay(15000);
                    }
                }
            } catch (error) {
                console.error(`      ⚠️ Failed to process chunk in ${chunk.filePath}:`, error.message);
            }
        }

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

        // --- 📝 NEW AUTO-DOCUMENTER LOGIC ---
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