import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import BrainstormingUpdate from "@/backend/models/brainstormingUpdateModel";
import redisClient from "@/backend/dbConfig/redisDbConfig";
import Meeting from "@/backend/models/meetingModel";

export const getMindmapState = async (req: Request, res: Response) => {
    try {
        await connect();
        const meetingId = req.query.meetingId as string;

        if (!meetingId) {
            return res.status(400).json({ error: "Meeting ID is required" });
        }

        const redisKey = `mindmap:${meetingId}`;

        let actualMeetingId = meetingId;
        if (!meetingId.match(/^[0-9a-fA-F]{24}$/)) {
            const meetingRow = await Meeting.findOne({ meetingCode: meetingId });
            if (meetingRow) actualMeetingId = meetingRow._id.toString();
        }

        if (redisClient.isOpen) {
            const cachedState = await redisClient.get(redisKey);
            if (cachedState) {
                return res.status(200).json({
                    source: "redis",
                    state: JSON.parse(cachedState),
                });
            }
        }

        const dbMindmap = await BrainstormingUpdate.findOne({ meetingId: actualMeetingId, toolType: "mindmap" });

        if (dbMindmap && dbMindmap.dataState) {
            if (redisClient.isOpen) {
                await redisClient.setEx(redisKey, 86400, JSON.stringify(dbMindmap.dataState));
            }

            return res.status(200).json({
                source: "mongodb",
                state: dbMindmap.dataState,
            });
        }

        return res.status(200).json({
            source: "none",
            state: null,
        });

    } catch (error: any) {
        console.error("Error fetching mindmap state:", error);
        return res.status(500).json({ error: "Failed to fetch mindmap state" });
    }
};

export const updateMindmapState = async (req: Request, res: Response) => {
    try {
        await connect();
        const { meetingId, state, action } = req.body;

        if (!meetingId) {
            return res.status(400).json({ error: "Meeting ID is required" });
        }

        const redisKey = `mindmap:${meetingId}`;

        if (action === "save_to_db") {
            let snapshotToSave = state;

            if (!snapshotToSave && redisClient.isOpen) {
                const cachedState = await redisClient.get(redisKey);
                if (cachedState) {
                    snapshotToSave = JSON.parse(cachedState);
                }
            }

            if (!snapshotToSave) {
                return res.status(200).json({ message: "No state found to save", success: true });
            }

            let actualMeetingId = meetingId;
            if (!meetingId.match(/^[0-9a-fA-F]{24}$/)) {
                const meetingRow = await Meeting.findOne({ meetingCode: meetingId });
                if (meetingRow) actualMeetingId = meetingRow._id.toString();
            }

            await BrainstormingUpdate.findOneAndUpdate(
                { meetingId: actualMeetingId, toolType: "mindmap" },
                {
                    dataState: snapshotToSave,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

            return res.status(200).json({
                message: "Mindmap saved to database successfully",
                success: true
            });
        }

        if (state) {
            if (redisClient.isOpen) {
                await redisClient.setEx(redisKey, 86400, JSON.stringify(state));
            } else {
                return res.status(503).json({ error: "Cache server unavailable" });
            }

            return res.status(200).json({
                message: "Mindmap updated in cache",
                success: true
            });
        }

        if (action === "clear_cache") {
            if (redisClient.isOpen) {
                await redisClient.del(redisKey);
            }
            return res.status(200).json({ message: "Memory cleared", success: true });
        }

        return res.status(400).json({ error: "Invalid payload" });

    } catch (error: any) {
        console.error("Error updating mindmap:", error);
        return res.status(500).json({ error: "Failed to update mindmap" });
    }
};

export const deleteMindmapCache = async (req: Request, res: Response) => {
    try {
        const meetingId = req.query.meetingId as string;

        if (!meetingId) {
            return res.status(400).json({ error: "Meeting ID is required" });
        }

        const redisKey = `mindmap:${meetingId}`;

        if (redisClient.isOpen) {
            await redisClient.del(redisKey);
            return res.status(200).json({
                message: "Mindmap cleaned from Redis memory",
                success: true
            });
        }

        return res.status(503).json({ error: "Redis not connected" });

    } catch (error: any) {
        console.error("Error deleting mindmap from Redis:", error);
        return res.status(500).json({ error: "Failed to delete from cache" });
    }
};
