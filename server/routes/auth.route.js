// server/routes/auth.routes.js
import express from 'express';
import { githubOAuth } from '../controllers/auth.controller.js';

const router = express.Router();

// Route: POST /api/auth/github
router.post('/github', githubOAuth);

export default router;