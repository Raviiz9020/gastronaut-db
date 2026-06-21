
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { GmbLocation } from '@/types';
import { Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GmbLocationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  locations: GmbLocation[];
  onLocationSelect: (locationId: string) => void;
}

export default function GmbLocationDialog({ isOpen, onOpenChange, locations, onLocationSelect }: GmbLocationDialogProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const handleConfirm = () => {
    if (selectedLocation) {
        onLocationSelect(selectedLocation);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Choose Your Business Profile
          </DialogTitle>
          <DialogDescription>
            Select the Google Business Profile you want to link to this vendor account.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
            <RadioGroup value={selectedLocation} onValueChange={setSelectedLocation} className="space-y-2">
                {locations.map((loc) => (
                    <Label
                        key={loc.locationId}
                        htmlFor={loc.locationId}
                        className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    >
                        <RadioGroupItem value={loc.locationId} id={loc.locationId} />
                        <span className="font-semibold">{loc.locationName}</span>
                    </Label>
                ))}
            </RadioGroup>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!selectedLocation}>
            Link this Business
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
