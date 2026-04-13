// src/controllers/repo.controller.js
import crypto from 'crypto';
import {
    createRepoDoc,
    getChunksByRepoId,
    getRepoByUrl,
    saveRecordsToDb,
    updateRepoStatus,
    deleteChunksFromDb
} from '../services/mongoService.js';
import { extractOwnerAndRepo, filterRelevantFiles, minifyCodeForAI } from '../utils/githubHelper.js';
import { fetchRawCodeFiles, fetchRepoTree } from '../services/githubService.js';
import { chunkCodeIntelligently } from '../services/chunkingService.js';
import { generateDocsForBatch, generateEmbedding, generateReadme } from '../services/aiService.js';
import {
    saveVectorsToPinecone,
    deleteVectorsFromPinecone
} from '../services/pineconeService.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const activeLocks = new Set();

export const repoIngest = async (req, res) => {
    try {
        const { url } = req.body;
        const githubToken = req.token;
        if (!url) return res.status(400).json({ error: "Repository URL is required." });

        if (activeLocks.has(url)) {
            console.log(`   🛡️ Mutex Lock Triggered: Blocked simultaneous request for ${url}`);
            return res.status(429).json({ error: "Request already processing." });
        }
        activeLocks.add(url);

        const existingRepo = await getRepoByUrl(url);
        if (existingRepo && existingRepo.status === 'processing') {
            activeLocks.delete(url);
            console.log(`   🛡️ DB Lock Triggered: Repo is already being analyzed.`);
            return res.status(429).json({ error: "This repository is currently being analyzed. Please wait." });
        }

        const { owner, repo } = extractOwnerAndRepo(url);

        console.log(`   🔍 Verifying repository on GitHub: ${owner}/${repo}...`);
        const { repoData, branch } = await fetchRepoTree(owner, repo);
        if (!repoData || !branch) {
            activeLocks.delete(url);
            return res.status(404).json({ error: "Repository not found. It may be private or invalid." });
        }
        console.log(`   ✅ GitHub Verification Passed. Branch: ${branch}`);

        let repoId;
        if (existingRepo) {
            repoId = existingRepo._id;
            console.log(`   ♻️ Existing repo detected. Changing status to 'processing' for updates...`);
            await updateRepoStatus(repoId, 'processing');
        } else {
            console.log(`   💾 Initializing new database record...`);
            const repoInfo = await createRepoDoc(url);
            repoId = repoInfo._id;
        }

        if (!repoId) {
            activeLocks.delete(url);
            return res.status(500).json({ error: "Unable to initialize DB for this repository." });
        }

        const cleanFilesList = filterRelevantFiles(repoData.tree);
        console.log(`   🧹 Filtered repository down to ${cleanFilesList.length} files.`);

        const finalCodebase = await fetchRawCodeFiles(owner, repo, cleanFilesList, branch, githubToken);

        activeLocks.delete(url);
        res.status(200).json({ files: finalCodebase });

        await processHeavyAnalysisInBackground(finalCodebase, url, repoId)
            .catch(err => {
                console.error("❌ Fatal Background Error:", err);
                updateRepoStatus(repoId, 'failed');
            });

    } catch (error) {
        activeLocks.delete(req.body?.url);
        console.error("❌ Controller Catch Error:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || "An unexpected error occurred." });
        }
    }
};

export const getRepoStatus = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: "Repository URL is required." });

        const repo = await getRepoByUrl(url);
        if (!repo) return res.status(404).json({ error: "Repository not found in database." });

        return res.status(200).json({ status: repo.status });
    } catch (error) {
        console.error("❌ Error fetching repo status:", error.message);
        return res.status(500).json({ error: "Failed to fetch repository status." });
    }
};

export const createReadme = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "Repository URL is required." });

        // 1. Get the Repo ID
        const repo = await getRepoByUrl(url);
        if (!repo || repo.status !== 'ready') {
            return res.status(400).json({ error: "Repository is not fully ingested yet." });
        }

        // 2. Fetch all chunks from MongoDB for this repo
        const chunks = await getChunksByRepoId(repo._id);
        if (!chunks || chunks.length === 0) {
            return res.status(400).json({ error: "No analyzed code found for this repository." });
        }

        // 3. Compile just the AI explanations to save tokens
        const compiledExplanations = chunks
            .map(chunk => `File: ${chunk.filePath}\nSummary: ${chunk.aiDocumentation}`)
            .join('\n\n---\n\n');

        console.log(`\n📝 Generating README for ${url} using ${chunks.length} file summaries...`);

        // 4. Call your AI Prompt
        const readmeMarkdown = await generateReadme(compiledExplanations, url);

        // 5. Send back to the frontend!
        return res.status(200).json({ readme: readmeMarkdown });

    } catch (error) {
        console.error("❌ Controller Error Generating README:", error.message);
        return res.status(500).json({ error: "Failed to generate README." });
    }
};

async function processHeavyAnalysisInBackground(finalCodebase, url, repoId) {
    let allProjectChunks = [];
    finalCodebase.forEach(file => {
        allProjectChunks.push(...chunkCodeIntelligently(file.content, file.path));
    });

    allProjectChunks.forEach(chunk => {
        chunk.chunkHash = crypto.createHash('sha256').update(chunk.filePath + chunk.content).digest('hex');
    });

    const currentHashes = new Set(allProjectChunks.map(c => c.chunkHash));
    const existingRecords = await getChunksByRepoId(repoId) || [];
    const existingHashes = new Set(existingRecords.map(r => r.chunkHash));

    const chunksToDelete = existingRecords.filter(r => !currentHashes.has(r.chunkHash));
    const mongoIdsToDelete = chunksToDelete.map(r => r._id);
    const pineconeIdsToDelete = chunksToDelete
        .map(r => r.pineconeId)
        .filter(id => id != null) // Removes undefined or null
        .map(String); // Forces them to be strict strings for Pinecone

    let newChunksToProcess = [];
    allProjectChunks.forEach(chunk => {
        if (!existingHashes.has(chunk.chunkHash)) {
            newChunksToProcess.push(chunk);
        }
    });

    console.log(`🔪 Repo total: ${allProjectChunks.length} chunks.`);
    console.log(`   🆕 Delta: ${newChunksToProcess.length} NEW chunks to process.`);
    console.log(`   🗑️ Stale: ${chunksToDelete.length} OLD chunks to delete.`);

    if (pineconeIdsToDelete.length > 0) {
        await deleteVectorsFromPinecone(pineconeIdsToDelete,url);
        console.log(`   🪓 Cleared ${pineconeIdsToDelete.length} stale vectors from Pinecone.`);
    }
    if (mongoIdsToDelete.length > 0) {
        await deleteChunksFromDb(mongoIdsToDelete);
        console.log(`   🧹 Cleared ${mongoIdsToDelete.length} stale chunks from MongoDB.`);
    }

    if (newChunksToProcess.length === 0) {
        await updateRepoStatus(repoId, 'ready');
        console.log("✨ No new code detected. AI analysis skipped. UI Unlocked.");
        return;
    }

    const dbRecord = [];
    const pineconeVector = [];

    const MAX_CHUNKS_PER_BATCH = 40;
    const MAX_CHARS_PER_BATCH = 180000;

    let currentBatch = [];
    let effectiveCharCount = 0;
    let batchIndex = 1;

    let currentMinuteTokens = 0;
    let currentMinuteRequests = 0;
    let windowStartTime = Date.now();

    const processAndStoreBatch = async (batchToProcess) => {

        // 🚨 1. ROBUST RETRY: Text Explanation Generation Loop
        let batchExplanations = [];
        while (batchExplanations.length === 0) {
            batchExplanations = await generateDocsForBatch(batchToProcess);

            if (!batchExplanations || batchExplanations.length === 0) {
                console.log(`   ⚠️ Batch explanation generation failed. Waiting 15s and retrying the whole batch...`);
                await delay(15000); // Cooldown to respect API before retrying the exact same batch
            }
        }

        for (let j = 0; j < batchToProcess.length; j++) {
            const batchChunk = batchToProcess[j];
            const explanationObj = batchExplanations?.find(exp => exp.id === batchChunk.id);
            const explanation = explanationObj ? explanationObj.explanation : "Analyzed code chunk.";

            const textToEmbed = `Code:\n${batchChunk.content}\n\nExplanation:\n${explanation}`;
            const estimatedTokens = Math.ceil(textToEmbed.length / 4);

            let embeddingArray = null;

            // 🚨 2. ROBUST RETRY: Embedding Generation Loop with Token Accounting
            while (!embeddingArray) {
                const now = Date.now();

                if (now - windowStartTime >= 60000) {
                    currentMinuteTokens = 0;
                    currentMinuteRequests = 0;
                    windowStartTime = now;
                }

                if (currentMinuteTokens + estimatedTokens > 28000 || currentMinuteRequests >= 95) {
                    console.log(`\n   🛑 Embedding limit reached (${currentMinuteTokens} tokens, ${currentMinuteRequests} reqs).`);
                    console.log(`   ⏳ Cooling down for 60 seconds...\n`);
                    await delay(60000);
                    currentMinuteTokens = 0;
                    currentMinuteRequests = 0;
                    windowStartTime = Date.now();
                }

                // We ALWAYS count the tokens/requests BEFORE making the call.
                // If it fails, the tokens are accurately consumed for this minute's quota.
                currentMinuteTokens += estimatedTokens;
                currentMinuteRequests += 1;

                console.log(`   🧬 Generating Embedding for new chunk ${j + 1}/${batchToProcess.length} (Est. Tokens: ${estimatedTokens})...`);
                embeddingArray = await generateEmbedding(textToEmbed);

                if (!embeddingArray) {
                    console.log(`   ⚠️ Embedding failed for chunk ${j + 1}. Retrying in 10s...`);
                    await delay(10000); // Minor backoff before looping back to try again
                }
            }

            // Once we successfully break out of the while loop, save it!
            const uniqueId = batchChunk.chunkHash;

            dbRecord.push({
                repoId: repoId,
                filePath: batchChunk.filePath,
                type: batchChunk.type,
                content: batchChunk.content,
                aiDocumentation: explanation,
                chunkHash: batchChunk.chunkHash,
                pineconeId: uniqueId
            });

            pineconeVector.push({
                id: String(uniqueId),
                values: Array.from(embeddingArray),
                metadata: { filePath: batchChunk.filePath, repoUrl: url }
            });
        }
    };

    for (let i = 0; i < newChunksToProcess.length; i++) {
        const chunk = newChunksToProcess[i];
        const minifiedCode = minifyCodeForAI(chunk.content);
        chunk.minifiedContent = minifiedCode;
        chunk.id = currentBatch.length;

        const typeLength = chunk.type ? chunk.type.length : 0;
        const pathLength = chunk.filePath ? chunk.filePath.length : 0;

        const currentChunkLength = minifiedCode.length + currentBatch.length + typeLength + pathLength + 4;

        if (currentBatch.length > 0 && (currentBatch.length >= MAX_CHUNKS_PER_BATCH ||
            (effectiveCharCount + currentChunkLength) > MAX_CHARS_PER_BATCH
        )) {
            console.log(`\n📦 Firing Batch ${batchIndex} with ${currentBatch.length} chunks...`);
            try {
                await processAndStoreBatch(currentBatch);
                console.log("   ⏱️ Pausing 15 seconds to respect AI Text Model limits...");
                await delay(15000);
            } catch (error) {
                console.error(`⚠️ Failed Batch ${batchIndex}:`, error);
            }

            currentBatch = [];
            effectiveCharCount = 0;
            batchIndex++;
            chunk.id = currentBatch.length;
        }

        currentBatch.push(chunk);
        effectiveCharCount += currentChunkLength;

        if (i === newChunksToProcess.length - 1 && currentBatch.length > 0) {
            console.log(`\n📦 Firing Final Batch ${batchIndex}...`);
            try {
                await processAndStoreBatch(currentBatch);
            } catch (error) {
                console.error(`⚠️ Failed Final Batch ${batchIndex}:`, error);
            }
        }
    }

    if (dbRecord.length > 0) {
        await saveRecordsToDb(dbRecord, repoId);
        console.log(`🍃 Saved ${dbRecord.length} NEW chunks to MongoDB.`);
    }

    if (pineconeVector.length > 0) {
        await saveVectorsToPinecone(pineconeVector,url);
        console.log(`🌲 Uploaded NEW vectors to Pinecone.`);
    }

    await updateRepoStatus(repoId, 'ready');
    console.log("✨ Background Delta Update Finished! UI Unlocked.");
}