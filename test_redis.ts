import { connectRedis } from './dbConfig/redisDbConfig';
import client from './dbConfig/redisDbConfig';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
    console.log("Starting Redis connection test...");
    try {
        await connectRedis();
        console.log("Is client open?", client.isOpen);
        if (client.isOpen) {
            await client.set('test_key', 'test_value');
            const val = await client.get('test_key');
            console.log("Test key value:", val);
            await client.del('test_key');
            console.log("Test passed!");
        } else {
            console.error("Test failed: Client is not open.");
        }
    } catch (err) {
        console.error("Test error:", err);
    } finally {
        if (client.isOpen) {
            await client.quit();
        }
    }
}

testConnection();
