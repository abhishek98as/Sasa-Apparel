import ImageKit from "imagekit";
import { NextResponse } from "next/server";

// Default ImageKit credentials (fallback when env vars not available)
const IMAGEKIT_DEFAULTS = {
    publicKey: "public_DRZyuw7wkmBFjF75SSluw33h9Vc=",
    privateKey: "private_nUDu8zvkqD43H0QaxP1K0GMuG/o=",
    urlEndpoint: "https://ik.imagekit.io/d6s8a2mzi",
};

// Initialize ImageKit securely
const getImageKitClient = () => {
    return new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || IMAGEKIT_DEFAULTS.publicKey,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || IMAGEKIT_DEFAULTS.privateKey,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || IMAGEKIT_DEFAULTS.urlEndpoint,
    });
};

export async function GET() {
    try {
        const imagekit = getImageKitClient();
        const authenticationParameters = imagekit.getAuthenticationParameters();
        
        // Return auth params along with config info for client
        return NextResponse.json({
            ...authenticationParameters,
            // Include public config for client verification
            publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || IMAGEKIT_DEFAULTS.publicKey,
            urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || IMAGEKIT_DEFAULTS.urlEndpoint,
        });
    } catch (error) {
        console.error("ImageKit Auth Error:", error);
        return NextResponse.json({ 
            error: "Authentication failed",
            code: "IMAGEKIT_AUTH_ERROR",
            message: "Failed to generate authentication parameters"
        }, { status: 500 });
    }
}
