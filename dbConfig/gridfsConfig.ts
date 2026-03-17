// GridFS utility for storing and retrieving audio chunks
// Uses mongoose's built-in GridFS support via GridFSBucket

import mongoose from "mongoose";
import connect from "./dbConfig";

export async function getGridFSBucket(): Promise<mongoose.mongo.GridFSBucket> {
    await connect();
    
    // Wait for the connection to be fully ready
    if (mongoose.connection.readyState !== 1) {
        await new Promise<void>((resolve) => {
            mongoose.connection.once("connected", resolve);
        });
    }

    const db = mongoose.connection.db;
    
    if (!db) {
        // Fallback: re-establish connection and try again
        await mongoose.connect(process.env.MONGODB_URL!);
        const retryDb = mongoose.connection.db;
        if (!retryDb) {
            throw new Error("Database connection not ready - db is undefined");
        }
        return new mongoose.mongo.GridFSBucket(retryDb, {
            bucketName: "audioChunks"
        });
    }

    return new mongoose.mongo.GridFSBucket(db, {
        bucketName: "audioChunks"
    });
}
