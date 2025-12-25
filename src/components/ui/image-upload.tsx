'use client';

import { IKContext, IKUpload } from 'imagekitio-react';
import { useState } from 'react';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    onSuccess: (res: any) => void;
    onError?: (err: any) => void;
    folder?: string;
    label?: string;
    className?: string;
}

export function ImageUpload({
    onSuccess,
    onError,
    folder = '/samples',
    label = 'Upload Image',
    className
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);

    // Using environment variables or fallbacks consistent with other parts of the app
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || 'public_DRZyuw7wkmBFjF75SSluw33h9Vc=';
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/d6s8a2mzi';

    const authenticator = async () => {
        try {
            const response = await fetch('/api/imagekit/auth');
            if (!response.ok) throw new Error('Authentication failed');
            return await response.json();
        } catch (error) {
            console.error('ImageKit auth error:', error);
            throw error;
        }
    };

    const handleSuccess = (res: any) => {
        setUploading(false);
        onSuccess(res);
    };

    const handleError = (err: any) => {
        setUploading(false);
        console.error('Upload error:', err);
        if (onError) onError(err);
    };

    return (
        <IKContext
            publicKey={publicKey}
            urlEndpoint={urlEndpoint}
            authenticator={authenticator}
        >
            <div className={cn("inline-block", className)}>
                <IKUpload
                    fileName="file"
                    useUniqueFileName
                    folder={folder}
                    validateFile={(file) => file.size < 10000000} // 10MB limit
                    isPrivateFile={false}
                    onUploadStart={() => setUploading(true)}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    className="hidden"
                    id="ik-upload-input"
                />
                <label
                    htmlFor="ik-upload-input"
                    className={cn(
                        "cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm",
                        uploading
                            ? "bg-surface-100 text-surface-500 cursor-wait"
                            : "bg-primary-600 text-white hover:bg-primary-700"
                    )}
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : label}
                </label>
            </div>
        </IKContext>
    );
}
