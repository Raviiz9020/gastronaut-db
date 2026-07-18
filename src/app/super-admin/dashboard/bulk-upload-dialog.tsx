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
import type { Vendor, MenuItem, Category, Customization, CustomizationOption } from '@/types';
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

// State-machine CSV parser that correctly handles quotes and commas
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(cell);
      result.push(row);
      row = [];
      cell = '';
    } else if (char === '\r') {
      // Ignore carriage return
    } else {
      cell += char;
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  
  return result;
}

// Parses customizations string formatted as: GroupName|Type|MinSelect|OptionName:Price:OriginalPrice:Stock:IsAvailable
function parseCustomizations(customizationsStr: string, onDiscountDetected: () => void): Customization[] {
  if (!customizationsStr) return [];
  
  const groups: Customization[] = [];
  const groupStrings = customizationsStr.split(';');
  
  for (const groupStr of groupStrings) {
    if (!groupStr.trim()) continue;
    
    const parts = groupStr.split('|');
    if (parts.length < 4) continue;
    
    const name = parts[0].trim();
    const type = parts[1].trim().toUpperCase();
    if (type !== 'SINGLE' && type !== 'MULTI') continue;
    
    const minSelect = parseInt(parts[2].trim(), 10) || 0;
    const optionsStr = parts[3].trim();
    if (!name) continue;
    
    const options: CustomizationOption[] = [];
    const optionStrings = optionsStr.split(',');
    
    for (const optStr of optionStrings) {
      if (!optStr.trim()) continue;
      
      const optParts = optStr.split(':');
      const optName = optParts[0]?.trim();
      const optPriceStr = optParts[1]?.trim();
      const optOriginalPriceStr = optParts[2]?.trim();
      const optStockStr = optParts[3]?.trim();
      const optIsAvailableStr = optParts[4]?.trim();
      
      if (!optName || !optPriceStr) continue;
      
      let optPrice = parseFloat(optPriceStr);
      let optOriginalPrice = optOriginalPriceStr ? parseFloat(optOriginalPriceStr) : undefined;
      const optStock = optStockStr ? parseInt(optStockStr, 10) : undefined;
      const optIsAvailable = optIsAvailableStr ? optIsAvailableStr.toLowerCase() === 'true' : true;
      
      if (optOriginalPrice) {
        if (optOriginalPrice > optPrice) {
          onDiscountDetected();
        } else {
          // Swap if needed to make price the active sale price
          const temp = optPrice;
          optPrice = optOriginalPrice;
          optOriginalPrice = temp;
          onDiscountDetected();
        }
      }
      
      const optionObj: CustomizationOption = {
        id: Math.random().toString(36).substring(2, 11),
        name: optName,
        price: optPrice,
        isAvailable: optIsAvailable,
      };
      if (optOriginalPrice !== undefined) optionObj.originalPrice = optOriginalPrice;
      if (optStock !== undefined && !isNaN(optStock)) optionObj.stock = optStock;

      options.push(optionObj);
    }
    
    if (options.length > 0) {
      groups.push({
        id: Math.random().toString(36).substring(2, 11),
        name,
        type: type as 'SINGLE' | 'MULTI',
        minSelect,
        options,
      });
    }
  }
  
  return groups;
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
    const headers = "name,price,discountPrice,category,description,isVeg,stock,isPopular,customizations\n";
    const sampleRow1 = 'Classic Burger,120,,Burgers,"A delicious flame-grilled burger",true,50,true,"Portion|SINGLE|1|Half:60,Full:120;Add-ons|MULTI|0|Extra cheese:20,Extra paneer:20"\n';
    const sampleRow2 = 'Veg Pizza,250,300,Pizza,"Fresh garden veggies with mozzarella",true,,false,\n';
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + sampleRow1 + sampleRow2);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
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
      const allRows = parseCSV(csvText);
      
      if (allRows.length === 0) {
        toast({ title: 'Empty CSV file', description: 'Please use the template containing at least a header row.', variant: 'destructive'});
        setIsUploading(false);
        return;
      }

      const headerRow = allRows[0];
      const headers = headerRow.map(h => h.trim().toLowerCase());
      
      const required = ['name', 'price', 'category'];
      const missing = required.filter(req => !headers.includes(req));
      
      if (missing.length > 0) {
        toast({ 
          title: 'Invalid CSV format', 
          description: `Missing required columns: ${missing.join(', ')}. Please use the template.`, 
          variant: 'destructive'
        });
        setIsUploading(false);
        return;
      }

      // Map header index dynamically
      const colIndex = (colName: string) => headers.indexOf(colName);

      const itemsToUpload = allRows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
      const errors: string[] = [];
      let successfulUploads = 0;
      
      // Keep a local copy of vendor categories to allow auto-creation
      const localVendorCategories = [...vendorCategories];
      
      try {
        const batch = writeBatch(db);
        for (let i = 0; i < itemsToUpload.length; i++) {
          const fields = itemsToUpload[i];
          const rowNumber = i + 2;

          const name = fields[colIndex('name')]?.trim();
          const priceStr = fields[colIndex('price')]?.trim();
          const category = fields[colIndex('category')]?.trim();
          const discountPriceStr = colIndex('discountprice') !== -1 ? fields[colIndex('discountprice')]?.trim() : '';
          const description = colIndex('description') !== -1 ? fields[colIndex('description')]?.trim() : '';
          const isVegStr = colIndex('isveg') !== -1 ? fields[colIndex('isveg')]?.trim() : '';
          const stockStr = colIndex('stock') !== -1 ? fields[colIndex('stock')]?.trim() : '';
          const isPopularStr = colIndex('ispopular') !== -1 ? fields[colIndex('ispopular')]?.trim() : '';
          const customizationsStr = colIndex('customizations') !== -1 ? fields[colIndex('customizations')]?.trim() : '';

          if (!name || !priceStr || !category) {
            errors.push(`Row ${rowNumber}: Skipping incomplete row.`);
            continue;
          }

          // Case-insensitive category match
          let existingCategory = localVendorCategories.find(
            catName => catName.toLowerCase().trim() === category.toLowerCase().trim()
          );

          if (!existingCategory) {
            // Automatically stage the category for creation
            const shopName = vendor.shopName || vendor.name;
            const categorySlug = `${createSlug(shopName)}-${createSlug(category)}`;
            const categoryRef = doc(db, 'categories', categorySlug);
            
            const newCategoryData = {
              name: category,
              shopName: shopName,
              imageUrl: '',
              blurDataUrl: '',
              aiHint: category
            };
            
            batch.set(categoryRef, newCategoryData);
            localVendorCategories.push(category);
            existingCategory = category;
          }

          // Parse prices
          let activePrice = parseFloat(priceStr);
          let originalPrice: number | null = discountPriceStr ? parseFloat(discountPriceStr) : null;
          let isDiscountActive = false;

          if (originalPrice) {
            if (originalPrice > activePrice) {
              isDiscountActive = true;
            } else {
              // Swap if wrong order
              const temp = activePrice;
              activePrice = originalPrice;
              originalPrice = temp;
              isDiscountActive = true;
            }
          }

          // Parse customizations
          let hasAnyVariationDiscount = false;
          const customizations = parseCustomizations(customizationsStr || '', () => {
            hasAnyVariationDiscount = true;
          });

          // Adjust isDiscountActive if customizations are present
          if (customizations.length > 0) {
            isDiscountActive = hasAnyVariationDiscount;
          }

          // Parse other optional fields
          const isVeg = isVegStr ? (isVegStr.toLowerCase() === 'true' || isVegStr.toLowerCase() === 'yes' || isVegStr === '1') : false;
          const isPopular = isPopularStr ? (isPopularStr.toLowerCase() === 'true' || isPopularStr.toLowerCase() === 'yes' || isPopularStr === '1') : false;
          const stock = stockStr ? parseInt(stockStr, 10) : undefined;

          const slug = await generateUniqueSlug(name, vendor.username);
          const docId = `${createSlug(vendor.shopName || vendor.username)}-${slug}`;
          const itemRef = doc(db, 'menuItems', docId);

          const newItemData: Omit<MenuItem, 'id'> = {
            name,
            price: activePrice,
            discountPrice: originalPrice || undefined,
            isDiscountActive,
            category: existingCategory,
            description: description || '',
            image: 'https://placehold.co/400x225/222222/4AF0FF',
            isAvailable: true,
            isVeg,
            isPopular,
            stock: (stock === undefined || isNaN(stock)) ? undefined : stock,
            customizations: customizations.length > 0 ? customizations : undefined,
            vendorUsername: vendor.username,
            shopName: vendor.shopName || vendor.name,
            aiHint: name,
            slug,
          };

          // Safety: Remove all 'undefined' values before sending to Firestore
          const cleanItemData = Object.fromEntries(
            Object.entries(newItemData).filter(([_, v]) => v !== undefined)
          );

          batch.set(itemRef, cleanItemData);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Menu for {vendor?.shopName}</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: `name`, `price`, `discountPrice`, `category`, `description`, `isVeg`, `stock`, `isPopular`, `customizations`.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="p-4 border rounded-2xl space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><ListChecks className="h-4 w-4"/>Available Categories</h4>
                <p className="text-xs text-muted-foreground">Copy and paste these category names, or type new ones to auto-create them.</p>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2">
                    {vendorCategories.map(cat => (
                        <div key={cat} className="bg-muted text-muted-foreground text-xs font-mono p-1 px-2 rounded-md">{cat}</div>
                    ))}
                  </div>
                </ScrollArea>
            </div>

            <div className="p-4 border border-dashed rounded-2xl space-y-2 bg-muted/25">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">Customizations Syntax (Optional)</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Use the following syntax for the `customizations` column:
                  <br />
                  <code className="inline-block mt-1 font-mono text-xs bg-muted px-1 py-0.5 rounded text-destructive">GroupName|Type|MinSelect|OptionName:Price</code>
                  <br />
                  Multiple options are comma-separated, and groups are semicolon-separated.
                </p>
                <code className="block text-[10px] bg-slate-900 text-slate-100 p-2 rounded-md font-mono whitespace-normal break-all">
                  Portion|SINGLE|1|Half:60,Full:120;Add-ons|MULTI|0|Extra cheese:20
                </code>
            </div>

            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
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
