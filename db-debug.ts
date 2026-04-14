import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://anshahmed2903:kM1aVFTUf1P6iO7q@cluster0.zox2e2g.mongodb.net/test";

const schema = new mongoose.Schema({
    meetingId: String,
    toolType: String,
    dataState: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
}, { collection: "brainstormingupdates" });

const BrainstormingUpdate = mongoose.models.BrainstormingUpdate || mongoose.model('BrainstormingUpdate', schema);

mongoose.connect(MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const updates = await BrainstormingUpdate.find().sort({ lastUpdated: -1 }).limit(10);
    console.log("Recent DB updates:");
    updates.forEach(u => {
        console.log(`Tool: ${u.toolType}, Meeting: ${u.meetingId}`);
        if(u.dataState) {
           if(Array.isArray(u.dataState.elements)) {
               console.log(`  Elements count: ${u.dataState.elements.length}`);
           }
           if(Array.isArray(u.dataState.nodes)) {
               console.log(`  Nodes count: ${u.dataState.nodes.length}`);
           }
           if(u.toolType === "swot") {
               console.log(`  SWOT Object:`, Object.keys(u.dataState));
           }
        } else {
           console.log("  No dataState!");
        }
    });
    mongoose.connection.close();
}).catch(console.error);
