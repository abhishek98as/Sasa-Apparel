'use client';

import { useState, useEffect } from 'react';
import { IKContext, IKUpload, IKImage } from 'imagekitio-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layout/header';
import { Save, Lock, Image as ImageIcon, AlertCircle, CheckCircle2, Upload, Key } from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    const [brandName, setBrandName] = useState('');
    const [brandLogo, setBrandLogo] = useState('');
    const [favicon, setFavicon] = useState('');

    const [mongoConfig, setMongoConfig] = useState({
        username: '',
        password: '',
        atlasUrl: '',
    });

    const [imageKitConfig, setImageKitConfig] = useState({
        publicKey: '',
        privateKey: '',
        urlEndpoint: '',
    });

    // Default ImageKit values
    const defaultUrlEndpoint = 'https://ik.imagekit.io/d6s8a2mzi';
    const defaultPublicKey = 'public_DRZyuw7wkmBFjF75SSluw33h9Vc=';
    
    const urlEndpoint = imageKitConfig.urlEndpoint || defaultUrlEndpoint;
    const publicKey = imageKitConfig.publicKey || defaultPublicKey;
    const authEndpoint = '/api/imagekit/auth';

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const json = await res.json();
            if (json.success && json.data) {
                setBrandName(json.data.brandName || '');
                setBrandLogo(json.data.brandLogo || '');
                setFavicon(json.data.favicon || '');
                if (json.data.mongoConfig) {
                    setMongoConfig({
                        username: json.data.mongoConfig.username || '',
                        password: json.data.mongoConfig.password || '',
                        atlasUrl: json.data.mongoConfig.atlasUrl || '',
                    });
                }
                if (json.data.imageKitConfig) {
                    setImageKitConfig({
                        publicKey: json.data.imageKitConfig.publicKey || '',
                        privateKey: json.data.imageKitConfig.privateKey || '',
                        urlEndpoint: json.data.imageKitConfig.urlEndpoint || '',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!brandName.trim()) {
            showToast('Please enter a brand name', 'error');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    brandName,
                    brandLogo,
                    favicon,
                    mongoConfig,
                    imageKitConfig,
                }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('Settings saved successfully! The page will reload to apply changes.', 'success');
                // Reload page after 1.5 seconds to apply new settings
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showToast('Failed to save settings: ' + json.message, 'error');
            }
        } catch (error) {
            console.error('Failed to save:', error);
            showToast('An error occurred while saving settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const authenticator = async () => {
        try {
            const response = await fetch(authEndpoint);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            const { signature, expire, token } = data;
            return { signature, expire, token };
        } catch (error: any) {
            throw new Error(`Authentication request failed: ${error.message}`);
        }
    };

    const onError = (err: any) => {
        console.error("Image upload error:", err);
        showToast('Image upload failed. Please try again.', 'error');
    };

    const onSuccessLogo = (res: any) => {
        console.log("Logo upload success:", res);
        setBrandLogo(res.filePath);
        showToast('Brand logo uploaded successfully!', 'success');
    };

    const onSuccessFavicon = (res: any) => {
        console.log("Favicon upload success:", res);
        setFavicon(res.filePath);
        showToast('Favicon uploaded successfully!', 'success');
    };

    if (loading) return (
        <div className="animate-fade-in">
            <Header title="Settings" subtitle="Configure your brand identity and database settings" />
            <div className="p-8 flex justify-center">
                <Loading />
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <Header 
                title="Settings" 
                subtitle="Configure your brand identity and database settings"
                actions={
                    <Button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                }
            />
            
            <div className="p-6 max-w-6xl mx-auto space-y-8">
                {/* Security Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Security Notice</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Database credentials are encrypted using AES-256-CBC encryption before storage. 
                            Only authorized administrators can access and modify these settings.
                        </p>
                    </div>
                </div>

                {/* Brand Identity Section */}
                <div>
                    <h2 className="text-xl font-semibold text-surface-800 dark:text-surface-100 mb-1 flex items-center gap-2">
                        <ImageIcon size={22} className="text-primary-600" />
                        Brand Identity
                    </h2>
                    <p className="text-sm text-surface-500 mb-4">
                        Customize your brand name, logo, and favicon. Images are stored securely in ImageKit.
                    </p>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Brand Name */}
                        <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                Brand Name *
                            </label>
                            <Input
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                placeholder="Enter your brand name (e.g., Sasa Apparel)"
                                className="w-full"
                                required
                            />
                            <p className="text-xs text-surface-500 mt-1">This will be displayed in the header and throughout the portal.</p>
                        </Card>

                        {/* ImageKit Context Wrapper */}
                        <IKContext
                            publicKey={publicKey}
                            urlEndpoint={urlEndpoint}
                            authenticator={authenticator}
                        >
                            {/* Brand Logo */}
                            <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                            Brand Logo
                                        </label>
                                        <p className="text-xs text-surface-500">
                                            Upload your company logo (recommended: 200x200px, PNG with transparent background)
                                        </p>
                                    </div>
                                    {brandLogo && (
                                        <div className="w-20 h-20 relative border-2 border-surface-200 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900 flex items-center justify-center overflow-hidden shadow-sm">
                                            <IKImage
                                                path={brandLogo}
                                                transformation={[{ width: '80', height: '80' }]}
                                                alt="Brand Logo"
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <IKUpload
                                        fileName="brand-logo"
                                        folder={`/${brandName.replace(/\s+/g, '-').toLowerCase() || 'default'}/assets`}
                                        onError={onError}
                                        onSuccess={onSuccessLogo}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                                    >
                                        <Upload size={16} />
                                        Upload Logo
                                    </label>
                                    {brandLogo && (
                                        <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 size={16} />
                                            Uploaded
                                        </span>
                                    )}
                                </div>
                            </Card>

                            {/* Favicon */}
                            <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                            Favicon
                                        </label>
                                        <p className="text-xs text-surface-500">
                                            Browser tab icon (recommended: 32x32px or 64x64px, ICO or PNG format)
                                        </p>
                                    </div>
                                    {favicon && (
                                        <div className="w-16 h-16 relative border-2 border-surface-200 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900 flex items-center justify-center overflow-hidden shadow-sm">
                                            <IKImage
                                                path={favicon}
                                                transformation={[{ width: '64', height: '64' }]}
                                                alt="Favicon"
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <IKUpload
                                        fileName="favicon"
                                        folder={`/${brandName.replace(/\s+/g, '-').toLowerCase() || 'default'}/assets`}
                                        onError={onError}
                                        onSuccess={onSuccessFavicon}
                                        className="hidden"
                                        id="favicon-upload"
                                    />
                                    <label
                                        htmlFor="favicon-upload"
                                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                                    >
                                        <Upload size={16} />
                                        Upload Favicon
                                    </label>
                                    {favicon && (
                                        <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 size={16} />
                                            Uploaded
                                        </span>
                                    )}
                                </div>
                            </Card>
                        </IKContext>
                    </div>
                </div>

                {/* Database Configuration Section */}
                <div>
                    <h2 className="text-xl font-semibold text-surface-800 dark:text-surface-100 mb-1 flex items-center gap-2">
                        <Lock size={22} className="text-amber-600" />
                        Database Configuration
                    </h2>
                    <p className="text-sm text-surface-500 mb-4">
                        Manage MongoDB Atlas connection credentials (encrypted before storage)
                    </p>

                    <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    MongoDB Username
                                </label>
                                <Input
                                    value={mongoConfig.username}
                                    onChange={(e) => setMongoConfig({ ...mongoConfig, username: e.target.value })}
                                    placeholder="db_user"
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    MongoDB Password
                                </label>
                                <Input
                                    type="password"
                                    value={mongoConfig.password}
                                    onChange={(e) => setMongoConfig({ ...mongoConfig, password: e.target.value })}
                                    placeholder="Enter password"
                                    className="font-mono text-sm"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                MongoDB Atlas Connection URL
                            </label>
                            <Input
                                type="password"
                                value={mongoConfig.atlasUrl}
                                onChange={(e) => setMongoConfig({ ...mongoConfig, atlasUrl: e.target.value })}
                                placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
                                className="font-mono text-sm"
                                autoComplete="new-password"
                            />
                            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                    <Lock size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Security:</strong> Password and connection URL are encrypted using AES-256-CBC before being stored in the database. 
                                        Username is stored in plain text for reference.
                                    </span>
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ImageKit Configuration Section */}
                <div>
                    <h2 className="text-xl font-semibold text-surface-800 dark:text-surface-100 mb-1 flex items-center gap-2">
                        <Key size={22} className="text-purple-600" />
                        ImageKit Configuration
                    </h2>
                    <p className="text-sm text-surface-500 mb-4">
                        Manage ImageKit API credentials for image storage and delivery (encrypted before storage)
                    </p>

                    <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                URL Endpoint
                            </label>
                            <Input
                                value={imageKitConfig.urlEndpoint}
                                onChange={(e) => setImageKitConfig({ ...imageKitConfig, urlEndpoint: e.target.value })}
                                placeholder="https://ik.imagekit.io/your_imagekit_id"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-surface-500 mt-1">
                                Default: {defaultUrlEndpoint}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    Public Key
                                </label>
                                <Input
                                    value={imageKitConfig.publicKey}
                                    onChange={(e) => setImageKitConfig({ ...imageKitConfig, publicKey: e.target.value })}
                                    placeholder="public_xxxxxxxxxxxxx"
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-surface-500 mt-1">
                                    Default: {defaultPublicKey.substring(0, 20)}...
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                                    Private Key (Keep Confidential)
                                </label>
                                <Input
                                    type="password"
                                    value={imageKitConfig.privateKey}
                                    onChange={(e) => setImageKitConfig({ ...imageKitConfig, privateKey: e.target.value })}
                                    placeholder="private_xxxxxxxxxxxxx"
                                    className="font-mono text-sm"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <p className="text-xs text-purple-800 dark:text-purple-200 flex items-start gap-2">
                                <Key size={14} className="mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Note:</strong> The private key is encrypted before storage. 
                                    If left empty, the system will use the default ImageKit credentials from environment variables.
                                </span>
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
