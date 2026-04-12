import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        console.log("verifyEmail route hit");
        await connect();
        const { token } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Token missing" });
        }

        const user = await User.findOne({
            isVerifyToken: token,
            isVerifyTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        user.isVerified = true;
        user.isVerifyToken = undefined;
        user.isVerifyTokenExpire = undefined;

        await user.save();
        console.log("request token:", token);

        return res.status(200).json({ message: "Email verified successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Email verification failed" });
    }
};