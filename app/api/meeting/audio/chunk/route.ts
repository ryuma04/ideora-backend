import { Request, Response } from "express";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import { getGridFSBucket } from "@/backend/dbConfig/gridfsConfig";
import { Readable } from "stream";

export const uploadAudioChunk = async (req: Request & { file?: any }, res: Response) => {
    try {
        const userId = getDataFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { meetingId, chunkIndex } = req.body;
        const file = req.file;

        if (!file || !meetingId || isNaN(parseInt(chunkIndex))) {
            return res.status(400).json({ error: "chunk, meetingId, and chunkIndex are required" });
        }

        const bucket = await getGridFSBucket();
        const buffer = file.buffer;

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        const filename = `${meetingId}_chunk_${String(chunkIndex).padStart(5, "0")}.webm`;
        const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
                meetingId,
                chunkIndex: parseInt(chunkIndex),
                uploadedAt: new Date()
            }
        });

        await new Promise<void>((resolve, reject) => {
            readableStream.pipe(uploadStream)
                .on("finish", resolve)
                .on("error", reject);
        });

        console.log(`Audio chunk ${chunkIndex} saved for meeting ${meetingId}`);

        return res.status(200).json({
            success: true,
            chunkIndex: parseInt(chunkIndex),
            fileId: uploadStream.id.toString()
        });

    } catch (error: any) {
        console.error("Audio chunk upload error:", error);
        return res.status(500).json({ error: "Failed to upload audio chunk" });
    }
};
