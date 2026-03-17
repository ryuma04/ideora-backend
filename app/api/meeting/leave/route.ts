import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Participant from "@/backend/models/participantModel";

export const leaveMeeting = async (req: Request, res: Response) => {
    try {
        await connect();
        const { meetingId, participantId } = req.body;

        if (!meetingId || !participantId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const participant = await Participant.findOneAndUpdate(
            { _id: participantId, meetingId: meetingId, leftAt: { $exists: false } },
            { $set: { leftAt: new Date() } }
        );

        if (!participant) {
            return res.status(200).json({ success: true, message: "Participant already left or not found" });
        }

        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
