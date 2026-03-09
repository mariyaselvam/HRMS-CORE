import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
    forcePathStyle: true, // Required for Supabase S3
    region: process.env.SP_S3_REGION || "ap-southeast-2",
    endpoint: process.env.SP_S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.SP_S3_ACCESS_KEY || "",
        secretAccessKey: process.env.SP_S3_SECRET_KEY || "",
    },
});

export const uploadFile = async (file: Express.Multer.File, path: string) => {
    const bucketName = process.env.SP_S3_BUCKET || "employee-documents";

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: path,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    try {
        await s3Client.send(command);
        // Construct the public URL
        // Format: [endpoint]/[bucket]/[path]
        // Note: You might need to make the bucket public in Supabase Dashboard
        const publicUrl = `${process.env.SP_S3_ENDPOINT}/${bucketName}/${path}`;
        return publicUrl;
    } catch (err) {
        console.error("S3 Upload Error:", err);
        throw new Error("Failed to upload file to storage");
    }
};

export default s3Client;
