import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";

export const getAttendance = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId } = req.params;

        let meeting;
        if (meetingId.match(/^[0-9a-fA-F]{24}$/)) {
            meeting = await Meeting.findById(meetingId);
        }
        if (!meeting) {
            meeting = await Meeting.findOne({ meetingCode: meetingId });
        }
        if (!meeting) {
            return res.status(404).json({ error: `Meeting not found for ID: ${meetingId}` });
        }

        if (meeting.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Forbidden: Only the host can view attendance" });
        }

        const participants = await Participant.find({ meetingId: meeting._id, isGuest: { $ne: true } })
            .populate({
                path: 'userId',
                select: 'email username'
            })
            .sort({ joinedAt: 1 })
            .lean();

        const attendanceData = participants.map((p: any) => {
            return {
                _id: p._id,
                name: p.name || (p.userId ? p.userId.username : "Unknown"),
                email: p.userId ? p.userId.email : "N/A",
                role: p.role,
                joinedAt: p.joinedAt,
                leftAt: p.leftAt || meeting.endedAt || new Date(),
                isGuest: !!p.isGuest
            };
        });

        return res.status(200).json({
            success: true,
            meeting: {
                title: meeting.title,
                startTime: meeting.startTime,
                endedAt: meeting.endedAt
            },
            attendance: attendanceData
        });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
