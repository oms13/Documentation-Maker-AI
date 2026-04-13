import express from "express";
import {/* generateMasterDoc,*/ createReadme, getRepoStatus, repoIngest } from "../controllers/repo.controller.js";
import { extractAuthToken, validateGithubUrl } from "../middleware/repo.middleware.js";
const router = express.Router();

router.post("/ingest", validateGithubUrl, extractAuthToken, repoIngest);
router.get('/status', getRepoStatus);
// router.post('/generate-docs', generateMasterDoc);
router.post('/generate-readme', createReadme);

export default router;