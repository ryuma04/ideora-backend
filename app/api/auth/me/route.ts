import { Request, Response } from "express";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import User from "@/backend/models/usersModel";
import connect from "@/backend/dbConfig/dbConfig";

export const getMe = async (req: Request, res: Response) => {
    try {
        await connect();
        const id = getDataFromToken(req);
        const data = await User.findOne({ _id: id }).select("-password");
        if (!data) {
            return res.status(400).json(
                { message: "User not found" }
            );
        } else {
            return res.status(200).json({
                message: "User found",
                data: data
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};