import { Request, Response } from "express";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";
import { RoomServiceClient } from "livekit-server-sdk";
import redisClient from "@/backend/dbConfig/redisDbConfig";

export const endMeeting = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId } = req.body;
        if (!meetingId) {
            return res.status(400).json({ error: "Meeting ID is required" });
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

        if (meeting.createdBy.toString() !== userId) {
            return res.status(403).json({ error: "Only the host can end the meeting" });
        }

        meeting.status = "ended";
        meeting.endedAt = Date.now();
        await meeting.save();

        await Participant.updateMany(
            { meetingId: meeting._id, leftAt: { $exists: false } },
            { $set: { leftAt: Date.now() } }
        );

        // Clear Redis cache to free up memory immediately
        if (redisClient.isOpen) {
            try {
                const actualMeetingId = meeting._id.toString();
                await redisClient.del(`canvas:${actualMeetingId}`);
                await redisClient.del(`mindmapping:${actualMeetingId}`);
                await redisClient.del(`stickyNotes:${actualMeetingId}`);
                await redisClient.del(`swot:${actualMeetingId}`);
                
                // Also clear by meetingCode just in case any keys were saved that way
                await redisClient.del(`canvas:${meeting.meetingCode}`);
                await redisClient.del(`mindmapping:${meeting.meetingCode}`);
                await redisClient.del(`stickyNotes:${meeting.meetingCode}`);
                await redisClient.del(`swot:${meeting.meetingCode}`);
            } catch (redisError) {
                console.warn("Failed to clear Redis cache on meeting end:", redisError);
            }
        }

        const roomService = new RoomServiceClient(
            process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
            process.env.LIVEKIT_API_KEY || "",
            process.env.LIVEKIT_API_SECRET || ""
        );

        try {
            await roomService.deleteRoom(meeting._id.toString());
        } catch (lkError) {
            console.warn("LiveKit Room delete error:", lkError);
        }

        return res.status(200).json({ success: true, message: "Meeting ended successfully" });

    } catch (error: any) {
        console.error("End Meeting Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
