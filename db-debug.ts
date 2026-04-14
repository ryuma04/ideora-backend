import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI is not defined in .env file");
}

const schema = new mongoose.Schema({
    meetingId: String,
    toolType: String,
    dataState: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
}, { collection: "brainstormingupdates" });

const BrainstormingUpdate =
    mongoose.models.BrainstormingUpdate ||
    mongoose.model('BrainstormingUpdate', schema);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to DB');

        const updates = await BrainstormingUpdate
            .find()
            .sort({ lastUpdated: -1 })
            .limit(10);

        console.log("Recent DB updates:");

        updates.forEach(u => {
            console.log(`Tool: ${u.toolType}, Meeting: ${u.meetingId}`);

            if (u.dataState) {
                if (Array.isArray(u.dataState.elements)) {
                    console.log(`  Elements count: ${u.dataState.elements.length}`);
                }

                if (Array.isArray(u.dataState.nodes)) {
                    console.log(`  Nodes count: ${u.dataState.nodes.length}`);
                }

                if (u.toolType === "swot") {
                    console.log(`  SWOT Object:`, Object.keys(u.dataState));
                }
            } else {
                console.log("  No dataState!");
            }
        });

        mongoose.connection.close();
    })
    .catch((err) => {
        console.error("❌ DB Connection Error:", err);
    });