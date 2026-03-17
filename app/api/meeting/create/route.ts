import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";
import User from "@/backend/models/usersModel";
import MeetingResource from "@/backend/models/meetingResourcesModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";

export const createMeeting = async (req: Request, res: Response) => {
    try {
        await connect();
        let userId;
        try {
            userId = getDataFromToken(req);
        } catch (error: any) {
            return res.status(401).json({ error: "Unauthorized: Please log in again" });
        }

        const { title, description, isInstant, meetingCode, isWaitingRoomEnabled, startTime } = req.body;

        if (!title || !meetingCode) {
            return res.status(400).json({ error: "Title and meeting code are required" });
        }

        const existingMeeting = await Meeting.findOne({ meetingCode });
        if (existingMeeting) {
            return res.status(400).json({ error: "Meeting code already exists, please try again" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const newMeeting = new Meeting({
            title,
            description,
            meetingCode,
            createdBy: userId,
            isInstant: isInstant || false,
            startTime: isInstant ? Date.now() : startTime,
            status: isInstant ? "active" : "upcoming",
            isWaitingRoomEnabled: isWaitingRoomEnabled || false,
            participants: []
        });

        const savedMeeting = await newMeeting.save();

        const hostParticipant = new Participant({
            meetingId: savedMeeting._id,
            userId: userId,
            name: user.username,
            role: "host",
            joinedAt: Date.now()
        });

        const savedParticipant = await hostParticipant.save();
        savedMeeting.participants.push(savedParticipant._id);
        await savedMeeting.save();

        await new MeetingResource({ meetingId: savedMeeting._id }).save();

        return res.status(200).json({
            message: "Meeting created successfully",
            success: true,
            meetingCode: savedMeeting.meetingCode,
            meetingId: savedMeeting._id
        });

    } catch (error: any) {
        console.error("Error creating meeting:", error);
        return res.status(500).json({ error: error.message });
    }
};
