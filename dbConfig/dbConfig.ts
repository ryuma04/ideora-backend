import mongoose from "mongoose";
export default async function connect() {
    try {
        //preventing multiple connection
        //returning 1 or more, means connection is established
        if (mongoose.connection.readyState >= 1) {
            return;
        }
        await mongoose.connect(process.env.MONGODB_URL!);
        const connection = mongoose.connection;
        connection.on('connected', () => {
            console.log("Connected with mongo db successfully");
        });
        connection.on('error', (err) => {
            console.log("Something went wrong", err);
        });
    }
    catch (error) {
        console.log("Something went wrong", error);
        throw error;
    }
}