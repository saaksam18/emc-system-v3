import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, User2 } from 'lucide-react';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface ComboboxOption {
    value: string;
    label: string;
}

interface SearchableComboboxProps {
    id?: string;
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    triggerClassName?: string;
    disabled?: boolean;
    error?: boolean;
    onCreateClick?: () => void;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyMessage = 'No options found.',
    triggerClassName,
    disabled,
    error,
    id,
    onCreateClick,
}) => {
    const [open, setOpen] = React.useState(false);

    const selectedOption = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', !value && 'text-muted-foreground', error && 'border-red-500', triggerClassName)}
                    disabled={disabled}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} id={id} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? '' : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
                {onCreateClick && (
                    <Button
                        variant="ghost"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpen(false);
                            onCreateClick();
                        }}
                        className="m-1 flex w-full shrink-0 items-center justify-center gap-2 text-sm sm:w-auto"
                    >
                        <User2 className="mr-1 h-4 w-4" /> Create Customer
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
};
