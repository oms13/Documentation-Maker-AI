import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    filePath: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    aiDocumentation: {
        type: String,
        required: true
    },
    pineconeId: {
        type: String,
        required: true
    },
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repo'
    }
}, { timestamps: true });

export const Chunk = mongoose.model('Chunk', chunkSchema);