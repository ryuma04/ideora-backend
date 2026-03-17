import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    //username column
    username: {
        type: String,
        required: true,
        unique: true
    },
    //email column
    email: {
        type: String,
        required: true,
        unique: true
    },
    //password column
    password: {
        type: String,
        required: true
    },
    //will get updated through email verification
    isVerified: {
        type: Boolean,
        default: false //by default, the user is not verified
    },

    //for profile image through cloudinary
    profileImage: {
        type: String,
        default: ""
    },

    //each token will have its expiry as well
    forgotPasswordToken: String,
    forgotPasswordTokenExpire: Date,
    isVerifyToken: String,
    isVerifyTokenExpire: Date
})

//specifies if model is already created then reuse it else create a new model
const User = mongoose.models.users || mongoose.model("users", userSchema);
export default User;