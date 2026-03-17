import mongoose from "mongoose";

const brainstormingUpdateSchema = new mongoose.Schema({
    //meeting will be identified by meetingId
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "meetings",
        required: true
    },
    //will define only the tools which are mentioned in the brainstorming
    toolType: {
        type: String,
        enum: ["canvas", "swot", "mindmap", "stickyNotes"],
        required: true
    },
    //since the data sent by tldraw will be massive , thus we are storing it in the form of mixed
    dataState: {
        type: mongoose.Schema.Types.Mixed, 
        default: {}
    },
    //here it will record the time when last update was made in the brainstorming
    //redis will record the update in ms, but at the same time updates will also be made in mongodb as a final backup
    //the update will not be in ms, but in maybe in seconds. Will decide later.
    lastUpdated: {
        type: Date,
        default: Date.now
    }   
},
    //records when the last time a row is updated 
    { timestamps: true });

    // Ensure that a meeting only has ONE document per toolType.
    // This prevents duplicates and allows us to use findOneAndUpdate cleanly.
    //pata nhi kya h ye
    brainstormingUpdateSchema.index(
        { meetingId: 1, toolType: 1 }, 
        { unique: true }
);

const BrainstormingUpdate = mongoose.models.brainstormingUpdates || mongoose.model("brainstormingUpdates", brainstormingUpdateSchema);

export default BrainstormingUpdate;
