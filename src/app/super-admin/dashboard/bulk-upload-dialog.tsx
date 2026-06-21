'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Vendor, MenuItem, Category } from '@/types';
import { useMenu } from '@/context/menu-context';
import { Loader2, Upload, FileText, Download, ListChecks, AlertTriangle } from 'lucide-react';
import { createSlug } from '@/lib/utils';
import { doc, getDocs, query, collection, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vendor: Vendor | null;
}

export default function BulkUploadDialog({ isOpen, onOpenChange, vendor }: BulkUploadDialogProps) {
  const { toast } = useToast();
  const { categories: allCategories } = useMenu();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const vendorCategories = useMemo(() => {
    if (!vendor) return [];
    return allCategories
        .filter(cat => cat.shopName === 'global' || cat.shopName === vendor.shopName)
        .map(cat => cat.name);
  }, [allCategories, vendor]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadErrors([]);
    } else {
      toast({ title: 'Invalid File Type', description: 'Please upload a CSV file.', variant: 'destructive' });
      setSelectedFile(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,price,category,description\n" 
      + "Sample Item,150,Main Course,\"A delicious sample dish.\"\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "menu_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const generateUniqueSlug = async (name: string, vendorUsername: string): Promise<string> => {
    let slug = createSlug(name);
    let isUnique = false;
    let counter = 1;
    while (!isUnique) {
      const q = query(
        collection(db, 'menuItems'),
        where('vendorUsername', '==', vendorUsername),
        where('slug', '==', slug)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        isUnique = true;
      } else {
        slug = `${createSlug(name)}-${counter}`;
        counter++;
      }
    }
    return slug;
  };

  const handleUpload = async () => {
    if (!selectedFile || !vendor) return;

    setIsUploading(true);
    setUploadErrors([]);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      const header = lines[0].split(',').map(h => h.trim());
      
      if (header.join(',') !== 'name,price,category,description') {
          toast({ title: 'Invalid CSV format', description: 'Please use the provided template with columns: name,price,category,description', variant: 'destructive'});
          setIsUploading(false);
          return;
      }

      const itemsToUpload = lines.slice(1);
      const errors: string[] = [];
      let successfulUploads = 0;
      
      try {
        const batch = writeBatch(db);
        for (let i = 0; i < itemsToUpload.length; i++) {
          const line = itemsToUpload[i];
          const fields = line.split(',');
          const name = fields[0]?.trim();
          const price = fields[1]?.trim();
          const category = fields[2]?.trim();
          // Description might contain commas, so join the rest of the fields
          const description = fields.slice(3).join(',').trim().replace(/^"|"$/g, ''); // Remove quotes
          
          const rowNumber = i + 2;

          if (!name || !price || !category) {
            errors.push(`Row ${rowNumber}: Skipping incomplete row.`);
            continue;
          }

          if (!vendorCategories.includes(category)) {
            errors.push(`Row ${rowNumber}: Invalid category "${category}". Please use one of the available categories.`);
            continue;
          }

          const slug = await generateUniqueSlug(name, vendor.username);
          const docId = `${createSlug(vendor.shopName || vendor.username)}-${slug}`;
          const itemRef = doc(db, 'menuItems', docId);

          const newItemData: Omit<MenuItem, 'id'> = {
            name,
            price: parseFloat(price),
            category,
            description: description || '',
            image: 'https://placehold.co/400x225/222222/4AF0FF',
            isAvailable: true,
            vendorUsername: vendor.username,
            shopName: vendor.shopName || vendor.name,
            aiHint: name,
            slug,
          };

          batch.set(itemRef, newItemData);
          successfulUploads++;
        }

        if (successfulUploads > 0) {
            await batch.commit();
        }
        
        if (errors.length > 0) {
          setUploadErrors(errors);
          toast({ title: 'Upload Complete with Errors', description: `Successfully uploaded ${successfulUploads} items. Some rows were skipped.`, variant: 'destructive' });
        } else {
          toast({ title: 'Upload Successful', description: `${successfulUploads} items have been added to the menu.`});
          onOpenChange(false);
          setSelectedFile(null);
        }

      } catch (error: any) {
        console.error("Bulk upload error: ", error);
        toast({ title: 'Upload Failed', description: error.message || 'An error occurred during the upload.', variant: 'destructive'});
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(selectedFile);
  };
  
  const handleDialogClose = () => {
    onOpenChange(false);
    // Add a small delay to allow dialog to close before clearing state
    setTimeout(() => {
        setSelectedFile(null);
        setUploadErrors([]);
    }, 300);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Menu for {vendor?.shopName}</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: `name`, `price`, `category`, `description`.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="p-4 border rounded-2xl space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><ListChecks className="h-4 w-4"/>Available Categories</h4>
                <p className="text-xs text-muted-foreground">Copy and paste these exact category names into your CSV file.</p>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2">
                    {vendorCategories.map(cat => (
                        <div key={cat} className="bg-muted text-muted-foreground text-xs font-mono p-1 px-2 rounded-md">{cat}</div>
                    ))}
                  </div>
                </ScrollArea>
            </div>

            <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>

            <div className="space-y-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <FileText className="mr-2 h-4 w-4"/>
                    {selectedFile ? selectedFile.name : "Choose CSV File"}
                </Button>
            </div>
            {uploadErrors.length > 0 && (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-2xl space-y-2 max-h-40 overflow-y-auto">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4"/>Upload Errors</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-destructive/90">
                        {uploadErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>Close</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2 h-4 w-4"/>}
            {isUploading ? `Uploading...` : `Upload ${selectedFile ? `(${selectedFile.name})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
