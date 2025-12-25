'use client';

import { useState, useEffect } from 'react';
import { IKContext, IKUpload, IKImage } from 'imagekitio-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Save, Lock, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [brandName, setBrandName] = useState('');
    const [brandLogo, setBrandLogo] = useState('');
    const [favicon, setFavicon] = useState('');

    const [mongoConfig, setMongoConfig] = useState({
        username: '',
        password: '',
        atlasUrl: '',
    });

    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/d6s8a2mzi';
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
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
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
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
                }),
            });
            const json = await res.json();
            if (json.success) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings: ' + json.message);
            }
        } catch (error) {
            console.error('Failed to save:', error);
            alert('An error occurred while saving.');
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
        console.log("Error", err);
        alert('Image upload failed');
    };

    const onSuccessLogo = (res: any) => {
        console.log("Success", res);
        setBrandLogo(res.filePath); // Store the path, ImageKit URL endpoint will be prepended
    };

    const onSuccessFavicon = (res: any) => {
        console.log("Success", res);
        setFavicon(res.filePath);
    };

    if (loading) return <div className="p-8"><Loading /></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Admin Settings</h1>
                <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2">
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Brand Identity Section */}
            <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-200 mt-8 mb-4 flex items-center gap-2">
                <ImageIcon size={20} />
                Brand Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Brand Name</label>
                    <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Enter brand name"
                    />
                </Card>

                {/* ImageKit Context Wrapper */}
                <IKContext
                    publicKey={publicKey}
                    urlEndpoint={urlEndpoint}
                    authenticator={authenticator}
                >
                    <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Brand Logo</label>
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <IKUpload
                                    fileName="brand-logo"
                                    folder={`/${brandName.replace(/\s+/g, '-').toLowerCase() || 'default'}/assets`}
                                    onError={onError}
                                    onSuccess={onSuccessLogo}
                                    className="block w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                            </div>
                            {brandLogo && (
                                <div className="w-16 h-16 relative border rounded bg-surface-100 flex items-center justify-center overflow-hidden">
                                    <IKImage
                                        path={brandLogo}
                                        width="64"
                                        height="64"
                                        alt="Brand Logo"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Favicon</label>
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <IKUpload
                                    fileName="favicon"
                                    folder={`/${brandName.replace(/\s+/g, '-').toLowerCase() || 'default'}/assets`}
                                    onError={onError}
                                    onSuccess={onSuccessFavicon}
                                    className="block w-full text-sm text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                            </div>
                            {favicon && (
                                <div className="w-16 h-16 relative border rounded bg-surface-100 flex items-center justify-center overflow-hidden">
                                    <IKImage
                                        path={favicon}
                                        width="64"
                                        height="64"
                                        alt="Favicon"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </IKContext>
            </div>

            {/* Database Configuration Section */}
            <h2 className="text-lg font-semibold text-surface-700 dark:text-surface-200 mt-8 mb-4 flex items-center gap-2">
                <Lock size={20} />
                Database Configuration (Secure)
            </h2>
            <Card className="p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">MongoDB Username</label>
                        <Input
                            value={mongoConfig.username}
                            onChange={(e) => setMongoConfig({ ...mongoConfig, username: e.target.value })}
                            placeholder="db_user"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">MongoDB Password</label>
                        <Input
                            type="password"
                            value={mongoConfig.password}
                            onChange={(e) => setMongoConfig({ ...mongoConfig, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Atlas Connection URL</label>
                    <Input
                        type="password"
                        value={mongoConfig.atlasUrl}
                        onChange={(e) => setMongoConfig({ ...mongoConfig, atlasUrl: e.target.value })}
                        placeholder="mongodb+srv://..."
                    />
                    <p className="text-xs text-surface-500 mt-1">Credentials are encrypted before storage.</p>
                </div>
            </Card>
        </div>
    );
}
