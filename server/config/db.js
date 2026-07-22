import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB Connection Failed");
        console.error("Message:", error.message);
        console.error("Cause:", error.cause);
        console.error("Reason:", error.reason);

        if (error.reason?.servers) {
            for (const [server, desc] of error.reason.servers) {
                console.log("\nServer:", server);
                console.log("Type:", desc.type);
                console.log("Error:", desc.error);
            }
        }

        process.exit(1);
    }
};

export default connectDB;