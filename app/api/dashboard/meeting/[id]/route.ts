import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import BrainstormingUpdate from "@/backend/models/brainstormingUpdateModel";
import Meeting from "@/backend/models/meetingModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";

export const getDashboardMeetingDetails = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const meetingId = req.params.id;

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        const updates = await BrainstormingUpdate.find({ meetingId });

        const formattedDocs = updates.reduce((acc, doc) => {
            acc[doc.toolType] = doc.dataState;
            return acc;
        }, {} as Record<string, any>);

        return res.status(200).json({
            success: true,
            meeting: {
                title: meeting.title,
                endedAt: meeting.endedAt || (meeting as any).createdAt
            },
            docs: formattedDocs
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
