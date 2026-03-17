import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import MeetingResource from "@/backend/models/meetingResourcesModel";
import Meeting from "@/backend/models/meetingModel";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cleanupAudio = async (req: Request, res: Response) => {
    try {
        await connect();

        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        const endedMeetings = await Meeting.find({
            status: "ended",
            endedAt: { $lt: sixHoursAgo }
        }).select("_id");

        const endedMeetingIds = endedMeetings.map((m: any) => m._id);

        if (endedMeetingIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No audio files to clean up",
                deletedCount: 0
            });
        }

        const resourcesWithAudio = await MeetingResource.find({
            meetingId: { $in: endedMeetingIds },
            audioRecordingUrl: { $ne: "" },
            audioPublicId: { $ne: "" }
        });

        let deletedCount = 0;
        for (const resource of resourcesWithAudio) {
            try {
                await cloudinary.uploader.destroy(resource.audioPublicId, {
                    resource_type: "video"
                });
                resource.audioRecordingUrl = "";
                resource.audioPublicId = "";
                await resource.save();
                deletedCount++;
            } catch (err) {
                console.error(`Failed to delete audio for meeting ${resource.meetingId}:`, err);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Cleaned up ${deletedCount} audio files`,
            deletedCount
        });

    } catch (error: any) {
        console.error("Audio cleanup error:", error);
        return res.status(500).json({ error: "Failed to clean up audio files" });
    }
};
