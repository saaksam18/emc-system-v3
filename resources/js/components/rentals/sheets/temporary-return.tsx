import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// Assuming VehicleStatusType has { id: string | number; status_name: string; ... }
// Assuming RentalsType includes fields like: id, vehicle_id, user_id, vehicle_status_id, start_date, end_date, actual_start_date, end_date, total_cost, notes, vehicle etc.
import { RentalsType, User, VehicleStatusType } from '@/types'; // Make sure types are correctly imported and defined
import { useForm } from '@inertiajs/react';
import { format, isValid, parse } from 'date-fns'; // Import date-fns functions
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions ---

/**
 * Formats a Date object or string into 'yyyy-MM-dd' format.
 * Returns an empty string for null, undefined, or invalid dates.
 * @param date - The date to format.
 * @returns The formatted date string or an empty string.
 */
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        // Prefer parsing if it's a string to handle different input formats robustly
        const d = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
        // Check if the date object is valid
        if (!d || !isValid(d)) {
            // Fallback for potentially different string formats if initial parse fails
            const dFallback = new Date(date);
            if (!isValid(dFallback)) {
                console.warn('Invalid date value encountered in formatDateForInput:', date);
                return '';
            }
            return format(dFallback, 'yyyy-MM-dd');
        }
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error, 'Input:', date);
        return '';
    }
};

/**
 * Safely parses a date string ('yyyy-MM-dd') into a Date object.
 * Returns undefined if the string is empty or invalid.
 * @param dateStr - The date string to parse.
 * @returns A Date object or undefined.
 */
const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
        // Use parse for specific format and isValid for validation
        const date = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(date) ? date : undefined;
    } catch {
        return undefined; // Catch potential errors during parsing
    }
};

// --- Form Data and Error Types ---
// Defines the structure of the form data managed by useForm
type ReturnFormValues = {
    id: number | string | null;
    vehicle_id: number | string | null;
    status_name: string; // Display name for the selected vehicle status
    status_id: number | string | null;
    user_name: string; // Display name for the selected user
    user_id: number | string | null;
    start_date: string; // Original start date ('yyyy-MM-dd')
    end_date: string; // Actual return date ('yyyy-MM-dd')
    notes: string;
    vehicle_no?: string; // Optional, for display
};
// Defines the structure for form validation errors (Inertia provides this shape)
type FormErrors = Partial<Record<keyof ReturnFormValues, string>>;

// --- Initial Empty Form Values ---
const initialFormValues: ReturnFormValues = {
    id: null,
    vehicle_id: null,
    status_name: '',
    status_id: null,
    user_name: '',
    user_id: null,
    start_date: '',
    end_date: formatDateForInput(new Date()),
    notes: '',
    vehicle_no: '',
};

// --- Reusable Form Section Component ---
interface FormSectionProps {
    title: string;
    description: string;
    children: React.ReactNode;
}
const FormSection: React.FC<FormSectionProps> = ({ title, description, children }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
    </Card>
);

// --- Reusable Form Field Component ---
interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
    labelClassName?: string;
    contentClassName?: string;
    readOnly?: boolean;
}
const FormField: React.FC<FormFieldProps> = ({
    label,
    htmlFor,
    error,
    required,
    children,
    className,
    labelClassName,
    contentClassName,
    readOnly,
}) => (
    <div className={cn('grid grid-cols-1 items-start gap-4 md:grid-cols-4 md:items-center', className)}>
        <Label htmlFor={htmlFor} className={cn('text-left md:text-right', labelClassName, readOnly && 'text-muted-foreground')}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Main Return Component ---
interface ReturnProps {
    selectedRow: RentalsType | null;
    vehicleStatuses: VehicleStatusType[] | null;
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function TemporaryReturn({ selectedRow, users, vehicleStatuses, onSubmitSuccess }: ReturnProps) {
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<ReturnFormValues>(initialFormValues);
    const formErrors = errors as FormErrors; // Type cast Inertia errors

    // State for dialog visibility
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [actualEndDateDialogOpen, setActualEndDateDialogOpen] = useState(false);

    // --- Filtered & Validated Lists ---
    const validVehicleStatuses = useMemo(
        () =>
            Array.isArray(vehicleStatuses)
                ? vehicleStatuses.filter(
                      (vs): vs is VehicleStatusType & { id: string | number; status_name: string } =>
                          !!vs && vs.id != null && typeof vs.status_name === 'string' && vs.status_name !== '',
                  )
                : [],
        [vehicleStatuses],
    );
    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && u.id != null && typeof u.name === 'string' && u.name !== '') : []),
        [users],
    );

    // --- Effects ---

    // EFFECT: Populate form when selectedRow changes
    useEffect(() => {
        if (selectedRow) {
            // Populate form, defaulting end_date to today if not already set for this specific rental
            const populatedData: Partial<ReturnFormValues> = {
                id: selectedRow.id,
                vehicle_id: selectedRow.vehicle_id,
                status_name: '', // Reset on new selection
                status_id: null, // Reset on new selection
                user_name: '', // Reset on new selection
                user_id: null, // Reset on new selection
                start_date: formatDateForInput(selectedRow.actual_start_date || selectedRow.start_date),
                end_date: data.id === selectedRow.id && data.end_date ? data.end_date : formatDateForInput(new Date()),
                notes: selectedRow.notes || '',
                vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || 'N/A',
            };
            setData((currentData) => ({ ...currentData, ...populatedData }));
            clearErrors();
        } else {
            // Reset form if no row is selected
            reset();
            // Ensure defaults are set after reset
            setData('end_date', formatDateForInput(new Date()));
        }
        // data.id is included to handle re-selecting the same row correctly
    }, [selectedRow, reset, setData, clearErrors, data.id]); // Added data.id dependency

    // EFFECT: Warn if return date is before start date
    useEffect(() => {
        const startDate = parseDateString(data.start_date);
        const actualEndDate = parseDateString(data.end_date);

        if (startDate && actualEndDate && actualEndDate < startDate) {
            toast.warning('Return date cannot be before the original start date.');
            // Note: This is a warning, handleSubmit provides the blocking validation.
        }
    }, [data.start_date, data.end_date]);

    // --- Handlers ---

    /**
     * Handles changes for standard input/textarea fields.
     * Includes specific validation for 'total_cost'.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const key = name as keyof Pick<ReturnFormValues, 'notes'>;

        if (key === 'notes') {
            setData(key, value);
        } else {
            console.warn(`Input change handler received unexpected name: ${name}`);
            return; // Avoid processing unexpected fields
        }

        // Clear the specific error message for this field if it exists
        if (formErrors[key]) {
            clearErrors(key);
        }
    };

    /**
     * Handles selection changes in Combobox components (Vehicle Status, User).
     */
    const handleComboboxChange = (name: 'status_name' | 'user_name', value: string) => {
        if (name === 'status_name') {
            const selectedStatus = validVehicleStatuses.find((vs) => vs.status_name === value);
            setData((prevData) => ({
                ...prevData,
                status_name: value,
                status_id: selectedStatus?.id ?? null,
            }));
            if (formErrors.status_name) clearErrors('status_name');
            if (formErrors.status_id) clearErrors('status_id');
        } else if (name === 'user_name') {
            const selectedUser = validUsers.find((u) => u.name === value);
            setData((prevData) => ({
                ...prevData,
                user_name: value,
                user_id: selectedUser?.id ?? null,
            }));
            if (formErrors.user_name) clearErrors('user_name');
            if (formErrors.user_id) clearErrors('user_id');
        }
    };

    /**
     * Handles date selection changes from the Calendar component.
     */
    const handleDateChange = (field: 'end_date', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        setData(field, formattedDate);
        if (formErrors[field]) {
            clearErrors(field);
        }
        setActualEndDateDialogOpen(false); // Close dialog after selection
    };

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedRow || !data.id) {
            toast.error('No rental selected for return.');
            return;
        }
        clearErrors(); // Clear previous errors

        const url = `/rentals/${data.id}/update/temp-return`;

        // --- Pre-submission Validation ---
        const startDate = parseDateString(data.start_date);
        const actualEndDate = parseDateString(data.end_date);

        // 1. Validate Dates
        if (!actualEndDate) {
            toast.error('Actual Return Date is required.');
            return; // Stop submission
        }
        if (startDate && actualEndDate < startDate) {
            toast.error('Return date cannot be before the original start date.');
            return; // Stop submission
        }

        // --- Prepare Payload ---
        // Send only the necessary data in the format expected by the backend.
        // Assuming backend expects: end_date (string), vehicle_status_id (id),
        // user_id (id), notes (string), total_cost (string/number).
        // The backend should calculate/handle period difference and cost sign.
        const submissionData = {
            end_date: data.end_date, // 'yyyy-MM-dd' string
            vehicle_status_id: data.status_id,
            user_id: data.user_id,
            notes: data.notes,
            // Do NOT send frontend-calculated `period_difference` unless API requires it.
        };

        // --- Perform PUT Request ---
        put(url, {
            data: submissionData,
            preserveScroll: true,
            onSuccess: () => {
                reset(); // Reset form
                // Explicitly set defaults again after reset
                setData('end_date', formatDateForInput(new Date()));
                onSubmitSuccess(); // Callback
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        // Make field names more user-friendly
                        let userFriendlyFieldName = field
                            .replace(/_id$/, '') // Remove trailing '_id'
                            .replace(/_/g, ' ') // Replace underscores with spaces
                            .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
                        // Specific overrides
                        if (field === 'vehicle_status_id') userFriendlyFieldName = 'Vehicle Status';
                        if (field === 'user_id') userFriendlyFieldName = 'Incharge By';
                        if (field === 'end_date') userFriendlyFieldName = 'Actual Return Date';

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error('Failed to process return. An unknown error occurred.');
                }
            },
        });
    };
    // --- JSX ---
    return (
        <div className="px-4">
            {/* Display Summary Card */}
            {selectedRow && (
                <Card className="bg-muted/30 mb-4">
                    <CardHeader>
                        <CardTitle>Temporary Returning Rental</CardTitle>
                        <CardDescription>
                            Vehicle: {data.vehicle_no || 'N/A'} | Original Start:{' '}
                            {data.start_date ? format(parseDateString(data.start_date)!, 'PPP') : 'N/A'} | Original End:{' '}
                            {data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : 'N/A'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Return Details Section --- */}
                <FormSection title="Return Details" description="Specify the return date, condition, final cost, and responsible user.">
                    {/* Original Start Date (Read Only) */}
                    <FormField label="Original Start Date" htmlFor="start_date_display" readOnly>
                        <Input
                            id="start_date_display"
                            value={data.start_date ? format(parseDateString(data.start_date)!, 'PPP') : 'N/A'}
                            readOnly
                            disabled
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </FormField>

                    {/* Original End Date (Read Only) */}
                    <FormField label="Original End Date" htmlFor="end_date_display" readOnly>
                        <Input
                            id="end_date_display"
                            value={data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : 'N/A'}
                            readOnly
                            disabled
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </FormField>

                    {/* Actual Return Date (Date Picker) */}
                    <FormField label="Return Date" htmlFor="end_date" error={formErrors.end_date} required>
                        <Dialog open={actualEndDateDialogOpen} onOpenChange={setActualEndDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="end_date" // Match label htmlFor
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.end_date && 'text-muted-foreground',
                                        formErrors.end_date && 'border-red-500',
                                    )}
                                    disabled={processing || !data.start_date} // Disable if no start date yet
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.end_date)}
                                    onSelect={(date) => handleDateChange('end_date', date)}
                                    // Disable dates before the original start date
                                    disabled={(date) => {
                                        const startDate = parseDateString(data.start_date);
                                        return startDate ? date < startDate : false;
                                    }}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Vehicle Status After Return (Combobox) */}
                    <FormField label="Vehicle Status" htmlFor="return-status_name" error={formErrors.status_name || formErrors.status_id} required>
                        <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleStatusDialogOpen}
                                    aria-label="Select vehicle status after return"
                                    id="return-status_name" // Match label
                                    className={cn(
                                        'w-full justify-between',
                                        !data.status_name && 'text-muted-foreground',
                                        (formErrors.status_name || formErrors.status_id) && 'border-red-500',
                                    )}
                                    disabled={processing || validVehicleStatuses.length === 0}
                                >
                                    {data.status_name ? data.status_name : 'Select status...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                                    <CommandInput placeholder="Search status..." />
                                    <CommandList>
                                        <CommandEmpty>No status found.</CommandEmpty>
                                        <CommandGroup>
                                            {validVehicleStatuses.map((status) => (
                                                <CommandItem
                                                    key={status.id}
                                                    value={status.status_name} // Use status_name for value and display
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('status_name', currentValue);
                                                        setVehicleStatusDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.status_id === status.id ? 'opacity-100' : 'opacity-0', // Check based on ID
                                                        )}
                                                    />
                                                    {status.status_name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {validVehicleStatuses.length === 0 && !processing && (
                            <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available.</p>
                        )}
                    </FormField>

                    {/* User Processing Return (Combobox) */}
                    <FormField label="Incharge By" htmlFor="return-user_name" error={formErrors.user_name || formErrors.user_id} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    aria-label="Select user processing return"
                                    id="return-user_name" // Match label
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground',
                                        (formErrors.user_name || formErrors.user_id) && 'border-red-500',
                                    )}
                                    disabled={processing || validUsers.length === 0}
                                >
                                    {data.user_name ? data.user_name : 'Select user...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            {validUsers.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name} // Use name for value and display
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('user_name', currentValue);
                                                        setUserDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn('mr-2 h-4 w-4', data.user_id === user.id ? 'opacity-100' : 'opacity-0')} // Check based on ID
                                                    />
                                                    {user.name}
                                                    {user.email && <span className="text-muted-foreground ml-2 text-xs">({user.email})</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {validUsers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No users available.</p>}
                    </FormField>
                </FormSection>

                {/* --- Additional Notes Section --- */}
                <FormSection title="Return Notes" description="Add any notes specific to this return (e.g., vehicle condition, issues).">
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="notes"
                            name="notes"
                            value={data.notes || ''} // Controlled component
                            onChange={handleInputChange}
                            rows={4}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500',
                                processing && 'disabled:opacity-70',
                            )}
                            placeholder="Enter any return-specific notes here..."
                            disabled={processing}
                        />
                    </FormField>
                </FormSection>

                {/* --- Form Actions --- */}
                <SheetFooter>
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={processing}>
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button type="submit" disabled={processing || !selectedRow} className="w-full sm:w-auto">
                            {processing ? 'Processing Return...' : 'Confirm Return'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
