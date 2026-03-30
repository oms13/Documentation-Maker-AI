import express from "express";
import dotenv from "dotenv";
import cors from "cors"

import connectDB from "./config/db.js";
import repoRoutes from "./routes/repo.route.js";
import chatRoute from "./routes/chat.route.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/repo', repoRoutes);
app.use('/api/chat',chatRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 