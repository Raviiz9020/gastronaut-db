'use client';

import { useEffect, useState } from 'react';
import { useRiderManagement } from '@/context/rider-management-context';
import { Loader2, Bike, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import RiderCard from './rider-card';
import ConfirmationDialog from '@/components/confirmation-dialog';

export default function SuperAdminRidersPage() {
  const { riders, fetchAllRiders, toggleRiderApproval, updateVerificationStatus, deleteRider } = useRiderManagement();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riderToDelete, setRiderToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllRiders();
      setIsLoading(false);
    };
    loadData();
  }, [fetchAllRiders]);

  const filteredRiders = riders.filter(rider => 
    rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rider.contact.includes(searchTerm) ||
    rider.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Manage Riders</h2>
          <p className="text-muted-foreground text-sm mt-1">Approve and verify delivery partners</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search riders..."
            className="pl-9 rounded-2xl border-destructive/10 bg-background/50 backdrop-blur-sm focus-visible:ring-destructive"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-destructive" />
        </div>
      ) : filteredRiders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRiders.map(rider => (
            <RiderCard 
              key={rider.id}
              rider={rider}
              onToggleApproval={toggleRiderApproval}
              onUpdateVerification={updateVerificationStatus}
              onDelete={setRiderToDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/20 rounded-3xl border border-dashed border-destructive/20">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <Bike className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No riders found</h3>
            <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!riderToDelete}
        onOpenChange={(isOpen) => !isOpen && setRiderToDelete(null)}
        onConfirm={() => {
          if (riderToDelete) {
            deleteRider(riderToDelete);
            setRiderToDelete(null);
          }
        }}
        title="Delete Rider Record?"
        description="This action cannot be undone. This will permanently remove the rider from the system."
      />
    </div>
  );
}
