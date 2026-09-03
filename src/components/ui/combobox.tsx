"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[];
    value: string | null;
    onChange: (value: string) => void;
    onInputChange?: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noResultsText?: string;
    className?: string;
    icon?: React.ReactNode;
    isLoading?: boolean;
}

export function Combobox({ 
    options, 
    value, 
    onChange,
    onInputChange,
    placeholder = "Select an option...",
    searchPlaceholder = "Search...",
    noResultsText = "No results found.",
    className,
    icon,
    isLoading,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (onInputChange) {
        onInputChange(inputValue);
    }
  }, [inputValue, onInputChange]);

  const selectedLabel = value && options.find((option) => option.value === value)?.label;

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setOpen(false);
    setInputValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-xs rounded-xl border-border/70 bg-background font-medium", className)}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            {icon}
            <span className="truncate">
              {selectedLabel || placeholder}
            </span>
          </div>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-1 w-[var(--radix-popover-trigger-width)] min-w-[340px] max-w-[95vw] rounded-2xl shadow-xl border border-border/80 bg-popover z-50" 
        align="start"
      >
        <Command className="rounded-xl">
          <CommandInput 
            placeholder={searchPlaceholder} 
            onValueChange={setInputValue}
            value={inputValue}
            className="h-9 text-xs"
          />
          <CommandList className="max-h-64 p-1">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground font-medium">
              {noResultsText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => handleSelect(option.value)}
                  disabled={option.value === 'title'}
                  className={cn(
                    "cursor-pointer py-2 px-2.5 text-xs rounded-xl flex items-center justify-between transition-colors",
                    option.value === 'title' ? "font-bold text-muted-foreground" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-primary",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
