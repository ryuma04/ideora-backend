import 'dotenv/config';
import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT || 6379)
    }
});

client.on('error', err => console.log('Redis Client Error', err));

export async function connectRedis() {
    try {
        if (!client.isOpen) {
            await client.connect();
            console.log("Connected with Redis successfully");
        }
    } catch (error) {
        console.error("Redis connection error:", error);
    }
}

export default client;
