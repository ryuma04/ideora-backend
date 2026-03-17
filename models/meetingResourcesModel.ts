import mongoose from "mongoose";

const meetingResourcesSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "meetings",
        required: true,
        unique: true
    },
    
    //the output doc of the brainstorming
    brainstormingReportUrl: {
        type: String, 
        default: ""
    },

    //the MOM generated from AI
    momText: {
        type: String,
        default: "" // Saved 2 mins after meeting ends by AI
    },
    
    //the audio of the meeting
    audioRecordingUrl: {
        type: String,
        default: "" 
    },

    //cloudinary public_id for audio deletion after 6 hours
    audioPublicId: {
        type: String,
        default: ""
    }

}, { timestamps: true });

const MeetingResource = mongoose.models.meetingResources || mongoose.model("meetingResources", meetingResourcesSchema);

export default MeetingResource;
