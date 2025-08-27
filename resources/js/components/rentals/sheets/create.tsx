import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// Assuming VehicleStatusType has { id: string | number; status_name: string; ... }
// Assuming Deposits includes optional registered_number and expiry_date
import { Customers, Deposits, User, Vehicle, VehicleStatusType } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { differenceInDays, format, isValid, parse } from 'date-fns'; // Import differenceInDays, format, isValid, parse
import { Bike, CalendarIcon, Check, ChevronsUpDown, Trash2, User2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions ---
const formatDateForInput = (date: Date | string | null | undefined): string => {
    // Unchanged
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            // console.warn('Invalid date value encountered in formatDateForInput:', date);
            return '';
        }
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

const calculatePeriod = (startDateStr: string, endDateStr: string): number => {
    // Unchanged
    if (!startDateStr || !endDateStr) {
        return 0;
    }
    try {
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(endDateStr + 'T00:00:00');

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
            return 0;
        }
        const diffDays = differenceInDays(endDate, startDate);
        return diffDays >= 0 ? diffDays : 0;
    } catch (error) {
        console.error('Error calculating period:', error);
        return 0;
    }
};

const formatPeriod = (totalDays: number | string | null | undefined): string => {
    // Unchanged
    const numDays = Number(totalDays);

    if (isNaN(numDays) || numDays < 0) {
        return '';
    }
    if (numDays === 0) return '0 days';
    if (numDays === 1) return '1 day';

    const approxYears = Math.floor(numDays / 365);
    const daysAfterYears = numDays % 365;
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

    return periodString || `${numDays} days`;
};

// Helper to parse YYYY-MM-DD string into a Date object for the Calendar
const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
        // Use parse from date-fns for better handling of timezones/formats if needed
        // Ensure the input string is treated as local date
        const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) ? parsedDate : undefined;
    } catch {
        return undefined;
    }
};

// --- Type Definitions ---
interface EnhancedDeposit extends Omit<Deposits, 'id'> {
    id?: string | number;
    is_primary?: boolean;
    registered_number?: string | null;
    expiry_date?: string | null; // Stays as string 'YYYY-MM-DD' or null/empty
}

type InitialFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    activeDeposits: EnhancedDeposit[];
    customer_name: string;
    vehicle_no: string;
    status_name: string;
    user_name: string;
    actual_start_date: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    total_cost: string;
    notes: string;
};

type FormErrors = Partial<
    Record<keyof Omit<InitialFormValues, 'activeDeposits'> | `activeDeposits.${number}.${keyof EnhancedDeposit}` | 'activeDeposits', string>
>;

const initialFormValues: InitialFormValues = {
    customer_name: '',
    vehicle_no: '',
    status_name: '',
    actual_start_date: '',
    end_date: '',
    period: 0,
    coming_date: '',
    total_cost: '',
    notes: '',
    user_name: '',
    activeDeposits: [
        {
            id: 'primary_0',
            deposit_type: '',
            deposit_value: '',
            registered_number: '',
            expiry_date: '', // Initialize expiry_date as empty string
            description: '',
            is_primary: true,
        },
    ],
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
    availableVehicles: Vehicle[] | null;
    vehicleStatuses: VehicleStatusType[] | null;
    customers: Customers[] | null;
    depositTypes: Deposits[] | null;
    users: User[] | null;
    onSubmitSuccess: (data: InitialFormValues) => void;
    initialVehicleNo?: string;
}

export function Create({ availableVehicles, vehicleStatuses, customers, depositTypes, users, onSubmitSuccess, initialVehicleNo }: CreateProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>({
        ...initialFormValues,
        vehicle_no: initialVehicleNo || '',
    });

    useEffect(() => {
        if (initialVehicleNo) {
            setData('vehicle_no', initialVehicleNo);
        }
    }, [initialVehicleNo, setData]);

    const formErrors = errors as FormErrors;
    // State for Combobox Dialogs (unchanged)
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);

    // State for Date Picker Dialogs (unchanged)
    const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
    const [endDateDialogOpen, setEndDateDialogOpen] = useState(false);
    const [comingDateDialogOpen, setComingDateDialogOpen] = useState(false);

    // --- NEW: State for Expiry Date Picker Dialogs ---
    // Use a map to store the open state for each deposit index
    const [expiryDateDialogsOpen, setExpiryDateDialogsOpen] = useState<Record<number, boolean>>({});

    const depositTypeOptions = depositTypes || [];

    // --- Effects ---
    // Set Initial Start Date (unchanged)
    useEffect(() => {
        const today = formatDateForInput(new Date());
        if (!data.actual_start_date) {
            setData('actual_start_date', today);
        }
    }, [data.actual_start_date, setData]);

    // Calculate Period Effect (unchanged)
    useEffect(() => {
        const calculatedDays = calculatePeriod(data.actual_start_date, data.end_date);
        if (calculatedDays !== data.period) {
            setData('period', calculatedDays);
        }
        if (data.coming_date && data.actual_start_date && new Date(data.coming_date + 'T00:00:00') < new Date(data.actual_start_date + 'T00:00:00')) {
            setData('coming_date', '');
        }
    }, [data.actual_start_date, data.end_date, data.coming_date, data.period, setData]);

    // --- Generic Handlers ---
    // handleInputChange (unchanged)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const key = name as keyof Omit<
            InitialFormValues,
            | 'activeDeposits'
            | 'customer_name'
            | 'vehicle_no'
            | 'status_name'
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

    // handleComboboxChange (unchanged)
    const handleComboboxChange = (name: 'customer_name' | 'vehicle_no' | 'status_name' | 'user_name', value: string) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    // handleActiveDepositChange (Simplified: no expiry date component logic)
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

    // --- NEW: Handler for Expiry Date Picker Selection ---
    const handleExpiryDateSelect = (index: number, date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        // Use the existing handler to update the specific field
        handleActiveDepositChange(index, 'expiry_date', formattedDate);

        // Close the specific dialog for this index
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: false }));

        // Clear potential error for this specific expiry date
        const errorKey = `activeDeposits.${index}.expiry_date` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
    };

    // --- NEW: Handler to open/close specific expiry date dialogs ---
    const handleExpiryDateDialogOpenChange = (index: number, open: boolean) => {
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: open }));
    };

    // handleAddContact (unchanged, expiry_date initialized as '')
    const handleAddDeposit = () => {
        const newDeposit: EnhancedDeposit = {
            id: `new_${Date.now()}`,
            deposit_type: '',
            deposit_value: '',
            registered_number: '',
            expiry_date: '', // Stays empty
            description: '',
            is_primary: false,
        };
        setData('activeDeposits', [...data.activeDeposits, newDeposit]);
    };

    // handleRemoveDeposit (unchanged)
    const handleRemoveDeposit = (indexToRemove: number) => {
        if (indexToRemove === 0) {
            toast.error('Cannot remove the primary deposit.');
            return;
        }
        const updatedDeposits = data.activeDeposits.filter((_, index) => index !== indexToRemove);
        setData('activeDeposits', updatedDeposits);

        // Also remove the dialog state for the removed item
        setExpiryDateDialogsOpen((prev) => {
            const newState = { ...prev };
            delete newState[indexToRemove];
            // Adjust indices for subsequent items if needed (though map keys handle this)
            return newState;
        });

        clearErrors(); // Clear all errors might be too broad, consider clearing specific errors if needed
    };

    // --- Date Picker Handler (for Start/End/Coming Date - unchanged) ---
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
            }
            if (data.coming_date && new Date(data.coming_date + 'T00:00:00') < new Date(formattedDate + 'T00:00:00')) {
                setData('coming_date', '');
            }
        }
    };

    // --- Memoized Options (unchanged) ---
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

    // --- Form Submission (Validation Simplified) ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors(); // Clear previous errors
        const url = '/rentals/register';

        const primaryDeposit = data.activeDeposits[0];
        let hasValidationError = false;
        const validationErrors: Partial<FormErrors> = {};

        // --- Validation ---
        // Primary Deposit Type & Value (unchanged)
        if (!primaryDeposit || !primaryDeposit.deposit_type) {
            validationErrors['activeDeposits.0.deposit_type'] = 'Primary deposit type is required.';
            hasValidationError = true;
        }
        if (!primaryDeposit || !primaryDeposit.deposit_value) {
            validationErrors['activeDeposits.0.deposit_value'] = 'Primary deposit value is required.';
            hasValidationError = true;
        }

        // --- SIMPLIFIED: Expiry Date Validation ---
        // Basic check: if expiry_date is present, ensure it's a valid date format.
        // More complex validation (e.g., must be in the future) should ideally happen server-side.
        data.activeDeposits.forEach((deposit, index) => {
            if (deposit.expiry_date && !isValid(parseDateString(deposit.expiry_date))) {
                // This case should be rare with the Calendar picker, but good as a fallback
                validationErrors[`activeDeposits.${index}.expiry_date`] = `Deposit ${index + 1} expiry date is invalid.`;
                hasValidationError = true;
            }
            // Add validation for other fields like registered_number here if needed
            // Example:
            // if (deposit.deposit_type === 'SomeTypeRequiringRegNum' && !deposit.registered_number) {
            //     validationErrors[`activeDeposits.${index}.registered_number`] = `Registered number required for this deposit type.`;
            //     hasValidationError = true;
            // }
        });
        // --- End of SIMPLIFIED Expiry Date Validation ---

        // --- Handle Validation Results ---
        if (hasValidationError) {
            setData('errors', { ...errors, ...validationErrors }); // Use setData to update errors state managed by useForm
            toast.error('Please correct the errors in the form.');
            return; // Stop submission
        }
        console.log(data)

        // --- Post Data (unchanged) ---
        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                onSubmitSuccess(data);
                reset(); // Reset form to initial values
                setData('actual_start_date', formatDateForInput(new Date())); // Reset start date to today
                setExpiryDateDialogsOpen({}); // Reset expiry date dialog states
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors; // Cast received errors
                console.error('Submission Errors:', currentErrors);
                // Display errors using toast (unchanged logic)
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        const fieldNameParts = field.split('.');
                        const userFriendlyFieldName = fieldNameParts
                            .map((part) => {
                                if (part === 'activeDeposits') return 'Deposits';
                                if (/^\d+$/.test(part)) return `Item ${parseInt(part) + 1}`;
                                if (part === 'status_name') return 'Vehicle Status';
                                if (part === 'customer_name') return 'Customer';
                                if (part === 'vehicle_no') return 'Vehicle No';
                                if (part === 'user_name') return 'Incharge By';
                                if (part === 'actual_start_date') return 'Start Date';
                                if (part === 'end_date') return 'End Date';
                                if (part === 'total_cost') return 'Rental Cost';
                                if (part === 'deposit_type') return 'Type';
                                if (part === 'deposit_value') return 'Value';
                                if (part === 'registered_number') return 'Registered Number';
                                if (part === 'expiry_date') return 'Expiry Date';
                                if (part === 'period') return 'Period';
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

    // Memoize primary deposit details (unchanged)
    const primaryDeposit = useMemo(
        () => data.activeDeposits[0] || { deposit_type: '', deposit_value: '', is_primary: true, registered_number: '', expiry_date: '' },
        [data.activeDeposits],
    );
    const primaryDepositTypeError = formErrors['activeDeposits.0.deposit_type'];
    const primaryDepositValueError = formErrors['activeDeposits.0.deposit_value'];
    const primaryDepositExpiryError = formErrors['activeDeposits.0.expiry_date']; // Error for the expiry date field

    // console.log('Rendering Create component. Current data.activeDeposits:', JSON.stringify(data.activeDeposits, null, 2));
    // console.log('Current form errors:', JSON.stringify(formErrors, null, 2));

    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Relational Information Section (unchanged JSX) --- */}
                <FormSection title="Relational Information" description="Enter the relational information for the new rental.">
                    {/* Customer Combobox */}
                    <FormField label="Customer" htmlFor="create-customer_name" error={formErrors.customer_name} required>
                        <Popover open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                            <PopoverTrigger asChild>
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
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                                        <User2 className="mr-1 h-4 w-4" /> Add Customer
                                    </Link>
                                </Button>
                            </PopoverContent>
                        </Popover>
                        {validCustomers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No customers available.</p>}
                    </FormField>

                    {/* Vehicle Combobox */}
                    <FormField label="Vehicle No" htmlFor="create-vehicle_no" error={formErrors.vehicle_no} required>
                        {initialVehicleNo ? (
                            <Input id="create-vehicle_no" value={initialVehicleNo} readOnly disabled className={'bg-muted/50'} />
                        ) : (
                            <>
                                <Popover open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                                    <PopoverTrigger asChild>
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
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                                                                handleComboboxChange(
                                                                    'vehicle_no',
                                                                    currentValue === data.vehicle_no ? '' : currentValue,
                                                                );
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
                                            <Link
                                                href={'/vehicles'}
                                                className="flex w-full shrink-0 items-center justify-center gap-2 text-sm sm:w-auto"
                                            >
                                                <Bike className="mr-1 h-4 w-4" /> Check Vehicle Stocks
                                            </Link>
                                        </Button>
                                    </PopoverContent>
                                </Popover>
                                {validVehicles.length === 0 && !processing && (
                                    <p className="text-muted-foreground mt-1 text-sm">No vehicles available.</p>
                                )}
                            </>
                        )}
                    </FormField>

                    {/* Vehicle Status Combobox */}
                    <FormField label="Vehicle Status" htmlFor="create-status_name" error={formErrors.status_name} required>
                        <Popover open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <PopoverTrigger asChild>
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
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                            </PopoverContent>
                        </Popover>
                        {validVehicleStatuses.length === 0 && !processing && (
                            <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available.</p>
                        )}
                    </FormField>
                </FormSection>

                {/* --- Deposit Information Section --- */}
                <FormSection title="Deposit Information" description="Add the customer's deposit details. The first deposit is primary.">
                    {/* Primary Deposit Fields */}
                    <h4 className="text-base font-semibold">Primary Deposit</h4>
                    <div className="space-y-4">
                        {/* Type */}
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
                        {/* Value */}
                        <FormField label="Deposit" htmlFor="primary_deposit_value_0" error={primaryDepositValueError} required>
                            <Input
                                id="primary_deposit_value_0"
                                name="activeDeposits.0.deposit_value"
                                value={primaryDeposit.deposit_value}
                                onChange={(e) => handleActiveDepositChange(0, 'deposit_value', e.target.value)}
                                className={cn(primaryDepositValueError && 'border-red-500')}
                                placeholder="e.g., 500 or Cash Deposit"
                                type="text"
                                required
                            />
                        </FormField>
                        {/* Registered Number */}
                        <FormField label="Registered Number" htmlFor="primary_deposit_registered_number_0">
                            <Input
                                id="primary_deposit_registered_number_0"
                                name="activeDeposits.0.registered_number"
                                value={primaryDeposit.registered_number || ''}
                                onChange={(e) => handleActiveDepositChange(0, 'registered_number', e.target.value)}
                                placeholder="Registered Number (Optional)"
                            />
                        </FormField>

                        {/* --- MODIFIED: Primary Expiry Date (using Calendar Popover) --- */}
                        <FormField label="Expiry Date" htmlFor="primary_expiry_date_0" error={primaryDepositExpiryError}>
                            <Popover open={expiryDateDialogsOpen[0] || false} onOpenChange={(open) => handleExpiryDateDialogOpenChange(0, open)}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        id="primary_expiry_date_0" // Use a unique ID if needed, but label points here
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !primaryDeposit.expiry_date && 'text-muted-foreground',
                                            primaryDepositExpiryError && 'border-red-500',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {primaryDeposit.expiry_date ? (
                                            format(parseDateString(primaryDeposit.expiry_date)!, 'PPP')
                                        ) : (
                                            <span>Pick expiry date (Optional)</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={parseDateString(primaryDeposit.expiry_date)}
                                        onSelect={(date) => handleExpiryDateSelect(0, date)} // Pass index 0
                                        captionLayout="dropdown"
                                    />
                                </PopoverContent>
                            </Popover>
                        </FormField>
                        {/* --- End of MODIFIED Primary Expiry Date --- */}

                        {/* Description */}
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

                    {/* --- Additional Deposits Section --- */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold">Additional Deposits</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddDeposit}>
                                Add Deposit
                            </Button>
                        </div>
                        {data.activeDeposits.length > 1 ? (
                            data.activeDeposits.slice(1).map((deposit, index) => {
                                const actualIndex = index + 1; // Index in the full activeDeposits array
                                const typeErrorKey = `activeDeposits.${actualIndex}.deposit_type` as keyof FormErrors;
                                const valueErrorKey = `activeDeposits.${actualIndex}.deposit_value` as keyof FormErrors;
                                const regNumErrorKey = `activeDeposits.${actualIndex}.registered_number` as keyof FormErrors;
                                const expiryErrorKey = `activeDeposits.${actualIndex}.expiry_date` as keyof FormErrors; // Error key for the whole date field
                                const descErrorKey = `activeDeposits.${actualIndex}.description` as keyof FormErrors;

                                return (
                                    <div
                                        key={deposit.id || `additional_${actualIndex}`}
                                        className="bg-muted/50 hover:bg-muted/70 flex flex-col gap-3 rounded-md border p-3 transition-colors sm:flex-row sm:items-start sm:gap-2"
                                    >
                                        {/* Input Fields Container */}
                                        <div className="grid flex-grow grid-cols-1 gap-x-2 gap-y-3 sm:grid-cols-2">
                                            {/* Type Select */}
                                            <div className="w-full">
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
                                                                No deposit types
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {formErrors[typeErrorKey] && <p className="mt-1 text-xs text-red-500">{formErrors[typeErrorKey]}</p>}
                                            </div>

                                            {/* Value Input */}
                                            <div className="w-full">
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

                                            {/* Registered Number Input */}
                                            <div className="w-full">
                                                <Label htmlFor={`deposit_registered_number_${actualIndex}`} className="sr-only">
                                                    Registered Number
                                                </Label>
                                                <Input
                                                    id={`deposit_registered_number_${actualIndex}`}
                                                    name={`activeDeposits.${actualIndex}.registered_number`}
                                                    value={deposit.registered_number || ''}
                                                    onChange={(e) => handleActiveDepositChange(actualIndex, 'registered_number', e.target.value)}
                                                    placeholder="Registered Number (Optional)"
                                                    className={cn('h-9 w-full', formErrors[regNumErrorKey] && 'border-red-500')}
                                                />
                                                {formErrors[regNumErrorKey] && (
                                                    <p className="mt-1 text-xs text-red-500">{formErrors[regNumErrorKey]}</p>
                                                )}
                                            </div>

                                            {/* --- MODIFIED: Additional Expiry Date (using Calendar Dialog) --- */}
                                            <div className="w-full">
                                                <Label htmlFor={`expiry_date_${actualIndex}`} className="sr-only">
                                                    Expiry Date
                                                </Label>
                                                <Popover
                                                    open={expiryDateDialogsOpen[actualIndex] || false}
                                                    onOpenChange={(open) => handleExpiryDateDialogOpenChange(actualIndex, open)}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={'outline'}
                                                            id={`expiry_date_${actualIndex}`} // Unique ID
                                                            className={cn(
                                                                'h-9 w-full justify-start text-left font-normal', // Match height of other inputs
                                                                !deposit.expiry_date && 'text-muted-foreground',
                                                                formErrors[expiryErrorKey] && 'border-red-500',
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {deposit.expiry_date ? (
                                                                format(parseDateString(deposit.expiry_date), 'PPP')
                                                            ) : (
                                                                <span>Pick expiry date</span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseDateString(deposit.expiry_date)}
                                                            onSelect={(date) => {
                                                                handleExpiryDateSelect(actualIndex, date); // Pass actualIndex
                                                                handleExpiryDateDialogOpenChange(actualIndex, false);
                                                            }}
                                                            captionLayout="dropdown"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {formErrors[expiryErrorKey] && (
                                                    <p className="mt-1 text-xs text-red-500">{formErrors[expiryErrorKey]}</p>
                                                )}
                                            </div>
                                            {/* --- End of MODIFIED Additional Expiry Date --- */}

                                            {/* Description Input */}
                                            <div className="w-full sm:col-span-2">
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

                                        {/* Remove Button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-2 h-9 w-9 flex-shrink-0 self-start sm:mt-0"
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
                    {/* --- End of Additional Deposits Section --- */}
                </FormSection>

                {/* --- Rental Details Section (unchanged JSX) --- */}
                <FormSection title="Rental Details" description="Specify the dates, period, cost, and responsible user.">
                    {/* Start Date */}
                    <FormField label="Start Date" htmlFor="actual_start_date" error={formErrors.actual_start_date} required>
                        <Popover open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
                            <PopoverTrigger asChild>
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
                                    {data.actual_start_date ? format(parseDateString(data.actual_start_date), 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.actual_start_date)}
                                    onSelect={(date) => {
                                        handleDateChange('actual_start_date', date);
                                        setStartDateDialogOpen(false);
                                    }}
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
                    </FormField>

                    {/* End Date */}
                    <FormField label="End Date" htmlFor="end_date" error={formErrors.end_date} required>
                        <Popover open={endDateDialogOpen} onOpenChange={setEndDateDialogOpen}>
                            <PopoverTrigger asChild>
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
                                    {data.end_date ? format(parseDateString(data.end_date), 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.end_date)}
                                    onSelect={(date) => {
                                        handleDateChange('end_date', date);
                                        setEndDateDialogOpen(false);
                                    }}
                                    disabled={(date) => (data.actual_start_date ? date < new Date(data.actual_start_date + 'T00:00:00') : false)}
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
                    </FormField>

                    {/* Period Display */}
                    <FormField label="Period" htmlFor="period-display" error={formErrors.period}>
                        <Input
                            id="period-display"
                            name="period-display"
                            value={formatPeriod(data.period)}
                            readOnly
                            disabled
                            placeholder="Calculated duration"
                            className={cn('bg-muted/50', formErrors.period && 'border-red-500')}
                            aria-label="Calculated rental period"
                        />
                    </FormField>

                    {/* Coming Date */}
                    <FormField label="Coming Date" htmlFor="coming_date" error={formErrors.coming_date}>
                        <Popover open={comingDateDialogOpen} onOpenChange={setComingDateDialogOpen}>
                            <PopoverTrigger asChild>
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
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.coming_date)}
                                    onSelect={(date) => handleDateChange('coming_date', date)}
                                    disabled={(date) => (data.actual_start_date ? date < new Date(data.actual_start_date + 'T00:00:00') : false)}
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
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
                            required
                        />
                    </FormField>

                    {/* User Combobox */}
                    <FormField label="Incharge By" htmlFor="create-user_name" error={formErrors.user_name} required>
                        <Popover open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <PopoverTrigger asChild>
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
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                            </PopoverContent>
                        </Popover>
                        {validUsers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No users available.</p>}
                    </FormField>
                </FormSection>

                {/* --- Additional Notes Section (unchanged JSX) --- */}
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

                {/* --- Form Actions Section (unchanged JSX) --- */}
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
                                setExpiryDateDialogsOpen({}); // Reset expiry date dialogs on form reset
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
