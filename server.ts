import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connect from './dbConfig/dbConfig';
import { connectRedis } from './dbConfig/redisDbConfig';
import apiRouter from './app/api/router';

// (dotenv loaded via import)

import path from 'path';
const app = express();

// Serve static files from the 'public' directory
app.use('/mom_reports', express.static(path.join(__dirname, 'public/mom_reports')));

// Middleware
app.use(cors({
    origin: process.env.DOMAIN || 'https://ideora-h6ou.vercel.app',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Connect MongoDB using the existing config
connect().catch(err => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
});

// Connect Redis
connectRedis().catch(err => {
    console.error("Failed to connect to Redis:", err);
});

// Mount your API routes
app.use('/api', apiRouter);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

//verifying whether the server is running or not
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Ideora Backend Server is running' });
});