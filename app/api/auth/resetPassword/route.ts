import { Request, Response } from "express";
import bcrypt from 'bcryptjs';
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";

export const resetPassword = async (req: Request, res: Response) => {
    try {
        await connect();
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: "Invalid request- Token or password not found" });
        }
        const user = await User.findOne({
            forgotPasswordToken: token,
            forgotPasswordTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expire token" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordTokenExpire = undefined;

        await user.save();

        return res.status(200).json({ message: "Password reset successful" });

    } catch (error) {
        console.log("Error", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};