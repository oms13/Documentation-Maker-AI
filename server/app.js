import express from "express";
import dotenv from "dotenv";
import cors from "cors"

import connectDB from "./config/db.js";
import repoRoutes from "./routes/repo.route.js";
import chatRoute from "./routes/chat.route.js";
import authRoutes from "./routes/auth.route.js"

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/repo', repoRoutes);
app.use('/api/chat',chatRoute);
app.use('/api/auth', authRoutes);

export default app;