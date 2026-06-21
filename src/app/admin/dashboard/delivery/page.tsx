

'use client';

import { useState } from 'react';
import { useDelivery } from '@/context/delivery-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import type { DeliveryBoy as DeliveryBoyType } from '@/types';
import DeliveryBoyForm from './delivery-boy-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVendor } from '@/context/vendor-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

export default function AdminDeliveryPage() {
  const { deliveryTeam, removeDeliveryBoy, toggleRiderApproval } = useDelivery();
  const { vendor } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBoy, setSelectedBoy] = useState<DeliveryBoyType | null>(null);
  const [boyToDelete, setBoyToDelete] = useState<string | null>(null);
  
  const handleAddNew = () => {
    setSelectedBoy(null);
    setIsFormOpen(true);
  };
  
  const handleEdit = (boy: DeliveryBoyType) => {
    setSelectedBoy(boy);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if(boyToDelete) {
        await removeDeliveryBoy(boyToDelete);
        setBoyToDelete(null);
    }
  };

  const handleApprovalToggle = async (boy: DeliveryBoyType) => {
    await toggleRiderApproval(boy.id, boy.isApproved);
  }

  const isAddDisabled = !vendor?.isApproved;

  const getTooltipContent = () => {
    if (!vendor?.isApproved) {
        return "Your account needs admin approval to add delivery personnel.";
    }
    return "";
  }

  const AddButton = () => (
    <Button onClick={handleAddNew} size="sm" className="rounded-full" disabled={isAddDisabled}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add
    </Button>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Delivery Team</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Delivery Personnel</CardTitle>
            <div className="pt-2">
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="inline-block"> 
                                <AddButton />
                            </div>
                        </TooltipTrigger>
                        {isAddDisabled && (
                            <TooltipContent>
                                {getTooltipContent()}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryTeam.length > 0 ? (
                deliveryTeam.map(boy => (
                  <TableRow key={boy.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={boy.image} alt={boy.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{boy.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{boy.name}</TableCell>
                    <TableCell>{boy.username}</TableCell>
                    <TableCell>{boy.contact}</TableCell>
                    <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`approval-switch-${boy.id}`}
                            checked={boy.isApproved}
                            onCheckedChange={() => handleApprovalToggle(boy)}
                          />
                          <Label htmlFor={`approval-switch-${boy.id}`}>
                            {boy.isApproved ? 'Yes' : 'No'}
                          </Label>
                        </div>
                      </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(boy)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setBoyToDelete(boy.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No delivery team members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeliveryBoyForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        deliveryBoy={selectedBoy}
      />
      <ConfirmationDialog
        isOpen={!!boyToDelete}
        onOpenChange={() => setBoyToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently remove the delivery person from your team."
      />
    </div>
  );
}
