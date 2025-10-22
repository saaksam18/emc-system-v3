// Inside DepositDetails.tsx or as a new file (e.g., DepositDatePicker.tsx)

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import React from 'react';

interface DepositDatePickerProps {
    value: string | null | undefined; // The string date from the form data
    onChange: (dateString: string | null) => void;
    error?: string;
    id: string;
}

export const DepositDatePicker: React.FC<DepositDatePickerProps> = ({ value, onChange, error, id }) => {
    // 1. Initial State: Convert the form string value to a Date object
    const initialDate = value ? new Date(value) : undefined;

    // Local state for the Popover/Calendar
    const [open, setOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(initialDate);
    const [month, setMonth] = React.useState<Date | undefined>(initialDate);

    // Update internal state if the form value changes externally (e.g., form reset)
    React.useEffect(() => {
        const newDate = value ? new Date(value) : undefined;
        setSelectedDate(newDate);
        setMonth(newDate);
    }, [value]);

    const handleDateSelect = (date: Date | undefined) => {
        const dateString = date ? date.toISOString().split('T')[0] : null; // Format as YYYY-MM-DD

        // 2. Update local state and pass the string back to the parent form handler
        setSelectedDate(date);
        onChange(dateString);
        setOpen(false);
    };

    // Format the date for display in the Input
    const displayValue = selectedDate && isValidDate(selectedDate) ? formatDate(selectedDate) : value || 'Select a date';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="relative">
                <Input
                    id={id}
                    value={displayValue}
                    placeholder="Select a date"
                    className={`bg-background pr-10 ${error ? 'border-red-500' : ''}`}
                    readOnly // Prevent manual text entry for simplicity
                />

                <PopoverTrigger asChild>
                    <Button id={`${id}-picker`} variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2" title="Open date picker">
                        <CalendarIcon className="size-3.5" />
                        <span className="sr-only">Select date</span>
                    </Button>
                </PopoverTrigger>
            </div>

            <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    captionLayout="dropdown"
                    month={month}
                    onMonthChange={setMonth}
                    onSelect={handleDateSelect}
                    toYear={new Date().getFullYear() + 20}
                />
            </PopoverContent>
        </Popover>
    );
};
// Add the utility function to the main file if it's not external
function isValidDate(date: Date | undefined) {
    if (!date) {
        return false;
    }
    return !isNaN(date.getTime());
}
function formatDate(date: Date | undefined) {
    if (!date) {
        return '';
    }
    // Use the desired display format for the input field
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}
