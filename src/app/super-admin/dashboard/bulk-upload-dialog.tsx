'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Vendor, MenuItem, Customization, CustomizationOption } from '@/types';
import { useMenu } from '@/context/menu-context';
import {
  Loader2,
  Upload,
  FileText,
  Download,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { createSlug } from '@/lib/utils';
import { doc, getDocs, query, collection, where, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { SUPPORTED_AI_IMAGE_MODELS, SupportedImageModel, MODEL_COST_PER_IMAGE } from '@/lib/ai/menu-image-prompt';
import { useAiGeneration, QueuedDishItem } from '@/context/ai-generation-context';

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
  const {
    queuedItems: globalQueuedItems,
    isGenerating: globalIsGenerating,
    isPaused: globalIsPaused,
    isFinished: globalIsFinished,
    completedCount: globalCompletedCount,
    failedCount: globalFailedCount,
    totalCount: globalTotalCount,
    startBatchGeneration,
    pauseGeneration,
    resumeGeneration,
    retryFailed,
  } = useAiGeneration();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Multi-step modal state
  const [step, setStep] = useState<'upload' | 'ai-confirm' | 'ai-generating'>('upload');
  const [localPendingItems, setLocalPendingItems] = useState<QueuedDishItem[]>([]);
  const [createdCategories, setCreatedCategories] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<SupportedImageModel>('gemini-2.5-flash-image');
  const [duplicateSkipped, setDuplicateSkipped] = useState<string[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const vendorCategories = useMemo(() => {
    if (!vendor) return [];
    return allCategories
        .filter(cat => cat.shopName === 'global' || cat.shopName === vendor.shopName)
        .map(cat => cat.name);
  }, [allCategories, vendor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadErrors([]);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,price,discountPrice,category,description,isVeg,stock,isPopular,customizations';
    const sampleRow1 = 'Chicken Tikka,250,299,Starters,Juicy tandoori chicken chunks,false,100,true,"Portion|SINGLE|1|Half:130:150:50:true,Full:250:299:50:true"';
    const sampleRow2 = 'Paneer Butter Masala,220,,Main Course,Rich creamy cottage cheese curry,true,50,false,';
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${sampleRow1}\n${sampleRow2}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'menu_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const generateUniqueSlug = async (name: string, vendorUsername: string): Promise<string> => {
    let baseSlug = createSlug(name);
    let slug = baseSlug;
    let counter = 1;
    const q = query(collection(db, 'menuItems'), where('vendorUsername', '==', vendorUsername), where('slug', '==', slug));
    let querySnapshot = await getDocs(q);
    while (!querySnapshot.empty) {
      slug = `${baseSlug}-${counter}`;
      const nextQ = query(collection(db, 'menuItems'), where('vendorUsername', '==', vendorUsername), where('slug', '==', slug));
      querySnapshot = await getDocs(nextQ);
      counter++;
    }
    return slug;
  };

  const handleUpload = async () => {
    if (!selectedFile || !vendor) return;
    setIsUploading(true);
    setUploadErrors([]);
    const errors: string[] = [];
    const newItemsToQueue: QueuedDishItem[] = [];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('File is empty.');
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row.');
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'price', 'category'];
        for (const req of requiredHeaders) {
          if (!headers.includes(req)) throw new Error(`Missing required column: "${req}".`);
        }
        const nameIndex = headers.indexOf('name');
        const priceIndex = headers.indexOf('price');
        const discountPriceIndex = headers.indexOf('discountprice');
        const categoryIndex = headers.indexOf('category');
        const descriptionIndex = headers.indexOf('description');
        const isVegIndex = headers.indexOf('isveg');
        const stockIndex = headers.indexOf('stock');
        const isPopularIndex = headers.indexOf('ispopular');
        const customizationsIndex = headers.indexOf('customizations');

        const batch = writeBatch(db);
        let successfulUploads = 0;
        const existingCategoryNames = new Set(
          allCategories.map((c) => c.name.trim().toLowerCase())
        );
        const newCategoriesToCreate = new Map<string, string>(); // slug -> display name

        // --- Duplicate detection: fetch all existing item names for this vendor (one query) ---
        const existingItemsSnap = await getDocs(
          query(collection(db, 'menuItems'), where('vendorUsername', '==', vendor.username))
        );
        const existingItemNames = new Set(
          existingItemsSnap.docs.map((d) => (d.data().name as string)?.trim().toLowerCase())
        );
        const duplicates: string[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;
          const rowNum = i + 1;
          const name = row[nameIndex]?.trim();
          const priceStr = row[priceIndex]?.trim();
          const categoryStr = row[categoryIndex]?.trim();
          const description = descriptionIndex !== -1 ? row[descriptionIndex]?.trim() : '';
          const isVegStr = isVegIndex !== -1 ? row[isVegIndex]?.trim() : '';
          const isPopularStr = isPopularIndex !== -1 ? row[isPopularIndex]?.trim() : '';
          const stockStr = stockIndex !== -1 ? row[stockIndex]?.trim() : '';
          const discountPriceStr = discountPriceIndex !== -1 ? row[discountPriceIndex]?.trim() : '';
          const customizationsStr = customizationsIndex !== -1 ? row[customizationsIndex]?.trim() : '';
          if (!name || !priceStr || !categoryStr) {
            errors.push(`Row ${rowNum}: Missing mandatory field(s). Skipping.`);
            continue;
          }

          // Skip if item with same name already exists for this vendor
          if (existingItemNames.has(name.trim().toLowerCase())) {
            duplicates.push(name);
            continue;
          }

          // Track new categories to auto-register into global taxonomy
          const trimmedCategory = categoryStr.trim();
          const lowerCategory = trimmedCategory.toLowerCase();
          if (!existingCategoryNames.has(lowerCategory)) {
            const catSlug = createSlug(trimmedCategory);
            if (!newCategoriesToCreate.has(catSlug)) {
              newCategoriesToCreate.set(catSlug, trimmedCategory);
            }
          }

          let parsedPrice = parseFloat(priceStr);
          let parsedDiscountPrice = discountPriceStr ? parseFloat(discountPriceStr) : undefined;
          let isDiscountActive = false;
          let activePrice = parsedPrice;
          let originalPrice = parsedDiscountPrice;
          if (parsedDiscountPrice !== undefined) {
            if (parsedDiscountPrice > parsedPrice) { isDiscountActive = true; activePrice = parsedPrice; originalPrice = parsedDiscountPrice; }
            else if (parsedPrice > parsedDiscountPrice) { isDiscountActive = true; activePrice = parsedDiscountPrice; originalPrice = parsedPrice; }
          }
          let hasAnyVariationDiscount = false;
          const customizations = parseCustomizations(customizationsStr, () => { hasAnyVariationDiscount = true; });
          if (customizations.length > 0) isDiscountActive = hasAnyVariationDiscount;
          const isVeg = isVegStr ? (isVegStr.toLowerCase() === 'true' || isVegStr.toLowerCase() === 'yes' || isVegStr === '1') : false;
          const isPopular = isPopularStr ? (isPopularStr.toLowerCase() === 'true' || isPopularStr.toLowerCase() === 'yes' || isPopularStr === '1') : false;
          const stock = stockStr ? parseInt(stockStr, 10) : undefined;
          const slug = await generateUniqueSlug(name, vendor.username);
          const docId = `${createSlug(vendor.shopName || vendor.username)}-${slug}`;
          const itemRef = doc(db, 'menuItems', docId);
          const newItemData: Omit<MenuItem, 'id'> = {
            name, price: activePrice, discountPrice: originalPrice || undefined, isDiscountActive,
            category: categoryStr, description: description || '', image: 'https://placehold.co/400x225/222222/4AF0FF',
            isAvailable: true, isVeg, isPopular, stock: (stock === undefined || isNaN(stock)) ? undefined : stock,
            customizations: customizations.length > 0 ? customizations : undefined,
            vendorUsername: vendor.username, shopName: vendor.shopName || vendor.name, aiHint: name, slug,
          };
          batch.set(itemRef, Object.fromEntries(Object.entries(newItemData).filter(([_, v]) => v !== undefined)));
          successfulUploads++;
          newItemsToQueue.push({ docId, name, category: categoryStr, description: description || '', vendorUsername: vendor.username, status: 'queued' });
        }

        // Auto-persist newly discovered categories into global categories collection
        const newlyAddedCategoriesList: string[] = [];
        newCategoriesToCreate.forEach((displayName, catSlug) => {
          const catDocId = `global-${catSlug}`;
          const catRef = doc(db, 'categories', catDocId);
          batch.set(
            catRef,
            {
              name: displayName,
              shopName: 'global',
              vendorCategory: vendor.category || 'all',
              aiHint: displayName,
            },
            { merge: true }
          );
          newlyAddedCategoriesList.push(displayName);
        });

        setDuplicateSkipped(duplicates);
        if (successfulUploads > 0) await batch.commit();
        if (successfulUploads > 0) {
          setLocalPendingItems(newItemsToQueue);
          setCreatedCategories(newlyAddedCategoriesList);
          setStep('ai-confirm');
        } else if (duplicates.length > 0 && successfulUploads === 0) {
          toast({
            title: `All ${duplicates.length} items already exist`,
            description: 'No new items were added. See the duplicate list below.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'No Items Added',
            description: 'No valid rows were found in the uploaded CSV.',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({ title: 'Upload Failed', description: error.message || 'Error occurred.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const startAiGeneration = () => {
    if (localPendingItems.length > 0) {
      startBatchGeneration(localPendingItems, selectedModel);
      setStep('ai-generating');
    }
  };

  const handleDialogClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setSelectedFile(null);
      setLocalPendingItems([]);
      setCreatedCategories([]);
      setUploadErrors([]);
      setDuplicateSkipped([]);
    }, 300);
  };

  const currentQueuedList = step === 'ai-generating' ? globalQueuedItems : localPendingItems;
  const displayTotal = step === 'ai-generating' ? globalTotalCount : localPendingItems.length;
  const displayCompleted = step === 'ai-generating' ? globalCompletedCount : 0;
  const displayFailed = step === 'ai-generating' ? globalFailedCount : 0;
  const progressPercent = displayTotal > 0 ? Math.round((displayCompleted / displayTotal) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg">
        {/* STEP 1: CSV FILE UPLOAD */}
        {step === 'upload' && (
          <>
            <DialogHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">Bulk Menu Upload</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {vendor?.shopName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Step indicators */}
            <div className="flex items-center gap-2 py-1">
              {['Upload CSV', 'AI Photos', 'Processing'].map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${
                    i === 0 ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{label}</span>
                  {i < 2 && <div className="flex-1 h-px bg-border" />}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {/* Drop zone */}
              <div
                className="relative border-2 border-dashed border-border hover:border-primary/60 transition-colors rounded-2xl p-6 text-center cursor-pointer group bg-muted/20 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-muted mx-auto flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Drop your CSV file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse · Columns: name, price, category, description, isVeg, stock, isPopular, customizations</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Download template link */}
              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
              >
                <Download className="h-3.5 w-3.5" />
                Download sample CSV template
              </button>

              {/* Upload errors */}
              {uploadErrors.length > 0 && (
                <div className="p-3 border border-destructive/40 bg-destructive/8 rounded-xl space-y-1.5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {uploadErrors.length} row warning{uploadErrors.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                    {uploadErrors.map((error, i) => (
                      <li key={i} className="text-[11px] text-destructive/80">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duplicate banner — triggers modal */}
              {duplicateSkipped.length > 0 && (
                <button
                  onClick={() => setIsDuplicateModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-500/40 bg-amber-500/8 hover:bg-amber-500/15 transition-colors group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {duplicateSkipped.length} item{duplicateSkipped.length > 1 ? 's' : ''} skipped — already in menu
                      </p>
                      <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80">Tap to see which items were skipped</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium group-hover:underline shrink-0">View →</span>
                </button>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" onClick={handleDialogClose} className="text-muted-foreground">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="gap-2">
                {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Upload Menu'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* DUPLICATE ITEMS MODAL */}
        {isDuplicateModalOpen && (
          <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-base">Duplicate Items Skipped</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      {duplicateSkipped.length} item{duplicateSkipped.length > 1 ? 's' : ''} already exist in this vendor's menu and were not added again.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-64 pr-2">
                <div className="space-y-1.5 py-1">
                  {duplicateSkipped.map((name, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 border">
                      <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button onClick={() => setIsDuplicateModalOpen(false)} className="w-full">Got it</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* STEP 2: AI CONFIRMATION PROMPT */}
        {step === 'ai-confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <DialogTitle>Menu Uploaded Successfully!</DialogTitle>
              </div>
              <DialogDescription>
                <strong>{localPendingItems.length} items</strong> have been added to {vendor?.shopName}'s menu.
                {createdCategories.length > 0 && (
                  <span className="block mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Registered {createdCategories.length} new global categories: {createdCategories.join(', ')}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <h4 className="font-bold text-sm text-foreground">Generate Studio AI Food Photos?</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically generate high-definition, appetizing commercial food photography for all {localPendingItems.length} dishes using your custom 45° angle & matte black tableware theme.
                </p>

                <div className="space-y-2 pt-2 border-t border-primary/10">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Select AI Generation Model:
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={(val: SupportedImageModel) => setSelectedModel(val)}
                  >
                    <SelectTrigger className="w-full bg-background/80">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_AI_IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{m.name}</span>
                            <span className="text-xs font-mono text-muted-foreground ml-auto shrink-0">{m.cost}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl border">
                  <span className="text-muted-foreground block">Dishes to Process</span>
                  <span className="font-bold text-sm text-foreground">{localPendingItems.length} items</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border">
                  <span className="text-muted-foreground block">Estimated Total Cost</span>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    ~₹{(localPendingItems.length * MODEL_COST_PER_IMAGE[selectedModel]).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({MODEL_COST_PER_IMAGE[selectedModel].toFixed(1)} × {localPendingItems.length} items)
                  </span>
                </div>
              </div>
            </div>

            <div className="px-1 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>Cost Warning:</strong> Generating images for {localPendingItems.length} dishes will cost approximately{' '}
                <strong>₹{(localPendingItems.length * MODEL_COST_PER_IMAGE[selectedModel]).toFixed(0)}</strong> at current Google API pricing ({MODEL_COST_PER_IMAGE[selectedModel].toFixed(1)}/image). This cannot be undone.
              </span>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={handleDialogClose} className="text-muted-foreground">
                Skip for Now
              </Button>
              <Button onClick={startAiGeneration} className="bg-primary gap-2">
                <Sparkles className="h-4 w-4" />
                Yes, Generate AI Images
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP 3: LIVE BATCH GENERATION TRACKER */}
        {step === 'ai-generating' && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <DialogTitle className="text-base">
                    {globalIsFinished ? 'Image Generation Complete' : 'Generating AI Menu Photos'}
                  </DialogTitle>
                </div>
                {!globalIsFinished && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={globalIsPaused ? resumeGeneration : pauseGeneration}
                    className="h-7 text-xs gap-1"
                  >
                    {globalIsPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    {globalIsPaused ? 'Resume' : 'Pause'}
                  </Button>
                )}
              </div>
              <DialogDescription>
                {displayCompleted} of {displayTotal} items completed ({progressPercent}%)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Progress value={progressPercent} className="h-2" />

              <ScrollArea className="h-64 border rounded-xl p-2">
                <div className="space-y-2">
                  {currentQueuedList.map((item) => (
                    <div
                      key={item.docId}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="h-9 w-9 rounded-md object-cover border shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            {item.status === 'generating' ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : item.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.category}</p>
                          {item.error && (
                            <p className="text-[10px] text-destructive font-medium truncate">{item.error}</p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.status === 'completed' && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0">
                            ✓ Ready
                          </Badge>
                        )}
                        {item.status === 'generating' && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-500 border-0 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Generating
                          </Badge>
                        )}
                        {item.status === 'queued' && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Queued
                          </Badge>
                        )}
                        {item.status === 'failed' && (
                          <Badge variant="destructive" className="text-[10px]">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {displayFailed > 0 && globalIsFinished && (
                <div className="flex items-center justify-between p-3 border border-destructive/30 bg-destructive/5 rounded-xl text-xs">
                  <span className="text-destructive font-medium">{displayFailed} items failed to generate.</span>
                  <Button size="sm" variant="outline" onClick={retryFailed} className="h-7 text-xs gap-1">
                    <RotateCcw className="h-3 w-3" /> Retry Failed
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleDialogClose} className="w-full sm:w-auto">
                {globalIsFinished ? 'Done' : 'Run in Background & Close'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

