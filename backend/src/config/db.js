import mongoose from "mongoose";

export async function connectDatabase() {
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error("MONGODB_URI is required in the backend environment.");
  }

  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}