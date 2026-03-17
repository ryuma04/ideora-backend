import { Request, Response } from "express";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";

export const getWaitingParticipants = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const meetingId = req.query.meetingId as string;
        if (!meetingId) {
            return res.status(400).json({ error: "meetingId is required" });
        }

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        if (meeting.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the host can view the waiting room" });
        }

        const waitingParticipants = await Participant.find({
            meetingId: meeting._id,
            status: "waiting"
        }).select("_id name joinedAt isGuest guestId");

        return res.status(200).json({ success: true, waitingParticipants });

    } catch (error: any) {
        console.error("Waiting Room GET error:", error);
        return res.status(500).json({ error: error.message });
    }
};

export const updateWaitingStatus = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId, participantId, action } = req.body;

        if (!meetingId || !participantId || !action) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!["admit", "deny"].includes(action)) {
            return res.status(400).json({ error: "Invalid action" });
        }

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        if (meeting.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the host can modify waiting room status" });
        }

        const participant = await Participant.findOne({ _id: participantId, meetingId: meeting._id });
        if (!participant) {
            return res.status(404).json({ error: "Participant not found in this meeting" });
        }

        participant.status = action === "admit" ? "admitted" : "denied";
        await participant.save();

        return res.status(200).json({
            success: true,
            message: `Participant ${action === "admit" ? "admitted" : "denied"} successfully`,
            participantId: participant._id,
            status: participant.status
        });

    } catch (error: any) {
        console.error("Waiting Room POST error:", error);
        return res.status(500).json({ error: error.message });
    }
};
