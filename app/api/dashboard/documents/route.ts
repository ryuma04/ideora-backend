import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Participant from "@/backend/models/participantModel";
import Meeting from "@/backend/models/meetingModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import BrainstormingUpdate from "@/backend/models/brainstormingUpdateModel";

export const getDashboardDocuments = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const participantEntries = await Participant.find({ userId: userId }).populate("meetingId");

        const documentsProp = await Promise.all(participantEntries.map(async (entry: any) => {
            const meeting = entry.meetingId;
            if (!meeting) return null;
            if (meeting.status !== 'ended') return null;

            const brainstormingDocs = await BrainstormingUpdate.countDocuments({ meetingId: meeting._id });

            if (brainstormingDocs === 0) return null;

            return {
                _id: meeting._id,
                title: meeting.title,
                meetingCode: meeting.meetingCode,
                endedAt: meeting.endedAt || meeting.createdAt,
                documentCount: brainstormingDocs,
                myRole: entry.role
            };
        }));

        const documents = documentsProp
            .filter(item => item !== null)
            .sort((a: any, b: any) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

        return res.status(200).json({
            success: true,
            documents
        });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
