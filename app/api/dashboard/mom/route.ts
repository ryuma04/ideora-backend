import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import Participant from "@/backend/models/participantModel";
import Meeting from "@/backend/models/meetingModel";
import MeetingResource from "@/backend/models/meetingResourcesModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import axios from 'axios';
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const getDashboardMOM = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Find all meetings where the user was a participant or host
        // Participant collection covers both host and attendees
        const participantEntries = await Participant.find({ userId: userId }).populate("meetingId");

        const momDocumentsProp = await Promise.all(participantEntries.map(async (entry: any) => {
            const meeting = entry.meetingId;
            if (!meeting) return null;
            // Only show MoM for ended meetings
            if (meeting.status !== 'ended') return null;

            // Fetch MoM from meetingresources
            const resource = await MeetingResource.findOne({ meetingId: meeting._id });

            if (!resource || !resource.momReportUrl) return null;

            return {
                _id: meeting._id,
                title: meeting.title,
                meetingCode: meeting.meetingCode,
                endedAt: meeting.endedAt || meeting.createdAt,
                momUrl: resource.momReportUrl,
                myRole: entry.role
            };
        }));

        const momDocuments = momDocumentsProp
            .filter(item => item !== null)
            .sort((a: any, b: any) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

        return res.status(200).json({
            success: true,
            momDocuments
        });

    } catch (error: any) {
        console.error("Error fetching MOM documents:", error);
        return res.status(500).json({ error: error.message });
    }
};

export const downloadMoM = async (req: Request, res: Response) => {
    try {
        const { url, filename } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: "URL is required" });
        }

        console.log(`Generating professional signed URL for: ${url}`);

        let downloadUrl = url;
        try {
            // Correctly parse the public ID from the Cloudinary URL
            const parts = url.split('/raw/upload/');
            if (parts.length >= 2) {
                const pathParts = parts[1].split('/');
                // Remove the version (v12345/) if it's the first part of the path
                const publicId = pathParts[0].startsWith('v') && /^\d+$/.test(pathParts[0].substring(1)) 
                    ? pathParts.slice(1).join('/') 
                    : pathParts.join('/');
                
                // Generate a Signed Delivery URL with the 'upload' type
                // This is the "Master Key" that bypasses security restrictions
                downloadUrl = cloudinary.url(publicId, {
                    resource_type: 'raw',
                    type: 'upload',
                    sign_url: true,
                    secure: true
                });
            }
        } catch (e) {
            console.warn("Professional signing failed, using original URL.");
        }

        console.log(`Signed Download URL: ${downloadUrl}`);

        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            headers: {
                'Referer': '', // Still strip referer as a double-layer of safety
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 20000 
        });

        const safeFilename = filename ? `${String(filename).replace(/[^a-z0-9]/gi, '_')}.pdf` : 'MOM_Report.pdf';
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

        response.data.on('error', (err: any) => {
            console.error('Stream error during MoM download:', err);
            if (!res.headersSent) res.status(500).send('Error downloading file');
        });

        response.data.pipe(res);
        res.on('close', () => { response.data.destroy(); });

    } catch (error: any) {
        console.error("Error proxying download:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Access Denied", 
                message: "Cloudinary rejected the download even with a signature. Please check 'Settings > Security' in Cloudinary to ensure 'PDF delivery' is enabled." 
            });
        }
    }
};
