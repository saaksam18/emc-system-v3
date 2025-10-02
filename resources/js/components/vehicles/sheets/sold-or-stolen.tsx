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
// Assuming Vehicle has { id: string | number; vehicle_no: string; ... }
import { Customers, User, Vehicle, VehicleStatusType } from '@/types'; // Ensure Vehicle type is imported
import { Link, useForm } from '@inertiajs/react';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, User2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions (unchanged) ---
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};
const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
        const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) ? parsedDate : undefined;
    } catch {
        return undefined;
    }
};

// --- Updated Initial Form Values Type ---
// Removed vehicle_no, added vehicle_id
type InitialFormValues = Omit<Partial<Customers>, 'id' | 'name'> & {
    // Exclude potential conflicts from Customers
    customer_name: string;
    vehicle_id: number | string | null; // Added vehicle_id
    status_name: string;
    user_name: string;
    end_date: string;
    total_cost: string;
    notes: string;
};

type FormErrors = Partial<Record<keyof InitialFormValues, string>>;

// --- Updated Initial Form Values ---
// Removed vehicle_no, added vehicle_id
const initialFormValues: InitialFormValues = {
    customer_name: '',
    vehicle_id: null, // Initialize vehicle_id
    status_name: '',
    end_date: '',
    total_cost: '',
    notes: '',
    user_name: '',
};

// --- Reusable Form Section Component (unchanged) ---
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

// --- Reusable Form Field Component (unchanged) ---
interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
    labelClassName?: string;
    contentClassName?: string;
}
const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, error, required, children, className, labelClassName, contentClassName }) => (
    <div className={cn('grid grid-cols-1 items-start gap-4 md:grid-cols-4 md:items-center', className)}>
        <Label htmlFor={htmlFor} className={cn('text-left md:text-right', labelClassName)}>
            {label}
            {required && <span className="text-red-500">*</span>}
        </Label>
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Main Create Component ---
interface CreateProps {
    vehicle: Vehicle | null; // Changed to expect a single Vehicle object
    vehicle_status: VehicleStatusType[];
    customers: Customers[] | null;
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function SoldOrStolen({ vehicle, vehicle_status, customers, users, onSubmitSuccess }: CreateProps) {
    // Updated useForm generic type
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors; // Cast errors

    // State for Combobox Dialogs (unchanged)
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);

    // State for Date Picker Dialogs (unchanged)
    const [endDateDialogOpen, setEndDateDialogOpen] = useState(false);

    // --- Effects ---
    // Set Initial End Date and Vehicle ID
    useEffect(() => {
        const today = formatDateForInput(new Date());
        if (!data.end_date) {
            setData('end_date', today);
        }
        // Set vehicle_id when the component mounts or vehicle prop changes
        if (vehicle?.id && data.vehicle_id !== vehicle.id) {
            setData('vehicle_id', vehicle.id);
            // Clear potential errors related to vehicle if the vehicle changes
            clearErrors('vehicle_id');
        }
        // Initialize actual_start_date if needed (example)
        // if (!data.actual_start_date) setData('actual_start_date', today);
    }, [vehicle]); // Add vehicle to dependency array

    // --- Generic Handlers ---
    // handleInputChange (unchanged, but ensure 'name' corresponds to InitialFormValues keys)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Explicitly type the key based on the expected input/textarea names
        const key = name as 'total_cost' | 'notes'; // Only handle fields managed by this handler
        setData(key, value);
        if (formErrors[key]) {
            clearErrors(key);
        }
    };

    // handleComboboxChange (unchanged)
    const handleComboboxChange = (name: 'customer_name' | 'status_name' | 'user_name', value: string) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    // --- Date Picker Handler (unchanged) ---
    const handleDateChange = (field: 'end_date', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        setData(field, formattedDate);
        if (formErrors[field]) {
            clearErrors(field);
        }
        if (field === 'end_date') {
            setEndDateDialogOpen(false);
        }
    };

    // --- Memoized Options (unchanged) ---
    const validCustomers = useMemo(
        () => (Array.isArray(customers) ? customers.filter((c): c is Customers => !!c && !!c.id && typeof c.name === 'string' && c.name !== '') : []),
        [customers],
    );
    const validVehicleStatuses = useMemo(
        () =>
            Array.isArray(vehicle_status)
                ? vehicle_status.filter(
                      (vs): vs is VehicleStatusType & { id: string | number; status_name: string } =>
                          !!vs && !!vs.id && typeof vs.status_name === 'string' && vs.status_name !== '',
                  )
                : [],
        [vehicle_status],
    );
    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && !!u.id && typeof u.name === 'string' && u.name !== '') : []),
        [users],
    );

    // --- Form Submission (Validation Updated) ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();
        const url = `/vehicles/${data.vehicle_id}/update/sold-or-stolen`;
        console.log(data)

        // --- Basic Validation ---
        let hasValidationError = false;
        const validationErrors: Partial<FormErrors> = {};

        // Ensure vehicle_id is set (should be set by useEffect from prop)
        if (!data.vehicle_id) {
            // This indicates an issue with the prop or useEffect
            toast.error('Vehicle information is missing. Please refresh or contact support.');
            console.error('Missing vehicle_id during submission');
            return; // Stop submission
        }

        if (!data.customer_name) {
            validationErrors.customer_name = 'Customer is required.';
            hasValidationError = true;
        }
        // Removed validation for vehicle_no as it's read-only
        if (!data.status_name) {
            validationErrors.status_name = 'Vehicle status is required.';
            hasValidationError = true;
        }
        if (!data.end_date) {
            validationErrors.end_date = 'Sold/Stolen date is required.';
            hasValidationError = true;
        }
        if (!data.total_cost || isNaN(parseFloat(data.total_cost)) || parseFloat(data.total_cost) < 0) {
            validationErrors.total_cost = 'A valid, non-negative cost is required.';
            hasValidationError = true;
        }
        if (!data.user_name) {
            validationErrors.user_name = 'Incharge user is required.';
            hasValidationError = true;
        }

        // --- Handle Validation Results ---
        if (hasValidationError) {
            Object.values(validationErrors).forEach((msg) => toast.error(msg));
            console.error('Client-side validation errors:', validationErrors);
            // Manually set errors for display next to fields if needed, though toast is primary
            // Inertia's errors object will be populated on server validation failure anyway
            // Example: errors.customer_name = validationErrors.customer_name;
            return; // Stop submission
        }

        // --- Post Data ---
        put(url, {
            preserveScroll: true,
            onSuccess: () => {
                reset(); // Reset form to initial values
                // Re-initialize fields that need default values after reset
                setData('end_date', formatDateForInput(new Date()));
                setData('vehicle_id', vehicle?.id ?? null); // Re-set vehicle_id after reset
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        let userFriendlyFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                        // Adjust field name mapping as needed
                        if (field === 'status_name') userFriendlyFieldName = 'Vehicle Status';
                        else if (field === 'customer_name') userFriendlyFieldName = 'Customer';
                        else if (field === 'vehicle_id')
                            userFriendlyFieldName = 'Vehicle'; // Changed from Vehicle No
                        else if (field === 'user_name') userFriendlyFieldName = 'Incharge By';
                        else if (field === 'end_date') userFriendlyFieldName = 'Sold / Stolen Date';
                        else if (field === 'total_cost') userFriendlyFieldName = 'Cost';

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error(`Failed to mark vehicle as ${data.status_name || 'Sold/Stolen'}. An unknown error occurred.`);
                }
            },
        });
    };

    return (
        <div className="px-4 pb-20">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="Vehicle" description="Vehicle associated with this transaction (read-only).">
                    <FormField label="Vehicle No" htmlFor="vehicle_no">
                        <Input
                            id="vehicle_no"
                            name="vehicle_no"
                            value={vehicle?.vehicle_no || 'Loading...'} // Display value from prop
                            readOnly // Make input read-only
                            disabled
                            className="bg-muted/50" // Style to indicate read-only
                            placeholder="Vehicle registration number"
                        />
                    </FormField>
                </FormSection>
                {/* --- Relational Information Section --- */}
                <FormSection title="Relational Information" description="Select the customer and status for the vehicle.">
                    {/* Customer Combobox (unchanged JSX) */}
                    <FormField label="Customer" htmlFor="create-customer_name" error={formErrors.customer_name} required>
                        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={customerDialogOpen}
                                    aria-label="Select customer"
                                    id="create-customer_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.customer_name && 'text-muted-foreground',
                                        formErrors.customer_name && 'border-red-500',
                                    )}
                                    disabled={processing || validCustomers.length === 0}
                                >
                                    {data.customer_name
                                        ? validCustomers.find((customer) => customer.name === data.customer_name)?.name
                                        : 'Select customer...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search customer..." />
                                    <CommandList>
                                        <CommandEmpty>No customer found.</CommandEmpty>
                                        <CommandGroup>
                                            {validCustomers.map((customer) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    value={customer.name}
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange(
                                                            'customer_name',
                                                            currentValue === data.customer_name ? '' : currentValue,
                                                        );
                                                        setCustomerDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.customer_name === customer.name ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {customer.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                <Button variant="ghost" asChild className="m-1">
                                    <Link href={'/customers'} className="flex w-full shrink-0 items-center justify-center gap-2 text-sm sm:w-auto">
                                        <User2 className="mr-1 h-4 w-4" /> Create Customer
                                    </Link>
                                </Button>
                            </DialogContent>
                        </Dialog>
                        {validCustomers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No customers available.</p>}
                    </FormField>

                    {/* Vehicle Status Combobox (unchanged JSX) */}
                    <FormField label="Vehicle Status" htmlFor="create-status_name" error={formErrors.status_name} required>
                        <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleStatusDialogOpen}
                                    aria-label="Select vehicle status"
                                    id="create-status_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.status_name && 'text-muted-foreground',
                                        formErrors.status_name && 'border-red-500',
                                    )}
                                    disabled={processing || validVehicleStatuses.length === 0}
                                >
                                    {data.status_name ? data.status_name : 'Select status...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search status..." />
                                    <CommandList>
                                        <CommandEmpty>No status found.</CommandEmpty>
                                        <CommandGroup>
                                            {validVehicleStatuses.map((status) => (
                                                <CommandItem
                                                    key={status.id}
                                                    value={status.status_name}
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('status_name', currentValue === data.status_name ? '' : currentValue);
                                                        setVehicleStatusDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.status_name === status.status_name ? 'opacity-100' : 'opacity-0',
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
                </FormSection>

                {/* --- Sold / Stolen Details Section (unchanged JSX, except for error field names) --- */}
                <FormSection title="Sold / Stolen Details" description="Specify the date, cost, and responsible user.">
                    {/* Sold / Stolen Date */}
                    <FormField label="Sold / Stolen Date" htmlFor="end_date" error={formErrors.end_date} required>
                        <Dialog open={endDateDialogOpen} onOpenChange={setEndDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="end_date_trigger"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.end_date && 'text-muted-foreground',
                                        formErrors.end_date && 'border-red-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.end_date)}
                                    onSelect={(date) => handleDateChange('end_date', date)}
                                    disabled={(date) => (data.actual_start_date ? date < new Date(data.actual_start_date + 'T00:00:00') : false)}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Cost */}
                    <FormField label="Cost" htmlFor="total_cost" error={formErrors.total_cost} required>
                        <Input
                            id="total_cost"
                            name="total_cost"
                            type="number"
                            step="any"
                            min="0"
                            value={data.total_cost}
                            onChange={handleInputChange}
                            placeholder="e.g., compensated or sold price"
                            className={cn(formErrors.total_cost && 'border-red-500')}
                            required
                        />
                    </FormField>

                    {/* User Combobox */}
                    <FormField label="Incharge By" htmlFor="create-user_name" error={formErrors.user_name} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    aria-label="Select user"
                                    id="create-user_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground',
                                        formErrors.user_name && 'border-red-500',
                                    )}
                                    disabled={processing || validUsers.length === 0}
                                >
                                    {data.user_name ? validUsers.find((user) => user.name === data.user_name)?.name : 'Select user...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            {validUsers.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name}
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('user_name', currentValue === data.user_name ? '' : currentValue);
                                                        setUserDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn('mr-2 h-4 w-4', data.user_name === user.name ? 'opacity-100' : 'opacity-0')}
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

                {/* --- Additional Notes Section (unchanged JSX) --- */}
                <FormSection title="Additional Notes" description="Add any relevant notes about this action.">
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="notes"
                            name="notes"
                            value={data.notes || ''}
                            onChange={handleInputChange} // Keep onChange for textarea
                            rows={4}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500',
                            )}
                            placeholder="Enter any relevant notes here..."
                        />
                    </FormField>
                </FormSection>

                {/* --- Form Actions Section (unchanged JSX) --- */}
                <SheetFooter className="bg-background sticky bottom-0 z-10 mt-4 border-t py-4">
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const today = formatDateForInput(new Date());
                                reset();
                                // Re-initialize fields after reset
                                setData('end_date', today);
                                setData('vehicle_id', vehicle?.id ?? null);
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing || !vehicle?.id} className="w-full sm:w-auto">
                            {processing ? 'Processing...' : `Mark as ${data.status_name || 'Sold/Stolen'}`}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
