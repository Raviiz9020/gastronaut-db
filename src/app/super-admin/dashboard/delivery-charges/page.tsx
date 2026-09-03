'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Route,
  Plus,
  Trash2,
  Save,
  Loader2,
  IndianRupee,
  MapPin,
  Navigation,
  CheckCircle2,
  Bike,
  Sparkles,
  Layers,
  Gauge,
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DeliveryConfig, DeliverySlab } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  // Test Distance Simulator
  const [simulatedKm, setSimulatedKm] = useState<number>(2.5);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const docRef = doc(db, 'site-settings', 'delivery');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setConfig(docSnap.data() as DeliveryConfig);
      } else {
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

  // Live simulation calculation
  const simulationResult = useMemo(() => {
    if (!config.isEnabled) {
      return {
        applicable: false,
        customerCharge: 0,
        riderPayout: 0,
        margin: 0,
        status: 'Delivery Charges Disabled (Free Delivery)',
        matchedSlab: null
      };
    }

    if (simulatedKm > config.maxDeliveryRadiusKm) {
      return {
        applicable: false,
        customerCharge: 0,
        riderPayout: 0,
        margin: 0,
        status: `Exceeds max delivery radius (${config.maxDeliveryRadiusKm} km)`,
        matchedSlab: null
      };
    }

    const matched = config.slabs.find(s => simulatedKm >= s.minKm && simulatedKm <= s.maxKm);
    if (!matched) {
      return {
        applicable: false,
        customerCharge: 0,
        riderPayout: 0,
        margin: 0,
        status: 'No matching distance slab defined',
        matchedSlab: null
      };
    }

    const customerCharge = Math.round(matched.charge * (config.distanceMultiplier || 1.0));
    const riderPayout = matched.riderPayout;
    const margin = customerCharge - riderPayout;

    return {
      applicable: true,
      customerCharge,
      riderPayout,
      margin,
      status: `Matched: Slab ${matched.minKm} - ${matched.maxKm} km`,
      matchedSlab: matched
    };
  }, [config, simulatedKm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-2xs",
                  config.isEnabled
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border/70"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", config.isEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                {config.isEnabled ? "LOGISTICS ENGINE ACTIVE" : "FREE DELIVERY (DISABLED)"}
              </span>
              <span className="text-muted-foreground text-xs font-semibold">
                {config.slabs.length} Distance Slabs Defined
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Delivery Charges & Rider Payouts</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Configure tiered distance fee slabs, maximum serviceable radius, and rider settlement payouts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="rounded-full text-xs font-bold gap-2 h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? "Saving Config..." : "Save Changes"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 4-KPI Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Fee Engine Status</span>
            <Navigation className="h-4 w-4 text-primary" />
          </div>
          <p className={cn("text-2xl font-black", config.isEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {config.isEnabled ? "Active" : "Disabled"}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">
            {config.isEnabled ? "Charges applied on checkout" : "Zero delivery fees"}
          </p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Max Delivery Radius</span>
            <MapPin className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{config.maxDeliveryRadiusKm} <span className="text-sm font-bold text-muted-foreground">km</span></p>
          <p className="text-[10px] text-muted-foreground font-medium">Serviceable range limit</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Distance Multiplier</span>
            <Gauge className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{config.distanceMultiplier}x</p>
          <p className="text-[10px] text-muted-foreground font-medium">Global fee multiplier</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Base Rider Payout</span>
            <Bike className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{config.slabs[0]?.riderPayout || 0}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Starting payout on first slab</p>
        </div>
      </div>

      {/* 3. 2-COLUMN SPLIT (Left: General Settings & Live Calculator • Right: Slabs Matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Global Settings & Live Distance Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* General Config Card */}
          <Card className="rounded-3xl border border-border/80 overflow-hidden shadow-2xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold font-headline flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span>General Delivery Settings</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle delivery fee engine and set operational distance boundaries.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Enable Switch Box */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/70">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">Enable Delivery Charges</Label>
                  <p className="text-[11px] text-muted-foreground">
                    When active, fees are calculated dynamically on checkout.
                  </p>
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
                      setConfig(config);
                    }
                  }}
                />
              </div>

              {/* Maximum Radius */}
              <div className="space-y-1.5">
                <Label htmlFor="maxRadius" className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  <span>Maximum Delivery Radius (Km)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="maxRadius"
                    type="number"
                    min="1"
                    max="50"
                    value={config.maxDeliveryRadiusKm}
                    onChange={(e) => setConfig({ ...config, maxDeliveryRadiusKm: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs rounded-xl border-border/70 bg-background pr-10 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    km
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Orders beyond this radius will be marked unserviceable.
                </p>
              </div>

              {/* Distance Multiplier */}
              <div className="space-y-1.5">
                <Label htmlFor="multiplier" className="text-xs font-bold flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-purple-600" />
                  <span>Distance Multiplier Factor</span>
                </Label>
                <div className="relative">
                  <Input
                    id="multiplier"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5.0"
                    value={config.distanceMultiplier}
                    onChange={(e) => setConfig({ ...config, distanceMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="h-9 text-xs rounded-xl border-border/70 bg-background pr-8 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    x
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Applied as a multiplier to the total customer delivery charge (Default: 1.0).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Live Simulator Card */}
          <Card className="rounded-3xl border border-border/80 overflow-hidden shadow-2xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold font-headline flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  <span>Live Distance Fee Simulator</span>
                </CardTitle>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  INSTANT TEST
                </span>
              </div>
              <CardDescription className="text-xs">
                Test how fees, rider payouts, and margins are calculated for any distance.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Simulated Distance:</span>
                  <span className="text-foreground text-sm font-black">{simulatedKm} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max={Math.max(config.maxDeliveryRadiusKm + 2, 10)}
                  step="0.1"
                  value={simulatedKm}
                  onChange={(e) => setSimulatedKm(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              {/* Simulation Result Box */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">Status:</span>
                  <span className={cn("font-bold text-[11px] px-2 py-0.5 rounded-full border", simulationResult.applicable ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30")}>
                    {simulationResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                  <div className="p-2 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground font-semibold block">Customer Fee</span>
                    <span className="text-base font-black text-foreground">₹{simulationResult.customerCharge}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground font-semibold block">Rider Payout</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{simulationResult.riderPayout}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground font-semibold block">Platform Margin</span>
                    <span className={cn("text-base font-black", simulationResult.margin >= 0 ? "text-purple-600 dark:text-purple-400" : "text-rose-600")}>
                      ₹{simulationResult.margin}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Tiered Distance Slabs Matrix (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/70 shadow-2xs">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold font-headline text-foreground flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <span>Configured Distance Slabs</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Define the customer fee and rider settlement payout for each distance bracket.
              </p>
            </div>

            <Button
              onClick={addSlab}
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 h-8 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Slab</span>
            </Button>
          </div>

          {/* Slabs List */}
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {config.slabs.map((slab, index) => {
                const margin = slab.charge - slab.riderPayout;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className="rounded-2xl overflow-hidden border border-border/70 bg-card shadow-2xs hover:border-foreground/20 transition-all">
                      {/* Slab Header Strip */}
                      <div className="bg-muted/30 p-3 px-4 flex items-center justify-between border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                            Slab #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {slab.minKm} km ➔ {slab.maxKm} km
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", margin >= 0 ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30" : "bg-rose-500/10 text-rose-600 border-rose-500/30")}>
                            {margin >= 0 ? `+₹${margin} Margin` : `-₹${Math.abs(margin)} Loss`}
                          </span>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSlab(index)}
                            disabled={config.slabs.length <= 1}
                            className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 rounded-full shrink-0"
                            title={config.slabs.length <= 1 ? "At least 1 slab required" : "Delete Slab"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Slab Controls Grid */}
                      <CardContent className="p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Min Km */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Min Distance (Km)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={slab.minKm}
                            onChange={(e) => updateSlab(index, 'minKm', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs rounded-xl border-border/70 bg-background font-bold"
                          />
                        </div>

                        {/* Max Km */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Max Distance (Km)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={slab.maxKm}
                            onChange={(e) => updateSlab(index, 'maxKm', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs rounded-xl border-border/70 bg-background font-bold"
                          />
                        </div>

                        {/* Customer Charge */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Customer Fee (₹)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              type="number"
                              value={slab.charge}
                              onChange={(e) => updateSlab(index, 'charge', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs rounded-xl border-border/70 bg-background pl-6 font-bold"
                            />
                          </div>
                        </div>

                        {/* Rider Payout */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Rider Payout (₹)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                              ₹
                            </span>
                            <Input
                              type="number"
                              value={slab.riderPayout}
                              onChange={(e) => updateSlab(index, 'riderPayout', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs rounded-xl border-border/70 bg-background pl-6 font-bold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
