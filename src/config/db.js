import mongoose from "mongoose"


export default async function DBconnection() {
    try {
        await mongoose.connect(process.env.mongodbUri)
        console.log("database connected successfully");
    } catch (error) {
        console.log("error connecting to the database",error);
        
    }

}