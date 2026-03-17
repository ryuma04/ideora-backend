import { Request, Response } from "express";

export const logout = async (req: Request, res: Response) => {
    try {
        res.cookie("token", "", {
            httpOnly: true,
            path: "/",
            expires: new Date(0)
        });
        return res.status(200).json({
            message: "Logout successfully",
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: error });
    }
};