import { Request, Response } from "express";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import mongoose from "mongoose";
import connect from "@/backend/dbConfig/dbConfig";
import MeetingResource from "@/backend/models/meetingResourcesModel";
import Meeting from "@/backend/models/meetingModel";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const finalizeAudio = async (req: Request, res: Response) => {
    try {
        await connect();

        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId } = req.body;
        if (!meetingId) {
            return res.status(400).json({ error: "meetingId is required" });
        }

        let meeting;
        if (meetingId.match(/^[0-9a-fA-F]{24}$/)) {
            meeting = await Meeting.findById(meetingId);
        }
        if (!meeting) {
            meeting = await Meeting.findOne({ meetingCode: meetingId });
        }
        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        const actualMeetingId = meeting._id.toString();

        const db = mongoose.connection.db;
        if (!db) {
            return res.status(500).json({ error: "Database connection not ready" });
        }

        const bucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: "audioChunks"
        });

        const files = await bucket.find(
            { "metadata.meetingId": meetingId },
            { sort: { "metadata.chunkIndex": 1 } }
        ).toArray();

        if (files.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No audio chunks to process",
                audioUrl: ""
            });
        }

        const chunkBuffers: Buffer[] = [];
        for (const file of files) {
            const downloadStream = bucket.openDownloadStream(file._id);
            const chunks: Buffer[] = [];

            await new Promise<void>((resolve, reject) => {
                downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
                downloadStream.on("end", () => resolve());
                downloadStream.on("error", reject);
            });

            chunkBuffers.push(Buffer.concat(chunks));
        }

        const finalBuffer = Buffer.concat(chunkBuffers);

        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "meeting_audio",
                    resource_type: "video",
                    format: "webm",
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result as UploadApiResponse);
                }
            ).end(finalBuffer);
        });

        const resource = await MeetingResource.findOneAndUpdate(
            { meetingId: meeting._id },
            {
                audioRecordingUrl: uploadResult.secure_url,
                audioPublicId: uploadResult.public_id
            },
            { upsert: true, new: true }
        );

        // --- Trigger AI MoM Agent ---
        try {
            const axios = require('axios');
            // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
            const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/process-meeting";

            console.log(`Triggering AI Service at ${aiServiceUrl} for meeting ${actualMeetingId}`);

            axios.post(aiServiceUrl, {
                meetingId: actualMeetingId,
                audioUrl: uploadResult.secure_url,
                brainstormingUrl: resource.brainstormingReportUrl || ""
            }).then((response: any) => {
                console.log("AI Service response:", response.status, response.data);
                console.log("AI Service triggered successfully");
            }).catch((err: any) => {
                console.error("Failed to trigger AI Service at URL:", aiServiceUrl);
                console.error("Error message:", err.message);
                if (err.response) {
                    console.error("Error data:", err.response.data);
                }
            });
        } catch (triggerError) {
            console.warn("AI Service trigger setup error:", triggerError);
        }
        // ---------------------------

        for (const file of files) {
            await bucket.delete(file._id);
        }

        return res.status(200).json({
            success: true,
            message: "Audio finalized successfully and AI processing triggered",
            audioUrl: uploadResult.secure_url
        });


    } catch (error: any) {
        console.error("[Finalize] ERROR:", error.message);
        return res.status(500).json({ error: "Failed to finalize audio", details: error.message });
    }
};
