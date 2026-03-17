import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },

    //i dont know if this attribute is required or not (since we already have a participant table)
    //one adv is that the query will be faster and we dont need to have to link to different collection(table)
    //but if the meeting has 500 1000 member then it will be a problem
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "participants"
        }
    ],
    meetingCode: {
        type: String,
        required: true,
        unique: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ["upcoming", "active", "ended", "cancelled"],
        default: "upcoming"
    },
    isInstant: {
        type: Boolean,
        default: false
    },
    isWaitingRoomEnabled: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Meeting = mongoose.models.meetings || mongoose.model("meetings", meetingSchema);

export default Meeting;