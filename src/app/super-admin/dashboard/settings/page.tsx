'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSiteSettings } from '@/context/site-settings-context';
import { useToast } from '@/hooks/use-toast';
import { Brush, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';

export default function SuperAdminSettingsPage() {
    const { logoUrl, updateLogo } = useSiteSettings();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsSaving(true);
            try {
                const { compressedDataUrl } = await compressImage(URL.createObjectURL(file));
                const imageUrl = await uploadImageToStorage(compressedDataUrl, `site/logo-${Date.now()}`);
                await updateLogo(imageUrl);
                toast({ title: 'Logo Uploaded', description: 'Your new logo has been saved.' });
            } catch (err) {
                console.error(err);
                toast({ title: 'Image processing error', description: 'Could not process the uploaded image.', variant: 'destructive'});
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Site Settings</h2>
                    <p className="text-muted-foreground">Manage global application settings like the logo.</p>
                </div>
            </div>

            <Card className="max-w-2xl mx-auto rounded-3xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brush className="h-5 w-5 text-destructive" />
                        Application Logo
                    </CardTitle>
                    <CardDescription>
                        This logo appears in the header and on various pages. Recommended size: 128x128.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>Current Logo</Label>
                        <div className="mt-2 w-32 h-32 p-4 rounded-2xl bg-muted flex items-center justify-center">
                            {logoUrl ? (
                                <Image src={logoUrl} alt="Current Logo" width={128} height={128} className="object-contain"/>
                            ) : (
                                <span className="text-sm text-muted-foreground">No Logo</span>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-semibold">Change Logo</h3>
                        <div className="space-y-2">
                            <Label>Upload Logo Image</Label>
                            <div className="flex items-center justify-center w-full">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                                />
                                <Button onClick={handleUploadClick} disabled={isSaving} variant="outline" className="w-full h-24 flex-col rounded-2xl">
                                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin"/> : <><Upload className="h-6 w-6 mb-2"/><span>Click to Upload Logo</span></>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
