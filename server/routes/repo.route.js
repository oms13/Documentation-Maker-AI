import express from "express";
import { repoIngest } from "../controllers/repo.controller.js";
const router = express.Router();

router.post('/ingest',repoIngest);

export default router;