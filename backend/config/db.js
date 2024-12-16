import mongoose from "mongoose";

export const connectDB = async()=>{
    await mongoose.connect('mongodb+srv://Prashanth:9381653431@cluster0.pvisk0t.mongodb.net/    food-del')
    .then(()=>console.log("DB connected"))
}   