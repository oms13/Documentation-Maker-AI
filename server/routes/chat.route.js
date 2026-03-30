import { askCodebase } from "../controllers/chat.controller.js";
import express from 'express';
const router = express.Router();

router.post('/ask', askCodebase);

export default router;