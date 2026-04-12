import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "meetings",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["host", "co-host", "attendee"],
        default: "attendee"
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date
    },
    // Guest User Fields
    isGuest: {
        type: Boolean,
        default: false
    },
    guestId: {
        type: String, // Unique ID for guest session (e.g. guest-123)
    },
    email: {
        type: String, // email to receive the report
    },
    //set the expire time to 6 hours which will run TTL operation   
    expiresAt: {
        type: Date,
        expires: 0 // Documents will be automatically deleted when this time is reached
    },
    // Waiting Room Status
    status: {
        type: String,
        enum: ["waiting", "admitted", "denied"],
        default: "admitted"
    }
});

const Participant = mongoose.models.participants || mongoose.model("participants", participantSchema);
export default Participant;
