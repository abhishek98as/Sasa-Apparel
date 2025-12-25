import ImageKit from "imagekit";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Default ImageKit credentials
const IMAGEKIT_DEFAULTS = {
    publicKey: "public_DRZyuw7wkmBFjF75SSluw33h9Vc=",
    privateKey: "private_nUDu8zvkqD43H0QaxP1K0GMuG/o=",
    urlEndpoint: "https://ik.imagekit.io/d6s8a2mzi",
};

const getImageKitClient = () => {
    return new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || IMAGEKIT_DEFAULTS.publicKey,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || IMAGEKIT_DEFAULTS.privateKey,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || IMAGEKIT_DEFAULTS.urlEndpoint,
    });
};

export async function POST(request: NextRequest) {
    try {
        // Verify session
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Admin access required" }
            }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const fileName = formData.get('fileName') as string || 'upload';
        const folder = formData.get('folder') as string || '/uploads';

        if (!file) {
            return NextResponse.json({
                success: false,
                error: { code: "BAD_REQUEST", message: "No file provided" }
            }, { status: 400 });
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const imagekit = getImageKitClient();
        
        const response = await imagekit.upload({
            file: buffer,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true,
        });

        return NextResponse.json({
            success: true,
            data: {
                fileId: response.fileId,
                name: response.name,
                url: response.url,
                filePath: response.filePath,
                thumbnailUrl: response.thumbnailUrl,
                height: response.height,
                width: response.width,
                size: response.size,
                fileType: response.fileType,
            }
        });

    } catch (error: any) {
        console.error("ImageKit Upload Error:", error);
        return NextResponse.json({
            success: false,
            error: {
                code: "UPLOAD_ERROR",
                message: error.message || "Failed to upload file"
            }
        }, { status: 500 });
    }
}

// Also handle GET to test endpoint
export async function GET() {
    return NextResponse.json({
        success: true,
        message: "ImageKit upload endpoint is ready",
        method: "POST",
        fields: {
            file: "File (required) - The file to upload",
            fileName: "string (optional) - Custom file name",
            folder: "string (optional) - Target folder path"
        }
    });
}
