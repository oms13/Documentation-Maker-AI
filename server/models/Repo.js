// src/models/Repo.js
import mongoose from 'mongoose';

const repoSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true, // Ensures we never create two main documents for the same URL
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
    },
    masterDocumentation: {
        type: String,
        default: null, // Populated later if the user requests the Master Doc
    }
}, { timestamps: true });

export const Repo = mongoose.model('Repo', repoSchema);