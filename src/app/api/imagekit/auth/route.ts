import ImageKit from "imagekit";
import { NextResponse } from "next/server";

// Initialize ImageKit securely
const getImageKitClient = () => {
    return new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "placeholder_public_key",
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "placeholder_private_key",
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/placeholder",
    });
};

export async function GET() {
    try {
        const imagekit = getImageKitClient();
        const authenticationParameters = imagekit.getAuthenticationParameters();
        return NextResponse.json(authenticationParameters);
    } catch (error) {
        console.error("ImageKit Auth Error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
