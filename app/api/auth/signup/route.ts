import { Request, Response } from "express";
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/backend/helpers/mailer";

export const signup = async (req: Request, res: Response) => {
    try {
        await connect();
        console.log("Backend is working");
        const { username, email, password } = req.body;
        console.log(req.body);

        const userExist = await User.findOne({ email });
        if (userExist) {
            return res.status(400).json({ error: "User already exist" });
        }

        const usernameExist = await User.findOne({ username });
        if (usernameExist) {
            return res.status(400).json({ error: "Username exist, take a different username" });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPass = await bcryptjs.hash(password, salt);

        const newUser = new User({
            username: username,
            email: email,
            password: hashedPass
        });
        const saved = await newUser.save();

        // Send verification email in background (don't block the response)
        console.log("Code reached here");
        sendEmail({
            email: newUser.email,
            emailType: "VERIFY_USER",
            userId: (newUser._id as any).toString()
        }).catch(err => console.error("Failed to send verification email:", err));

        if (saved) {
            return res.status(200).json({ message: "User entered successfully" });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
