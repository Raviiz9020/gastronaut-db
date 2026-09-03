'use client';

import { Rider } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Bike,
  User,
  Trash2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RiderCardProps {
  rider: Rider;
  onToggleApproval: (id: string, currentStatus: boolean) => void;
  onUpdateVerification: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
  onDelete: (id: string) => void;
}

export default function RiderCard({ rider, onToggleApproval, onUpdateVerification, onDelete }: RiderCardProps) {
  const isOnline = rider.status === 'Online';

  return (
    <Card className="rounded-3xl overflow-hidden border border-border/70 bg-card hover:border-foreground/20 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between">
      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/15">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                {rider.name ? rider.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                )}
                title={isOnline ? "Online Now" : "Offline"}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold font-headline text-foreground leading-tight truncate">
                {rider.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                    isOnline
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground border border-border/60"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-muted-foreground")} />
                  {isOnline ? "Online" : "Offline"}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                    rider.isApproved
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  )}
                >
                  {rider.isApproved ? "Approved" : "Suspended"}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shrink-0"
            onClick={() => onDelete(rider.id)}
            title="Delete Rider Record"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 flex-1 space-y-3.5 text-xs">
        {/* Contact Info */}
        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
            <a href={`tel:${rider.contact}`} className="font-semibold text-foreground hover:underline truncate">
              {rider.contact}
            </a>
          </div>
          {rider.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{rider.email}</span>
            </div>
          )}
          {rider.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{rider.address}</span>
            </div>
          )}
        </div>

        {/* Vehicle & Payment */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/30 border border-border/40">
          <div className="space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground block">
              Vehicle Reg.
            </span>
            <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
              <Bike className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{rider.vehicleNumber || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground block">
              UPI Payout
            </span>
            <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
              <CreditCard className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">{rider.upiId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {rider.emergencyContactNumber && (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Emergency Contact
            </span>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-foreground truncate">{rider.emergencyContactName || 'Guardian'}</span>
              <a href={`tel:${rider.emergencyContactNumber}`} className="font-mono text-primary font-bold hover:underline">
                {rider.emergencyContactNumber}
              </a>
            </div>
          </div>
        )}

        {/* Verification Documents */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">
            KYC Documents
          </span>
          <div className="grid grid-cols-2 gap-2">
            {rider.aadhaarImageUrl ? (
              <a
                href={rider.aadhaarImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors text-[11px] font-semibold text-foreground group"
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-bold">Aadhaar</span>
                  <span className="text-[9px] text-muted-foreground font-mono truncate block">
                    {rider.aadhaarNumber ? `••• ${rider.aadhaarNumber.slice(-4)}` : 'Document'}
                  </span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
              </a>
            ) : (
              <div className="p-2 rounded-xl border border-dashed border-border/60 bg-muted/15 text-[11px] text-muted-foreground">
                <span>Aadhaar:</span>
                <span className="text-[9px] block text-muted-foreground italic">Not uploaded</span>
              </div>
            )}

            {rider.drivingLicenseImageUrl ? (
              <a
                href={rider.drivingLicenseImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors text-[11px] font-semibold text-foreground group"
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-bold">Driving Lic.</span>
                  <span className="text-[9px] text-muted-foreground font-mono truncate block">
                    {rider.drivingLicenseNumber || 'Document'}
                  </span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
              </a>
            ) : (
              <div className="p-2 rounded-xl border border-dashed border-border/60 bg-muted/15 text-[11px] text-muted-foreground">
                <span>License:</span>
                <span className="text-[9px] block text-muted-foreground italic">Not uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="pt-2 border-t border-border/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Allow Deliveries</span>
            </span>
            <Switch
              id={`approve-${rider.id}`}
              checked={rider.isApproved}
              onCheckedChange={() => onToggleApproval(rider.id, rider.isApproved)}
              className="scale-85"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">
              KYC Verification
            </span>
            <Select
              value={rider.verificationStatus || 'pending'}
              onValueChange={(val) => onUpdateVerification(rider.id, val as any)}
            >
              <SelectTrigger className="h-8 rounded-xl border-border/70 bg-background text-xs font-bold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="pending">🟡 Pending Review</SelectItem>
                <SelectItem value="approved">🟢 Approved & Verified</SelectItem>
                <SelectItem value="rejected">🔴 Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
