import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";
import { sendEmail } from "@/backend/helpers/mailer";

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        await connect();
        const { email } = req.body;
        console.log(email);
        if (!email) {
            return res.status(400).json({ error: "Please send the email id" });
        }
        const user = await User.findOne({ email });
        if (user) {
            // Send reset email in background (don't block the response)
            sendEmail({
                email: user.email,
                emailType: "RESET_PASSWORD",
                userId: (user._id as any).toString()
            }).catch(err => console.error("Failed to send reset email:", err));
        }
        return res.status(200).json({
            message: "If an account exist, then reset link has been sent to it"
        });

    }
    catch (error) {
        return res.status(500).json({ error: "Something went wrong" });
    }
};
