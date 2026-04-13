import express from 'express';
import { askCodebase } from "../controllers/chat.controller.js";
const router = express.Router();

router.post('/ask', askCodebase);

export default router;