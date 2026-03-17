import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";

export const listMeetings = async (req: Request, res: Response) => {
    try {
        await connect();
        let userId;
        try {
            userId = getDataFromToken(req);
        } catch (tokenError: any) {
            return res.status(401).json({ error: "Unauthorized: Please log in again" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Ensure Meeting model is registered
        await Meeting.findOne().limit(1);

        const participantEntries = await Participant.find({ userId: userId }).populate("meetingId");

        const meetingsProp = await Promise.all(participantEntries.map(async (entry: any) => {
            const meeting = entry.meetingId;
            if (!meeting) return null;

            if (meeting.status === 'upcoming' && new Date(meeting.startTime) <= new Date()) {
                meeting.status = 'active';
                try {
                    await meeting.save();
                } catch (saveError: any) {}
            }

            return {
                _id: meeting._id,
                title: meeting.title,
                meetingCode: meeting.meetingCode,
                createdAt: meeting.createdAt,
                startTime: meeting.startTime,
                status: meeting.status,
                myRole: entry.role
            };
        }));

        const meetings = meetingsProp.filter(item => item !== null)
            .sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

        return res.status(200).json({
            success: true,
            meetings
        });

    } catch (error: any) {
        console.error("Meeting list API error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};
