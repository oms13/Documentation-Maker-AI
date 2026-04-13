// src/services/mongoService.js
import { Repo } from "../models/Repo.js";
import { Chunk } from "../models/Chunk.js";

// Add to mongoService.js
export const createRepoDoc = async (url) => {
    try {
        const repo = await Repo.findOneAndUpdate(
            { url: url },
            { 
                $setOnInsert: { url: url },
                $set: { status: 'processing' } // Safely reset status
            },
            { new: true, upsert: true }
        );
        // 🚨 Removed the .populate('chunks') entirely. The Repo no longer holds an array of IDs.
        
        return repo;
    } catch (error) {
        console.error("Error creating repo document:", error.message);
        throw error;
    }
};

// Add this brand new function to the bottom of mongoService.js
export const updateRepoStatus = async (repoId, status) => {
    try {
        return await Repo.findByIdAndUpdate(
            repoId, 
            { status: status }, 
            { new: true }
        );
    } catch (error) {
        console.error("Error updating repo status:", error.message);
        throw error;
    }
};

export const saveRecordsToDb = async (dbRecords) => {
    try {
        // 🚨 Massive performance upgrade: We just insert the chunks!
        // Because `repoId` is already inside every object in `dbRecords`, 
        // we completely deleted the Repo.findByIdAndUpdate($push) logic.
        const insertedChunks = await Chunk.insertMany(dbRecords);
        return insertedChunks;

    } catch (error) {
        console.error("Error saving chunk records:", error.message);
        throw error;
    }
};

// 🚨 NEW: Find the repository database entry by its GitHub URL
export const getRepoByUrl = async (url) => {
    try {
        return await Repo.findOne({ url: url });
    } catch (error) {
        console.error("Error finding repo:", error.message);
        throw error;
    }
};

// 🚨 NEW: Retrieve all analyzed chunks for the Master Doc synthesis
export const getChunksByRepoId = async (repoId) => {
    try {
        // This is lightning fast because we set an index on repoId in the schema
        return await Chunk.find({ repoId: repoId });
    } catch (error) {
        console.error("Error fetching repo chunks:", error.message);
        throw error;
    }
};

export const updateRepoDocumentation = async (repoId, documentation) => {
    try {
        return await Repo.findByIdAndUpdate(
            repoId,
            { masterDocumentation: documentation },
            { new: true }
        );
    } catch (error) {
        console.error("Error updating repo documentation:", error.message);
        throw error;
    }
};

// src/services/mongoService.js

// Add this function at the bottom
export const deleteChunksFromDb = async (chunkIdsArray) => {
    try {
        // $in operator deletes all documents whose _id is inside the array
        await Chunk.deleteMany({ _id: { $in: chunkIdsArray } });
    } catch (error) {
        console.error("Error deleting stale chunks from DB:", error.message);
        throw error;
    }
};