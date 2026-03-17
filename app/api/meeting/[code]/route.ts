import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Meeting from "@/backend/models/meetingModel";

export const getMeetingByCode = async (req: Request, res: Response) => {
    try {
        await connect();
        const { code } = req.params;

        let meeting;
        if (code.match(/^[0-9a-fA-F]{24}$/)) {
            meeting = await Meeting.findById(code).populate("createdBy", "username email");
        }

        if (!meeting) {
            meeting = await Meeting.findOne({ meetingCode: code })
                .populate("createdBy", "username email");
        }

        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        if (meeting.status === 'upcoming' && new Date(meeting.startTime) <= new Date()) {
            meeting.status = 'active';
            await meeting.save();
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.status(200).json({ success: true, meeting });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
