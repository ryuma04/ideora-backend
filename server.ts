import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connect from './dbConfig/dbConfig';
import { connectRedis } from './dbConfig/redisDbConfig';
import apiRouter from './app/api/router';

// (dotenv loaded via import)

const app = express();

// Middleware
app.use(cors({
    origin: process.env.DOMAIN || 'http://localhost:3000',
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Ideora Backend Server is running' });
});