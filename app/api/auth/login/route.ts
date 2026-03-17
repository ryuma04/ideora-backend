import { Request, Response } from "express";
import bcryptjs from 'bcryptjs';
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
    try {
        await connect();
        const { email, password } = req.body;

        const fetchedUser = await User.findOne({ email });
        if (!fetchedUser) {
            return res.status(401).json({ error: "Email doesnt exist" });
        }

        const validPassword = await bcryptjs.compare(password, fetchedUser.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Password is incorrect" });
        }

        if (!fetchedUser.isVerified) {
            return res.status(401).json({ error: "Email is not verified, please verify it first" });
        }

        const tokenData = {
            id: fetchedUser._id,
            username: fetchedUser.username
        };

        const token = jwt.sign(tokenData, process.env.JWT_TOKEN!, {
            expiresIn: "1h"
        });

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/"
        });

        return res.status(200).json({ message: "Login successful" });

    } catch (error) {
        return res.status(500).json({ error: "Something went wrong" });
    }
};
