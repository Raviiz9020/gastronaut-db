
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
    setInputValue(''); // Reset input on select
  };
  
  const popoverWidth = className?.includes('w-') ? className : "w-[200px]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", popoverWidth)}
        >
          <div className="flex items-center gap-2">
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
      <PopoverContent className={cn("p-0", popoverWidth)}>
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            onValueChange={setInputValue}
            value={inputValue}
          />
          <CommandList>
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  disabled={option.value === 'title'}
                  className={option.value === 'title' ? "font-bold text-muted-foreground" : ""}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
