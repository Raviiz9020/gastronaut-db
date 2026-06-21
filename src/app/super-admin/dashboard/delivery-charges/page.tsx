'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Route, Plus, Trash2, Save, Loader2, IndianRupee, MapPin, Navigation } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DeliveryConfig, DeliverySlab } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CONFIG: DeliveryConfig = {
  isEnabled: false,
  maxDeliveryRadiusKm: 5,
  distanceMultiplier: 1.0,
  slabs: [
    {
      minKm: 0,
      maxKm: 2,
      charge: 20,
      riderPayout: 15
    }
  ]
};

export default function DeliveryChargesPage() {
    const { toast } = useToast();
    const [config, setConfig] = useState<DeliveryConfig>(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchConfig = useCallback(async () => {
        try {
            setIsLoading(true);
            const docRef = doc(db, 'site-settings', 'delivery');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setConfig(docSnap.data() as DeliveryConfig);
            } else {
                // Initialize with default if not exists
                setConfig(DEFAULT_CONFIG);
            }
        } catch (error) {
            console.error("Error fetching delivery config:", error);
            toast({
                title: "Error",
                description: "Failed to load delivery charges configuration.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const docRef = doc(db, 'site-settings', 'delivery');
            await setDoc(docRef, config);

            // Save to settings/delivery_settings for Android parity
            const settingsRef = doc(db, 'settings', 'delivery_settings');
            await setDoc(settingsRef, config);

            toast({
                title: "Settings Saved",
                description: "Delivery charges configuration has been updated successfully.",
            });
        } catch (error) {
            console.error("Error saving delivery config:", error);
            toast({
                title: "Error",
                description: "Failed to save configuration.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const addSlab = () => {
        const lastSlab = config.slabs[config.slabs.length - 1];
        const newMin = lastSlab ? lastSlab.maxKm + 0.01 : 0;
        const newMax = lastSlab ? lastSlab.maxKm + 2 : 2;
        
        const newSlab: DeliverySlab = {
            minKm: parseFloat(newMin.toFixed(2)),
            maxKm: parseFloat(newMax.toFixed(2)),
            charge: lastSlab ? lastSlab.charge + 10 : 20,
            riderPayout: lastSlab ? lastSlab.riderPayout + 5 : 15
        };

        setConfig({
            ...config,
            slabs: [...config.slabs, newSlab]
        });
    };

    const removeSlab = (index: number) => {
        const newSlabs = [...config.slabs];
        newSlabs.splice(index, 1);
        setConfig({
            ...config,
            slabs: newSlabs
        });
    };

    const updateSlab = (index: number, field: keyof DeliverySlab, value: number) => {
        const newSlabs = [...config.slabs];
        newSlabs[index] = {
            ...newSlabs[index],
            [field]: value
        };
        setConfig({
            ...config,
            slabs: newSlabs
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Delivery Charges</h2>
                    <p className="text-muted-foreground">Manage global delivery slabs, distance multipliers, and payouts.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="rounded-2xl gap-2 px-6">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-3xl border-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-destructive" />
                            General Settings
                        </CardTitle>
                        <CardDescription>Basic delivery configuration and limits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-destructive/5">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable Delivery Charges</Label>
                                <p className="text-sm text-muted-foreground">Toggle global delivery fee calculation.</p>
                            </div>
                            <Switch 
                                checked={config.isEnabled} 
                                onCheckedChange={async (val) => {
                                    const updatedConfig = { ...config, isEnabled: val };
                                    setConfig(updatedConfig);
                                    try {
                                        const docRef = doc(db, 'site-settings', 'delivery');
                                        await setDoc(docRef, updatedConfig);

                                        const settingsRef = doc(db, 'settings', 'delivery_settings');
                                        await setDoc(settingsRef, updatedConfig);

                                        toast({
                                            title: val ? "Delivery Charges Enabled" : "Delivery Charges Disabled",
                                            description: `Global delivery fee calculation has been ${val ? 'enabled' : 'disabled'}.`,
                                        });
                                    } catch (error) {
                                        console.error("Error updating delivery status:", error);
                                        toast({
                                            title: "Error",
                                            description: "Failed to update delivery charges status in Firestore.",
                                            variant: "destructive"
                                        });
                                        // Revert state on failure
                                        setConfig(config);
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="maxRadius" className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    Maximum Delivery Radius (Km)
                                </Label>
                                <Input 
                                    id="maxRadius"
                                    type="number"
                                    value={config.maxDeliveryRadiusKm}
                                    onChange={(e) => setConfig({...config, maxDeliveryRadiusKm: parseFloat(e.target.value) || 0})}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="multiplier" className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                    Distance Multiplier
                                </Label>
                                <Input 
                                    id="multiplier"
                                    type="number"
                                    step="0.1"
                                    value={config.distanceMultiplier}
                                    onChange={(e) => setConfig({...config, distanceMultiplier: parseFloat(e.target.value) || 0})}
                                    className="rounded-xl"
                                />
                                <p className="text-xs text-muted-foreground">Optional factor applied to the total calculated charge.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Route className="h-5 w-5 text-destructive" />
                            Delivery Slabs
                        </h3>
                        <Button onClick={addSlab} variant="outline" size="sm" className="rounded-xl gap-1">
                            <Plus className="h-4 w-4" />
                            Add Slab
                        </Button>
                    </div>

                    <AnimatePresence mode="popLayout">
                        <div className="space-y-4">
                            {config.slabs.map((slab, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <Card className="rounded-2xl overflow-hidden border-destructive/10">
                                        <div className="bg-muted/30 p-3 px-4 flex items-center justify-between border-b border-destructive/5">
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Slab #{index + 1}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removeSlab(index)}
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Min distance (Km)</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={slab.minKm}
                                                    onChange={(e) => updateSlab(index, 'minKm', parseFloat(e.target.value) || 0)}
                                                    className="h-9 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Max distance (Km)</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={slab.maxKm}
                                                    onChange={(e) => updateSlab(index, 'maxKm', parseFloat(e.target.value) || 0)}
                                                    className="h-9 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Charge (₹)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={slab.charge}
                                                    onChange={(e) => updateSlab(index, 'charge', parseFloat(e.target.value) || 0)}
                                                    className="h-9 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Rider Payout (₹)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={slab.riderPayout}
                                                    onChange={(e) => updateSlab(index, 'riderPayout', parseFloat(e.target.value) || 0)}
                                                    className="h-9 rounded-lg"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
