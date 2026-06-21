
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useExpense } from '@/context/expense-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Download, IndianRupee, FileSpreadsheet, Loader2, FileImage } from 'lucide-react';
import type { Expense } from '@/types';
import ExpenseForm from './expense-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVendor } from '@/context/vendor-context';
import { useRouter } from 'next/navigation';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


export default function AdminExpensesPage() {
  const { expenses, removeExpense, isLoading, expenseCategories, expenseIngredients } = useExpense();
  const { vendor } = useVendor();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filter, setFilter] = useState('thisMonth');

  useEffect(() => {
    if (!vendor) {
        router.replace('/admin/login');
        return;
    }
    if (!vendor.isExpenseTrackingEnabled) {
        router.replace('/admin/dashboard');
    }
    handleFilterChange('thisMonth'); // Set initial date range
  }, [vendor, router]);
  
  const handleAddNew = () => {
    setSelectedExpense(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Expense) => {
    setSelectedExpense(item);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async (itemId: string) => {
    await removeExpense(itemId);
    setExpenseToDelete(null);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const now = new Date();
    switch (value) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'last7':
        setDateRange({ from: subDays(now, 6), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'thisYear':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case 'all':
      default:
        setDateRange(undefined);
        break;
    }
  };
  
  const filteredExpenses = useMemo(() => {
    let items = expenses;
    if (dateRange?.from) {
        items = items.filter(exp => {
            const expDate = parseISO(exp.date);
            const fromDate = new Date(dateRange.from!);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
            toDate.setHours(23, 59, 59, 999);
            return expDate >= fromDate && expDate <= toDate;
        });
    }
    return items.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [expenses, dateRange]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);


  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Date", "Category", "Description", "Amount", "Receipt URL"].join(",") + "\n"
      + filteredExpenses.map(e => [
          format(parseISO(e.date), 'yyyy-MM-dd'),
          e.category,
          `"${e.description.replace(/"/g, '""')}"`,
          e.amount.toFixed(2),
          e.imageUrl || ''
        ].join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expense_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!vendor?.isExpenseTrackingEnabled) {
    return null; // or a loading/access denied component
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Expenses</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Total Expenses: <span className="text-destructive">₹{totalExpense.toFixed(2)}</span></CardTitle>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="last7">Last 7 Days</SelectItem>
                        <SelectItem value="thisYear">This Year</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleExport} disabled={filteredExpenses.length === 0} variant="outline" size="icon">
                                <Download className="h-4 w-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Export as CSV</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleAddNew} size="icon">
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>Add New Expense</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
             </div>
           ) : (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">₹{item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                             {item.imageUrl && (
                                <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="icon">
                                        <FileImage className="h-4 w-4" />
                                    </Button>
                                </a>
                            )}
                            <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => setExpenseToDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No expenses recorded for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>

      <ExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        expense={selectedExpense}
        categories={expenseCategories}
        ingredients={expenseIngredients}
      />

      <ConfirmationDialog
        isOpen={!!expenseToDelete}
        onOpenChange={(isOpen) => !isOpen && setExpenseToDelete(null)}
        onConfirm={() => expenseToDelete && handleDeleteConfirm(expenseToDelete)}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete this expense record."
      />
    </div>
  );
}
