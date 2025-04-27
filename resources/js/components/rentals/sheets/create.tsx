import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// Assuming VehicleStatusType has { id: string | number; status_name: string; ... }
import { Customers, Deposits, User, Vehicle, VehicleStatusType } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Trash2, User2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions (formatDateForInput, calculatePeriod - unchanged) ---
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.warn('Invalid date value encountered in formatDateForInput:', date);
            return '';
        }
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

const calculatePeriod = (startDateStr: string, endDateStr: string): string => {
    if (!startDateStr || !endDateStr) {
        return '';
    }
    try {
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(endDateStr + 'T00:00:00');
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
            return '';
        }
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays === 1) return '1 day';
        const approxYears = Math.floor(diffDays / 365);
        const daysAfterYears = diffDays % 365;
        const approxMonths = Math.floor(daysAfterYears / 30);
        const remainingDays = daysAfterYears % 30;
        let periodString = '';
        if (approxYears > 0) periodString += `${approxYears} year${approxYears > 1 ? 's' : ''}`;
        if (approxMonths > 0) {
            if (periodString) periodString += ', ';
            periodString += `${approxMonths} month${approxMonths > 1 ? 's' : ''}`;
        }
        if (remainingDays > 0) {
            if (periodString) periodString += ', ';
            periodString += `${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
        }
        return periodString || `${diffDays} days`;
    } catch (error) {
        console.error('Error calculating period:', error);
        return '';
    }
};

// --- Type Definitions ---
interface EnhancedDeposit extends Omit<Deposits, 'id'> {
    id?: string | number;
    is_primary?: boolean;
}
// Updated InitialFormValues to use status_name
type InitialFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    activeDeposits: EnhancedDeposit[];
    customer_name: string;
    vehicle_no: string;
    status_name: string; // Changed from status_id to status_name
    user_name: string;
    actual_start_date: string;
    end_date: string;
    coming_date: string;
    period: string;
    total_cost: string;
    notes: string;
};
// Updated FormErrors type to reflect status_name
type FormErrors = Partial<
    Record<keyof Omit<InitialFormValues, 'activeDeposits'> | `activeDeposits.${number}.${keyof EnhancedDeposit}` | 'activeDeposits', string>
>;

// --- Define Initial Empty Form Values ---
const initialFormValues: InitialFormValues = {
    customer_name: '',
    vehicle_no: '',
    status_name: '', // Changed from status_id
    actual_start_date: '',
    end_date: '',
    period: '',
    coming_date: '',
    total_cost: '',
    notes: '',
    user_name: '',
    activeDeposits: [{ id: 'primary_0', deposit_type: '', deposit_value: '', description: '', is_primary: true }],
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
            {required && '*'}
        </Label>
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Main Create Component ---
interface CreateProps {
    availableVehicles: Vehicle[] | null;
    // Assuming VehicleStatusType has { id: string | number; status_name: string; ... }
    vehicleStatuses: VehicleStatusType[] | null;
    customers: Customers[] | null;
    depositTypes: Deposits[] | null;
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function Create({ availableVehicles, vehicleStatuses, customers, depositTypes, users, onSubmitSuccess }: CreateProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    // State for Combobox Dialogs
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);

    // State for Date Picker Dialogs
    const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
    const [endDateDialogOpen, setEndDateDialogOpen] = useState(false);
    const [comingDateDialogOpen, setComingDateDialogOpen] = useState(false);

    const depositTypeOptions = depositTypes || [];

    // --- Effects (Set Initial Start Date, Calculate Period - unchanged) ---
    useEffect(() => {
        const today = formatDateForInput(new Date());
        if (!data.actual_start_date) {
            setData('actual_start_date', today);
        }
    }, []);

    useEffect(() => {
        const calculatedPeriod = calculatePeriod(data.actual_start_date, data.end_date);
        if (calculatedPeriod !== data.period) {
            setData('period', calculatedPeriod);
        }
        if (data.coming_date && data.actual_start_date && new Date(data.coming_date + 'T00:00:00') < new Date(data.actual_start_date + 'T00:00:00')) {
            setData('coming_date', '');
        }
    }, [data.actual_start_date, data.end_date, data.coming_date, data.period, setData]);

    // --- Generic Handlers ---
    // Updated handleInputChange type to exclude status_name
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const key = name as keyof Omit<
            InitialFormValues,
            | 'activeDeposits'
            | 'customer_name'
            | 'vehicle_no'
            | 'status_name' // Exclude status_name
            | 'user_name'
            | 'actual_start_date'
            | 'end_date'
            | 'coming_date'
            | 'period'
        >;
        setData(key, value);
        if (formErrors[key]) {
            clearErrors(key);
        }
    };

    // Updated handleComboboxChange to include 'status_name'
    const handleComboboxChange = (name: 'customer_name' | 'vehicle_no' | 'status_name' | 'user_name', value: string) => {
        // Store the selected name/number/status_name directly
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    // handleActiveDepositChange, handleAddContact, handleRemoveDeposit (unchanged)
    const handleActiveDepositChange = (index: number, field: keyof EnhancedDeposit, value: string | boolean) => {
        const updatedDeposits = data.activeDeposits.map((deposit, i) => (i === index ? { ...deposit, [field]: value } : deposit));
        setData('activeDeposits', updatedDeposits);
        const errorKey = `activeDeposits.${index}.${field}` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
        if (formErrors.activeDeposits) {
            clearErrors('activeDeposits');
        }
    };
    const handleAddContact = () => {
        const newDeposit: EnhancedDeposit = { id: `new_${Date.now()}`, deposit_type: '', deposit_value: '', description: '', is_primary: false };
        setData('activeDeposits', [...data.activeDeposits, newDeposit]);
    };
    const handleRemoveDeposit = (indexToRemove: number) => {
        if (indexToRemove === 0) {
            toast.error('Cannot remove the primary deposit.');
            return;
        }
        setData(
            'activeDeposits',
            data.activeDeposits.filter((_, index) => index !== indexToRemove),
        );
        clearErrors();
    };

    // --- Date Picker Handler (unchanged) ---
    const handleDateChange = (field: 'actual_start_date' | 'end_date' | 'coming_date', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        setData(field, formattedDate);
        if (formErrors[field]) {
            clearErrors(field);
        }

        if (field === 'actual_start_date') setStartDateDialogOpen(false);
        if (field === 'end_date') setEndDateDialogOpen(false);
        if (field === 'coming_date') setComingDateDialogOpen(false);

        if (field === 'actual_start_date') {
            if (data.end_date && new Date(data.end_date + 'T00:00:00') < new Date(formattedDate + 'T00:00:00')) {
                setData('end_date', '');
                setData('period', '');
            }
            if (data.coming_date && new Date(data.coming_date + 'T00:00:00') < new Date(formattedDate + 'T00:00:00')) {
                setData('coming_date', '');
            }
        }
    };

    // --- Memoized Options ---
    const validCustomers = useMemo(
        () => (Array.isArray(customers) ? customers.filter((c): c is Customers => !!c && !!c.id && typeof c.name === 'string' && c.name !== '') : []),
        [customers],
    );
    const validVehicles = useMemo(
        () =>
            Array.isArray(availableVehicles)
                ? availableVehicles.filter((v): v is Vehicle => !!v && !!v.id && typeof v.vehicle_no === 'string' && v.vehicle_no !== '')
                : [],
        [availableVehicles],
    );
    // Updated validVehicleStatuses memoization to use status_name
    const validVehicleStatuses = useMemo(
        () =>
            Array.isArray(vehicleStatuses)
                ? vehicleStatuses.filter(
                      (vs): vs is VehicleStatusType & { id: string | number; status_name: string } =>
                          !!vs && !!vs.id && typeof vs.status_name === 'string' && vs.status_name !== '',
                  )
                : [],
        [vehicleStatuses],
    );
    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && !!u.id && typeof u.name === 'string' && u.name !== '') : []),
        [users],
    );

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();
        const url = '/rentals/register';

        const primaryDeposit = data.activeDeposits[0];
        if (!primaryDeposit || !primaryDeposit.deposit_type || !primaryDeposit.deposit_value) {
            setData('errors', {
                ...errors,
                'activeDeposits.0.deposit_type': !primaryDeposit?.deposit_type ? 'Primary deposit type is required.' : undefined,
                'activeDeposits.0.deposit_value': !primaryDeposit?.deposit_value ? 'Primary deposit value is required.' : undefined,
            });
            toast.error('Please fill in the primary contact type and value.');
            return;
        }

        console.log('Submitting data:', data);

        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        const fieldNameParts = field.split('.');
                        let userFriendlyFieldName = fieldNameParts
                            .map((part) => {
                                if (part === 'activeDeposits') return 'Deposits';
                                if (/^\d+$/.test(part)) return `Item ${parseInt(part) + 1}`;
                                // Map status_name to a user-friendly name
                                if (part === 'status_name') return 'Vehicle Status'; // Updated check
                                return part.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                            })
                            .join(' - ');

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error('Failed to create rental. An unknown error occurred.');
                }
            },
        });
    };

    const primaryDeposit = data.activeDeposits[0] || { deposit_type: '', deposit_value: '', is_primary: true };
    const primaryDepositTypeError = formErrors['activeDeposits.0.deposit_type'];
    const primaryDepositValueError = formErrors['activeDeposits.0.deposit_value'];

    // --- Helper: Parse Date String (unchanged) ---
    const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
            const date = new Date(dateStr + 'T00:00:00');
            return isNaN(date.getTime()) ? undefined : date;
        } catch {
            return undefined;
        }
    };

    console.log(vehicleStatuses);

    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Information Section --- */}
                <FormSection title="Relational Information" description="Enter the relational information for the new rental.">
                    {/* Customer Combobox (unchanged) */}
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

                    {/* Vehicle Combobox (unchanged) */}
                    <FormField label="Vehicle No" htmlFor="create-vehicle_no" error={formErrors.vehicle_no} required>
                        <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleDialogOpen}
                                    aria-label="Select vehicle"
                                    id="create-vehicle_no"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.vehicle_no && 'text-muted-foreground',
                                        formErrors.vehicle_no && 'border-red-500',
                                    )}
                                    disabled={processing || validVehicles.length === 0}
                                >
                                    {data.vehicle_no
                                        ? validVehicles.find((vehicle) => vehicle.vehicle_no === data.vehicle_no)?.vehicle_no
                                        : 'Select vehicle...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search vehicle no..." />
                                    <CommandList>
                                        <CommandEmpty>No vehicle found.</CommandEmpty>
                                        <CommandGroup>
                                            {validVehicles.map((vehicle) => (
                                                <CommandItem
                                                    key={vehicle.id}
                                                    value={vehicle.vehicle_no}
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('vehicle_no', currentValue === data.vehicle_no ? '' : currentValue);
                                                        setVehicleDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.vehicle_no === vehicle.vehicle_no ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {vehicle.vehicle_no}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                <Button variant="ghost" asChild className="m-1">
                                    <Link href={'/vehicles'} className="flex w-full shrink-0 items-center justify-center gap-2 text-sm sm:w-auto">
                                        <User2 className="mr-1 h-4 w-4" /> Check Vehicle Stocks
                                    </Link>
                                </Button>
                            </DialogContent>
                        </Dialog>
                        {validVehicles.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No vehicles available.</p>}
                    </FormField>

                    {/* --- UPDATED: Vehicle Status Combobox (using status_name) --- */}
                    <FormField label="Vehicle Status" htmlFor="create-status_name" error={formErrors.status_name} required>
                        <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleStatusDialogOpen}
                                    aria-label="Select vehicle status"
                                    id="create-status_name" // Updated id
                                    className={cn(
                                        'w-full justify-between',
                                        !data.status_name && 'text-muted-foreground', // Check status_name
                                        formErrors.status_name && 'border-red-500', // Check status_name error
                                    )}
                                    disabled={processing || validVehicleStatuses.length === 0}
                                >
                                    {data.status_name // Display status_name
                                        ? data.status_name // Directly display the stored name
                                        : 'Select status...'}
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
                                                    key={status.id} // Still use unique ID for key
                                                    // Use status.status_name as the value for selection and search
                                                    value={status.status_name}
                                                    onSelect={(currentValue) => {
                                                        // Store the status_name in the form state
                                                        handleComboboxChange('status_name', currentValue === data.status_name ? '' : currentValue);
                                                        setVehicleStatusDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            // Check against the status_name stored in state
                                                            data.status_name === status.status_name ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {status.status_name} {/* Display the status name */}
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
                    {/* --- End of UPDATED Vehicle Status Combobox --- */}
                </FormSection>

                {/* --- Deposit Information (unchanged) --- */}
                <FormSection title="Deposit Information" description="Add the customer's deposit details. The first deposit is primary.">
                    {/* Primary Deposit Fields */}
                    <h4 className="text-base font-semibold">Primary Deposit</h4>
                    <div className="space-y-4">
                        <FormField label="Type" htmlFor="primary_deposit_type_0" error={primaryDepositTypeError} required>
                            <Select
                                value={primaryDeposit.deposit_type}
                                onValueChange={(value) => handleActiveDepositChange(0, 'deposit_type', value)}
                                required
                            >
                                <SelectTrigger id="primary_deposit_type_0" className={cn(primaryDepositTypeError && 'border-red-500')}>
                                    <SelectValue placeholder="Select primary type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {depositTypeOptions.map((option) => (
                                        <SelectItem key={option.name} value={option.name}>
                                            {option.name}
                                        </SelectItem>
                                    ))}
                                    {depositTypeOptions.length === 0 && (
                                        <SelectItem value="no-types" disabled>
                                            No deposit types available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Deposit" htmlFor="primary_deposit_value_0" error={primaryDepositValueError} required>
                            <Input
                                id="primary_deposit_value_0"
                                name="activeDeposits.0.deposit_value"
                                value={primaryDeposit.deposit_value}
                                onChange={(e) => handleActiveDepositChange(0, 'deposit_value', e.target.value)}
                                className={cn(primaryDepositValueError && 'border-red-500')}
                                placeholder="e.g., 500 or Cash Deposit"
                                type="text"
                            />
                        </FormField>
                        <FormField label="Description" htmlFor="primary_deposit_description_0">
                            <Input
                                id="primary_deposit_description_0"
                                name="activeDeposits.0.description"
                                value={primaryDeposit.description || ''}
                                onChange={(e) => handleActiveDepositChange(0, 'description', e.target.value)}
                                placeholder="Description (Optional)"
                            />
                        </FormField>
                    </div>

                    {/* Additional Deposits Section */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold">Additional Deposits</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                                Add Deposit
                            </Button>
                        </div>
                        {data.activeDeposits.length > 1 ? (
                            data.activeDeposits.slice(1).map((deposit, index) => {
                                const actualIndex = index + 1;
                                const typeErrorKey = `activeDeposits.${actualIndex}.deposit_type` as keyof FormErrors;
                                const valueErrorKey = `activeDeposits.${actualIndex}.deposit_value` as keyof FormErrors;
                                const descErrorKey = `activeDeposits.${actualIndex}.description` as keyof FormErrors;
                                return (
                                    <div
                                        key={deposit.id || `additional_${actualIndex}`}
                                        className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-start gap-2 rounded-md border p-3 transition-colors sm:flex-nowrap sm:space-x-2"
                                    >
                                        <div className="flex w-full flex-grow flex-col gap-2">
                                            <div className="flex w-full flex-col gap-2 sm:flex-row">
                                                <div className="w-full flex-shrink-0 sm:w-auto sm:min-w-[150px] sm:flex-1">
                                                    <Label htmlFor={`deposit_type_${actualIndex}`} className="sr-only">
                                                        Type
                                                    </Label>
                                                    <Select
                                                        value={deposit.deposit_type}
                                                        onValueChange={(value) => handleActiveDepositChange(actualIndex, 'deposit_type', value)}
                                                    >
                                                        <SelectTrigger
                                                            id={`deposit_type_${actualIndex}`}
                                                            className={cn('h-9 w-full', formErrors[typeErrorKey] && 'border-red-500')}
                                                        >
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {depositTypeOptions.map((option) => (
                                                                <SelectItem key={option.name} value={option.name}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                            {depositTypeOptions.length === 0 && (
                                                                <SelectItem value="no-types" disabled>
                                                                    No deposit types available
                                                                </SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {formErrors[typeErrorKey] && (
                                                        <p className="mt-1 text-xs text-red-500">{formErrors[typeErrorKey]}</p>
                                                    )}
                                                </div>
                                                <div className="w-full flex-auto sm:min-w-0">
                                                    <Label htmlFor={`deposit_value_${actualIndex}`} className="sr-only">
                                                        Value
                                                    </Label>
                                                    <Input
                                                        id={`deposit_value_${actualIndex}`}
                                                        name={`activeDeposits.${actualIndex}.deposit_value`}
                                                        value={deposit.deposit_value}
                                                        onChange={(e) => handleActiveDepositChange(actualIndex, 'deposit_value', e.target.value)}
                                                        placeholder="Value"
                                                        className={cn('h-9 w-full', formErrors[valueErrorKey] && 'border-red-500')}
                                                        type="text"
                                                    />
                                                    {formErrors[valueErrorKey] && (
                                                        <p className="mt-1 text-xs text-red-500">{formErrors[valueErrorKey]}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full flex-1 sm:min-w-0">
                                                <Label htmlFor={`deposit_description_${actualIndex}`} className="sr-only">
                                                    Description
                                                </Label>
                                                <Input
                                                    id={`deposit_description_${actualIndex}`}
                                                    name={`activeDeposits.${actualIndex}.description`}
                                                    value={deposit.description || ''}
                                                    onChange={(e) => handleActiveDepositChange(actualIndex, 'description', e.target.value)}
                                                    placeholder="Description (Optional)"
                                                    className={cn('h-9 w-full', formErrors[descErrorKey] && 'border-red-500')}
                                                />
                                                {formErrors[descErrorKey] && <p className="mt-1 text-xs text-red-500">{formErrors[descErrorKey]}</p>}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 flex-shrink-0"
                                            onClick={() => handleRemoveDeposit(actualIndex)}
                                            aria-label={`Remove deposit ${actualIndex + 1}`}
                                        >
                                            <Trash2 className="text-destructive h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-sm">
                                No additional deposits added yet.
                            </p>
                        )}
                        {formErrors.activeDeposits && typeof formErrors.activeDeposits === 'string' && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.activeDeposits}</p>
                        )}
                    </div>
                </FormSection>

                {/* --- Rental Details (Dates, Period, Cost, User - unchanged) --- */}
                <FormSection title="Rental Details" description="Specify the dates, period, cost, and responsible user.">
                    {/* Start Date */}
                    <FormField label="Start Date" htmlFor="actual_start_date" error={formErrors.actual_start_date} required>
                        <Dialog open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="actual_start_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.actual_start_date && 'text-muted-foreground',
                                        formErrors.actual_start_date && 'border-red-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.actual_start_date ? format(parseDateString(data.actual_start_date)!, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.actual_start_date)}
                                    onSelect={(date) => handleDateChange('actual_start_date', date)}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* End Date */}
                    <FormField label="End Date" htmlFor="end_date" error={formErrors.end_date} required>
                        <Dialog open={endDateDialogOpen} onOpenChange={setEndDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="end_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.end_date && 'text-muted-foreground',
                                        formErrors.end_date && 'border-red-500',
                                    )}
                                    disabled={!data.actual_start_date}
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

                    {/* Period Field */}
                    <FormField label="Period" htmlFor="period" error={formErrors.period}>
                        <Input
                            id="period"
                            name="period"
                            value={data.period}
                            readOnly
                            disabled
                            placeholder="Calculated duration"
                            className={cn('bg-muted/50', formErrors.period && 'border-red-500')}
                            aria-label="Calculated rental period"
                        />
                    </FormField>

                    {/* Coming Date */}
                    <FormField label="Coming Date" htmlFor="coming_date" error={formErrors.coming_date}>
                        <Dialog open={comingDateDialogOpen} onOpenChange={setComingDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="coming_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.coming_date && 'text-muted-foreground',
                                        formErrors.coming_date && 'border-red-500',
                                    )}
                                    disabled={!data.actual_start_date}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.coming_date ? format(parseDateString(data.coming_date)!, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.coming_date)}
                                    onSelect={(date) => handleDateChange('coming_date', date)}
                                    disabled={(date) => (data.actual_start_date ? date < new Date(data.actual_start_date + 'T00:00:00') : false)}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Rental Cost */}
                    <FormField label="Rental Cost" htmlFor="total_cost" error={formErrors.total_cost} required>
                        <Input
                            id="total_cost"
                            name="total_cost"
                            type="number"
                            step="any"
                            value={data.total_cost}
                            onChange={handleInputChange}
                            placeholder="e.g., 1200.50"
                            className={cn(formErrors.total_cost && 'border-red-500')}
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

                {/* --- Additional Notes (unchanged) --- */}
                <FormSection title="Additional Notes" description="Add any relevant notes about this specific rental.">
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="notes"
                            name="notes"
                            value={data.notes || ''}
                            onChange={handleInputChange}
                            rows={4}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500',
                            )}
                            placeholder="Enter any rental-specific notes here..."
                        />
                    </FormField>
                </FormSection>

                {/* --- Form Actions (unchanged) --- */}
                <SheetFooter>
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
                                setData('actual_start_date', today);
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create Rental'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
