import { Request, Response } from "express";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";

cloudinary.config({
    cloud_name: process.env.CLOCDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getProfile = async (req: Request, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        const user = await User.findOne({ _id: userId }).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            message: "User found",
            data: user,
        });

    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const updateProfileAvatar = async (req: Request & { file?: any }, res: Response) => {
    try {
        await connect();
        const userId = getDataFromToken(req);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No image provided" });
        }

        if (!file.mimetype.startsWith("image/")) {
            return res.status(400).json({ error: "Only images are allowed" });
        }

        const buffer = file.buffer;

        const uploadResult: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: "avatars" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profileImage: uploadResult.secure_url || "" },
            { new: true }
        );

        return res.status(200).json({
            message: "Profile image updated successfully",
            userId: updatedUser?._id,
            success: true,
            imageUrl: updatedUser?.profileImage,
            email: updatedUser?.email
        });

    } catch (error: any) {
        console.error("Profile upload error:", error);
        return res.status(500).json({ error: error.message || "Upload failed" });
    }
};
