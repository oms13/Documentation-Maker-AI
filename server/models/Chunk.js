// src/models/Chunk.js
import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repo',
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    type: {
        type: String, // e.g., 'Function', 'Class', 'Snippet'
        default: 'CodeBlock'
    },
    content: {
        type: String,
        required: true,
    },
    aiDocumentation: {
        type: String, // The generated 1-2 sentence explanation
        required: true,
    },
    pineconeId: {
        type: String, // Links this MongoDB text record to the exact vector in Pinecone
        required: true,
        unique: true,
    },
    chunkHash: {
        type: String, // 🚨 THE DELTA LOCK: Used to skip re-analyzing unchanged code
        required: true,
    }
}, { timestamps: true });

// Optional but highly recommended: Add a compound index to make searching crazy fast
chunkSchema.index({ repoId: 1, chunkHash: 1 });
export const Chunk = mongoose.model('Chunk', chunkSchema);
