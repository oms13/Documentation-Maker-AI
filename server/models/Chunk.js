import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    repoUrl: { type: String, required: true },
    filePath: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true }, // Raw code
    aiDocumentation: { type: String, required: true }, // Gemini's explanation
    pineconeId: { type: String, required: true } // The link to the math vector!
}, { timestamps: true });

export const Chunk = mongoose.model('Chunk', chunkSchema);