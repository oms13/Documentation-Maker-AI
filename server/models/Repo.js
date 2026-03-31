import mongoose from 'mongoose';

const repoSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    finalDocumentation: {
        type: String
    },
    chunks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chunk'
    }]
}, { timestamps: true });

export const Repo = mongoose.model('Repo', repoSchema);