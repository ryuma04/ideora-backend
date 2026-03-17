import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import MeetingResource from "@/backend/models/meetingResourcesModel";
import Meeting from "@/backend/models/meetingModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadReport = async (req: Request & { file?: any }, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No PDF file provided" });
        }

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

        const buffer = file.buffer;

        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "meeting_reports",
                    resource_type: "raw",
                    use_filename: true,
                    unique_filename: true,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result as UploadApiResponse);
                }
            ).end(buffer);
        });

        await MeetingResource.findOneAndUpdate(
            { meetingId: meeting._id },
            { brainstormingReportUrl: uploadResult.secure_url },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            message: "Report uploaded successfully",
            success: true,
            reportUrl: uploadResult.secure_url,
        });

    } catch (error: any) {
        console.error("Report upload error:", error);
        return res.status(500).json({ error: "Report upload failed" });
    }
};
