'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Target, Trophy, Edit3, RotateCcw, Check, Sparkles, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VendorDailyGoalRingProps {
  todayRevenue: number;
  past7DaysRevenue?: number[];
  vendorUsername?: string;
  className?: string;
}

export default function VendorDailyGoalRing({
  todayRevenue,
  past7DaysRevenue = [],
  vendorUsername = 'default',
  className,
}: VendorDailyGoalRingProps) {
  const [customGoal, setCustomGoal] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [inputGoalValue, setInputGoalValue] = useState('');

  // Load custom goal from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`hyper_vendor_goal_${vendorUsername}`);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0) {
          setCustomGoal(parsed);
        }
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, [vendorUsername]);

  // Compute auto-target based on 7-day average + 15% growth, rounded to clean ₹500
  const autoGoal = useMemo(() => {
    if (!past7DaysRevenue || past7DaysRevenue.length === 0) return 5000;
    const validDays = past7DaysRevenue.filter((r) => r > 0);
    if (validDays.length === 0) return 5000;
    const avg = validDays.reduce((a, b) => a + b, 0) / validDays.length;
    const computed = Math.round((avg * 1.15) / 500) * 500;
    return Math.max(computed, 3000);
  }, [past7DaysRevenue]);

  const effectiveTarget = customGoal !== null ? customGoal : autoGoal;
  const percentage = effectiveTarget > 0 ? Math.min(Math.round((todayRevenue / effectiveTarget) * 100), 100) : 0;
  const rawPercentage = effectiveTarget > 0 ? Math.round((todayRevenue / effectiveTarget) * 100) : 0;
  const isGoalAchieved = rawPercentage >= 100;

  // SVG Progress Ring calculations
  const radius = 22;
  const strokeWidth = 4.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleSaveCustomGoal = () => {
    const val = Number(inputGoalValue.replace(/[^0-9]/g, ''));
    if (!isNaN(val) && val > 0) {
      setCustomGoal(val);
      try {
        localStorage.setItem(`hyper_vendor_goal_${vendorUsername}`, String(val));
      } catch {}
      setIsEditDialogOpen(false);
    }
  };

  const handleResetToAuto = () => {
    setCustomGoal(null);
    try {
      localStorage.removeItem(`hyper_vendor_goal_${vendorUsername}`);
    } catch {}
    setIsEditDialogOpen(false);
  };

  const ringColor = useMemo(() => {
    if (isGoalAchieved) return '#10b981'; // Emerald 500
    if (percentage >= 50) return '#3b82f6'; // Blue 500
    return '#f59e0b'; // Amber 500
  }, [isGoalAchieved, percentage]);

  return (
    <>
      <div
        onClick={() => {
          setInputGoalValue(String(effectiveTarget));
          setIsEditDialogOpen(true);
        }}
        className={cn(
          "group relative flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl bg-card/80 hover:bg-card border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none",
          className
        )}
        title="Click to set or adjust daily sales target"
      >
        {/* SVG Circular Progress Ring */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 54 54">
            {/* Background Track */}
            <circle
              cx="27"
              cy="27"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-muted/40"
            />
            {/* Animated Progress Stroke */}
            <motion.circle
              cx="27"
              cy="27"
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Icon or Percentage */}
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-foreground">
            {isGoalAchieved ? (
              <span className="text-emerald-600 dark:text-emerald-400">🎉</span>
            ) : (
              <span>{rawPercentage}%</span>
            )}
          </div>
        </div>

        {/* Goal Metric Info */}
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="h-3 w-3 text-primary" />
              Today's Target
            </span>
            {customGoal !== null ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                Custom
              </span>
            ) : (
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                Auto
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs sm:text-sm font-extrabold text-foreground">
              ₹{todayRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              / ₹{effectiveTarget.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Edit Hover Indicator */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
          <Edit3 className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Goal Setting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-headline">
              <Trophy className="h-5 w-5 text-amber-500" />
              Set Today's Revenue Target
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a custom daily revenue milestone for your kitchen. This target is stored securely on your device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-input" className="text-xs font-semibold">
                Daily Revenue Target (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="goal-input"
                  type="number"
                  placeholder="10000"
                  value={inputGoalValue}
                  onChange={(e) => setInputGoalValue(e.target.value)}
                  className="pl-8 text-sm font-bold rounded-xl"
                  min="500"
                  step="500"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {[5000, 8000, 10000, 15000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInputGoalValue(String(preset))}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all font-semibold",
                    Number(inputGoalValue) === preset
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Auto-calculated baseline: ₹{autoGoal.toLocaleString('en-IN')}
              </p>
              <p>Based on your 7-day rolling order average + 15% growth.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToAuto}
              className="text-xs text-muted-foreground hover:text-foreground rounded-full h-8 gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Auto
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-full text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCustomGoal}
                className="rounded-full text-xs h-8 font-bold gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Save Target
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
