import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChartOfAccountTypes } from '@/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '../ui/button';

interface AccountComboboxProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onSelect: (value: string) => void;
    accounts: ChartOfAccountTypes[];
    getAccountName: (accountId: string, accounts: ChartOfAccountTypes[]) => string;
    placeholder: string;
    searchPlaceholder: string;
    error: boolean;
}

export const AccountCombobox: React.FC<AccountComboboxProps> = ({
    open,
    onOpenChange,
    value,
    onSelect,
    accounts,
    getAccountName,
    placeholder,
    searchPlaceholder,
    error,
}) => (
    <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn('dark:bg-background w-full justify-between', !value && 'text-muted-foreground', error && 'border-red-500')}
            >
                {value ? getAccountName(value, accounts) : placeholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                    <CommandEmpty>No account found.</CommandEmpty>
                    <CommandGroup>
                        {accounts?.map((account) => (
                            <CommandItem key={account.id} value={`${account.name} (${account.type})`} onSelect={() => onSelect(String(account.id))}>
                                <Check className={cn('mr-2 h-4 w-4', value === String(account.id) ? 'opacity-100' : 'opacity-0')} />
                                {account.name} ({account.type})
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
);
