import { Request, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { getDataFromToken } from "@/backend/helpers/getDataFromToken";
import connect from "@/backend/dbConfig/dbConfig";
import User from "@/backend/models/usersModel";
import Meeting from "@/backend/models/meetingModel";
import Participant from "@/backend/models/participantModel";

export const getLiveKitToken = async (req: Request, res: Response) => {
    try {
        await connect();
        
        // Authenticate User (or treat as Guest)
        let user: any = null;
        try {
            const userId = getDataFromToken(req);
            if (userId) {
                user = await User.findById(userId);
            }
        } catch (error) {
            // Guest mode
        }

        const isGuest = !user;
        const profileImage = user?.profileImage || "";

        const room = req.query.room as string;
        const requestGuestId = req.query.guestId as string;

        if (!room) {
            return res.status(400).json({ error: "Room is required" });
        }

        let meeting;
        if (room.match(/^[0-9a-fA-F]{24}$/)) {
            meeting = await Meeting.findById(room);
        }

        if (!meeting) {
            meeting = await Meeting.findOne({ meetingCode: room });
        }

        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        const actualRoomName = meeting._id.toString();

        if (meeting.status === "upcoming") {
            meeting.status = "active";
            await meeting.save();
        }

        let guestId = `guest-${Math.random().toString(36).substring(2, 8)}`;
        if (requestGuestId) {
            guestId = requestGuestId;
        }

        const identity = user ? user.username : guestId;
        const name = user ? user.username : `Guest-${guestId.slice(-4)}`;

        let participantId;

        if (isGuest) {
            let existingGuest = null;
            if (requestGuestId) {
                existingGuest = await Participant.findOne({
                    meetingId: meeting._id,
                    guestId: requestGuestId
                });
            }

            if (existingGuest) {
                participantId = existingGuest._id;
            } else {
                const newParticipant = new Participant({
                    meetingId: meeting._id,
                    userId: null,
                    name: name,
                    email: req.query.email || "", // Capture guest email from query if provided
                    role: "attendee",
                    joinedAt: Date.now(),
                    isGuest: true,
                    guestId: guestId,
                    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                    status: meeting.isWaitingRoomEnabled ? "waiting" : "admitted"
                });
                const savedParticipant = await newParticipant.save();
                participantId = savedParticipant._id;
            }

        } else {
            let existingParticipant = await Participant.findOne({
                meetingId: meeting._id,
                userId: user._id
            });

            if (existingParticipant) {
                participantId = existingParticipant._id;
            } else {
                const isHost = meeting.createdBy && meeting.createdBy.toString() === user._id.toString();
                const newParticipant = new Participant({
                    meetingId: meeting._id,
                    userId: user._id,
                    name: name,
                    email: user.email, // Registered user's email
                    role: isHost ? "host" : "attendee",
                    joinedAt: Date.now(),
                    status: (meeting.isWaitingRoomEnabled && !isHost) ? "waiting" : "admitted"
                });
                const savedParticipant = await newParticipant.save();
                participantId = savedParticipant._id;
            }
        }

        const participantDoc = await Participant.findById(participantId);
        const isUserHost = meeting.createdBy && user && meeting.createdBy.toString() === user._id.toString();

        if (meeting.isWaitingRoomEnabled && !isUserHost && participantDoc) {
            if (participantDoc.status === "waiting") {
                return res.status(200).json({ status: "waiting", message: "Waiting for host to admit you..." });
            }
            if (participantDoc.status === "denied") {
                return res.status(403).json({ status: "denied", error: "Entry denied by host." });
            }
        }

        const isAlreadyParticipant = meeting.participants.some((id: any) => id.toString() === participantId.toString());
        if (!isAlreadyParticipant && meeting.participants.length >= 20) {
            return res.status(403).json({ error: "Meeting is full (max 20 participants)" });
        }

        if (!isAlreadyParticipant) {
            meeting.participants.push(participantId);
            await meeting.save();
        }

        const MAX_DURATION_MS = 30 * 60 * 1000;
        const startTime = new Date(meeting.startTime).getTime();
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;

        if (elapsedTime >= MAX_DURATION_MS) {
            return res.status(403).json({ error: "Meeting has ended (30 minute limit exceeded)" });
        }

        const remainingTimeSeconds = Math.floor((MAX_DURATION_MS - elapsedTime) / 1000);

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_WEBSOCKET_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return res.status(500).json({ error: "Server misconfigured" });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: identity,
            name: name,
            ttl: remainingTimeSeconds,
            metadata: JSON.stringify({
                profileImage: profileImage,
                isGuest: isGuest
            })
        });

        at.addGrant({
            roomJoin: true,
            room: actualRoomName,
            canPublish: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();

        const isHostResult = user && meeting.createdBy && meeting.createdBy.toString() === user._id.toString();

        return res.status(200).json({
            token,
            wsUrl,
            user: {
                username: name,
                isGuest,
                isHost: isHostResult,
                participantId
            },
            startTime: meeting.startTime,
            remainingTimeSeconds
        });

    } catch (error: any) {
        console.error("Token Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
