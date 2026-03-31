import { Repo } from "../models/Repo.js";
import { Chunk } from "../models/Chunk.js";

export const createRepoDoc = async (repoUrl) => {
    try {
        const repo = await Repo.findOneAndUpdate(
            { repoUrl },
            { $setOnInsert: { repoUrl } },
            {
                new: true,
                upsert: true
            }
        ).populate('chunks'); // 👈 REMOVE THIS WHEN TESTING DONE

        return repo;
    } catch (error) {
        console.error("Error creating repo document:", error.message);
        throw error;
    }
};

export const saveRecordsToDb = async (dbRecords, repoId) => {
    try {
        const insertedChunks = await Chunk.insertMany(dbRecords);
        const chunkIds = insertedChunks.map(chunk => chunk._id);

        await Repo.findByIdAndUpdate(
            repoId,
            {
                $push: { chunks: { $each: chunkIds } }
            },
            { new: true }
        );

        return insertedChunks;

    } catch (error) {
        console.error("Error saving records:", error.message);
        throw error;
    }
};

export const updateRepoDocumentation = async (repoId, documentation) => {
    try {
        await Repo.findByIdAndUpdate(repoId, { finalDocumentation: documentation });
        console.log("💾 Master Documentation saved to Repo DB.");
        return true;
    } catch (error) {
        console.error("❌ Failed to update Repo documentation:", error);
        return false;
    }
};