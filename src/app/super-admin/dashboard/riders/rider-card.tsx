'use client';

import { Rider } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, CreditCard, FileText, Bike, User, Trash2, ExternalLink, Circle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RiderCardProps {
  rider: Rider;
  onToggleApproval: (id: string, currentStatus: boolean) => void;
  onUpdateVerification: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
  onDelete: (id: string) => void;
}

export default function RiderCard({ rider, onToggleApproval, onUpdateVerification, onDelete }: RiderCardProps) {
  return (
    <Card className="rounded-3xl overflow-hidden border-destructive/10 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-3 items-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center text-destructive">
                <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold leading-none mb-1">{rider.name}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <Badge variant={rider.status === 'Online' ? 'default' : 'secondary'} className={cn(
                    "h-2 w-2 rounded-full p-0 mr-1 animate-pulse",
                    rider.status === 'Online' ? "bg-green-500" : "bg-gray-400"
                )} />
                {rider.status}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
            onClick={() => onDelete(rider.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-destructive" />
            <span className="truncate">{rider.contact}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-destructive" />
            <span className="truncate">{rider.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-destructive" />
            <span className="truncate">{rider.address}</span>
          </div>
        </div>

        {/* Vehicle & Payment */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Vehicle</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Bike className="h-3 w-3" />
              {rider.vehicleNumber}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">UPI ID</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
              <CreditCard className="h-3 w-3" />
              {rider.upiId}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-2 p-3 rounded-2xl bg-destructive/5 border border-destructive/10">
          <span className="text-[10px] uppercase tracking-wider font-bold text-destructive/80 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Emergency Contact
          </span>
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">{rider.emergencyContactName}</span>
            <span className="font-mono text-muted-foreground">{rider.emergencyContactNumber}</span>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Verification Documents</span>
          <div className="grid grid-cols-1 gap-2">
            <a 
              href={rider.aadhaarImageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-xl border border-destructive/10 bg-background/50 hover:bg-destructive/5 transition-colors text-[11px] font-medium"
            >
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Aadhaar
                </span>
                <span className="text-[10px] text-muted-foreground ml-4.5 font-mono">{rider.aadhaarNumber}</span>
              </div>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <a 
              href={rider.drivingLicenseImageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-xl border border-destructive/10 bg-background/50 hover:bg-destructive/5 transition-colors text-[11px] font-medium"
            >
               <div className="flex flex-col">
                <span className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    DL
                </span>
                <span className="text-[10px] text-muted-foreground ml-4.5 font-mono">{rider.drivingLicenseNumber}</span>
              </div>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>
        </div>

        {/* Controls */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={`approve-${rider.id}`} className="text-xs font-semibold flex items-center gap-2">
               Approve Rider
            </Label>
            <Switch 
                id={`approve-${rider.id}`} 
                checked={rider.isApproved} 
                onCheckedChange={() => onToggleApproval(rider.id, rider.isApproved)}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Verification Status</Label>
            <Select 
                value={rider.verificationStatus} 
                onValueChange={(val) => onUpdateVerification(rider.id, val as any)}
            >
              <SelectTrigger className="h-9 rounded-xl border-destructive/10 bg-background/50 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
