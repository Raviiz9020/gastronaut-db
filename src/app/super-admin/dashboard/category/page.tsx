'use client';

import { useState, useMemo } from 'react';
import { useMenu } from '@/context/menu-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Edit,
  Trash2,
  Globe,
  Search,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Layers,
  UtensilsCrossed,
  Store,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types';
import CategoryForm from './category-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminCategoryPage() {
  const { globalCategories, removeCategory } = useMenu();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const handleAddNew = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Category) => {
    setSelectedCategory(item);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async (itemId: string) => {
    await removeCategory(itemId, true); // true for global
    setItemToDelete(null);
  };

  const stats = useMemo(() => {
    const total = globalCategories.length;
    const withImage = globalCategories.filter(c => !!c.imageUrl).length;
    const textOnly = total - withImage;
    return { total, withImage, textOnly };
  }, [globalCategories]);

  const filteredCategories = useMemo(() => {
    let list = globalCategories;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.vendorCategory && c.vendorCategory.toLowerCase().includes(q))
      );
    }
    return list;
  }, [globalCategories, searchTerm]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
                <Globe className="h-3 w-3" />
                GLOBAL TAXONOMY
              </span>
              <span className="text-muted-foreground text-xs font-semibold">
                {stats.total} Food & Menu Categories
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Global Menu Categories</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Create and maintain platform-wide menu dish categories across all merchant stores
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Add New Category Button */}
            <Button
              onClick={handleAddNew}
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Category</span>
            </Button>

            {/* View Mode Switcher */}
            <div className="bg-muted p-1 rounded-2xl border border-border/70 flex items-center gap-1 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold transition-all",
                  viewMode === 'grid'
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold transition-all",
                  viewMode === 'table'
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Table
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3-KPI Bento Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Menu Categories</span>
            <UtensilsCrossed className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Standardized menu categories</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">With Custom Artwork</span>
            <ImageIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.withImage}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Uploaded dish graphics</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Text Only</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.textOnly}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Default dish badge</p>
        </div>
      </div>

      {/* 3. Search Bar Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/70 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu category, store classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-full border-border/70 bg-background"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
          Showing {filteredCategories.length} of {globalCategories.length} categories
        </span>
      </div>

      {/* 4. Content Area (Cards vs Table) */}
      {filteredCategories.length > 0 ? (
        viewMode === 'grid' ? (
          /* Compact Bento Cards Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filteredCategories.map((item, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  key={item.id}
                >
                  <Card className="rounded-2xl overflow-hidden border border-border/70 bg-card hover:border-foreground/20 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between h-full group">
                    <div>
                      {/* Compact Image Preview Container */}
                      <div className="relative h-24 w-full bg-muted/30 overflow-hidden border-b border-border/50 flex items-center justify-center">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                            <UtensilsCrossed className="h-6 w-6 text-primary/40" />
                            <span className="text-[9px] font-bold">No Artwork</span>
                          </div>
                        )}

                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full backdrop-blur-md shadow-xs",
                            item.imageUrl
                              ? "bg-background/90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-background/90 text-muted-foreground border border-border/60"
                          )}
                        >
                          {item.imageUrl ? "Active" : "Text"}
                        </span>
                      </div>

                      {/* Card Info */}
                      <div className="p-2.5 sm:p-3 space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold font-headline text-foreground leading-snug truncate" title={item.name}>
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground truncate" title={item.vendorCategory || 'All Vendors'}>
                          <Store className="h-2.5 w-2.5 inline mr-1 text-primary" />
                          {item.vendorCategory || 'All Vendors'}
                        </p>
                      </div>
                    </div>

                    {/* Compact Action Buttons at Bottom */}
                    <div className="p-2.5 sm:p-3 pt-0 flex items-center gap-1.5 border-t border-border/40 mt-1 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white border-amber-500/30 transition-all shadow-2xs px-2"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shadow-2xs shrink-0"
                        onClick={() => setItemToDelete(item.id)}
                        title="Delete Category"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Master Table View */
          <div className="bg-card rounded-3xl border border-border/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 text-[10px] uppercase font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Artwork</th>
                    <th className="py-3 px-4">Menu Category</th>
                    <th className="py-3 px-4">Vendor Type / Store Scope</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Artwork Preview */}
                      <td className="py-3 px-4">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden relative border border-border/60 bg-muted/40 shrink-0">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary/50">
                              <UtensilsCrossed className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Menu Category Name */}
                      <td className="py-3 px-4 font-bold text-foreground">
                        {item.name}
                      </td>

                      {/* Vendor Category Scope */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border/60 text-foreground">
                          <Store className="h-2.5 w-2.5 text-primary" />
                          {item.vendorCategory || 'All Vendors'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs",
                            item.imageUrl
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                              : "text-muted-foreground bg-muted border border-border/60"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", item.imageUrl ? "bg-emerald-500" : "bg-muted-foreground")} />
                          {item.imageUrl ? "Artwork Active" : "Text Only"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-all"
                            onClick={() => handleEdit(item)}
                            title="Edit Category"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all"
                            onClick={() => setItemToDelete(item.id)}
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 bg-card rounded-3xl border border-dashed border-border/80">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No global categories found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search query or create a new category.</p>
          </div>
          <Button
            onClick={handleAddNew}
            size="sm"
            className="rounded-full text-xs font-bold gap-1.5 px-4"
          >
            <PlusCircle className="h-4 w-4" />
            Add First Menu Category
          </Button>
        </div>
      )}

      {/* Form Drawer */}
      <CategoryForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDeleteConfirm(itemToDelete)}
        title="Delete Global Category?"
        description="This action cannot be undone. This will permanently delete the global category for all vendors."
      />
    </div>
  );
}
