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
// Assuming types are correctly defined
import { Customers, Deposits, RentalsType, User, VehicleStatusType } from '@/types';
import { useForm } from '@inertiajs/react';
import { differenceInDays, format, isValid, parse } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions (Unchanged) ---
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return '';
        }
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

const calculatePeriod = (startDateStr: string, endDateStr: string): number => {
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

const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
        const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) ? parsedDate : undefined;
    } catch {
        return undefined;
    }
};

// Type Definitions
// Represents a deposit entry in the form state (primary or additional)
interface FormDeposit extends Omit<Deposits, 'id' | 'rental_id' | 'created_at' | 'updated_at'> {
    // No temporary ID needed if using index
    is_primary?: boolean;
    deposit_type: string;
    deposit_value: string;
    registered_number?: string | null;
    expiry_date?: string | null;
    description?: string | null;
}

// Form state structure
type PickupFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit' | 'notes' | 'name'> & {
    rental_id: number | string;
    activeDeposits: FormDeposit[]; // Array holds primary (index 0) and additional deposits
    customer_name: string; // Readonly
    vehicle_no: string; // Readonly
    status_name: string;
    user_name: string;
    start_date: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    total_cost: string;
    notes: string;
};

// FormErrors type allowing nested keys for activeDeposits array
type FormErrors = Partial<
    Record<keyof Omit<PickupFormValues, 'activeDeposits'> | `activeDeposits.${number}.${keyof FormDeposit}` | 'activeDeposits', string>
>;

// Function to create an empty deposit object
const createEmptyDeposit = (): FormDeposit => ({
    deposit_type: '',
    deposit_value: '',
    registered_number: '',
    expiry_date: '',
    description: '',
    is_primary: true,
});

// Default values - Start with one empty deposit (which will be the primary)
const initialFormValues: PickupFormValues = {
    rental_id: '',
    customer_name: '',
    vehicle_no: '',
    status_name: '',
    start_date: '',
    end_date: '',
    period: 0,
    coming_date: '',
    total_cost: '',
    notes: '',
    user_name: '',
    activeDeposits: [createEmptyDeposit()], // Start with one primary deposit placeholder
};

// --- Reusable Components (Unchanged) ---
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

// --- Main Pickup Component ---
interface PickupProps {
    selectedRow: RentalsType | null;
    vehicleStatuses: VehicleStatusType[] | null;
    depositTypes: Deposits[] | null; // Only need names for options
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function Pickup({ selectedRow, vehicleStatuses, depositTypes, users, onSubmitSuccess }: PickupProps) {
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<PickupFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    // State for Dialogs
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
    const [endDateDialogOpen, setEndDateDialogOpen] = useState(false);
    const [comingDateDialogOpen, setComingDateDialogOpen] = useState(false);
    // State for expiry date dialogs, using index as key
    const [expiryDateDialogsOpen, setExpiryDateDialogsOpen] = useState<Record<number, boolean>>({});

    // Memoized options
    const depositTypeOptions = depositTypes || [];

    // Set Initial Start Date
    useEffect(() => {
        const today = formatDateForInput(new Date());
        if (!data.start_date) {
            setData('start_date', today);
        }
    }, []);

    // Calculate Period Effect
    useEffect(() => {
        const calculatedDays = calculatePeriod(data.start_date, data.end_date);
        if (calculatedDays !== data.period) {
            setData('period', calculatedDays);
        }
        if (data.coming_date && data.start_date) {
            const comingDate = parseDateString(data.coming_date);
            const startDate = parseDateString(data.start_date);
            if (comingDate && startDate && comingDate < startDate) {
                setData('coming_date', '');
            }
        }
    }, [data.start_date, data.end_date, data.coming_date, data.period, setData]);

    // Effect to populate form when selectedRow changes
    useEffect(() => {
        if (selectedRow) {
            const today = formatDateForInput(new Date());
            const populatedData: PickupFormValues = {
                rental_id: selectedRow.id ?? '',
                customer_name: selectedRow.customer?.name || selectedRow.full_name || '',
                vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || '',
                status_name: '',
                user_name: '',
                start_date: today,
                end_date: '',
                coming_date: '',
                period: 0,
                total_cost: '',
                notes: selectedRow.notes || '',
                // IMPORTANT: Initialize with one empty deposit for the primary
                activeDeposits: [createEmptyDeposit()],
            };
            setData(populatedData);
            setExpiryDateDialogsOpen({});
            clearErrors();
        } else {
            // Reset to initial state which includes one empty deposit
            reset();
            setData('start_date', formatDateForInput(new Date()));
            setExpiryDateDialogsOpen({});
            clearErrors();
        }
    }, [selectedRow, reset, clearErrors, setData]);

    // handleInputChange (unchanged)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name in data) {
            setData(name as keyof PickupFormValues, value);
            if (formErrors[name as keyof FormErrors]) {
                clearErrors(name as keyof FormErrors);
            }
        }
    };

    // handleComboboxChange (unchanged)
    const handleComboboxChange = (name: 'status_name' | 'user_name', value: string) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    // handleActiveDepositChange (Uses index)
    const handleActiveDepositChange = (index: number, field: keyof FormDeposit, value: string | boolean) => {
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

    // --- Handler for Expiry Date Picker Selection (Uses index) ---
    const handleExpiryDateSelect = (index: number, date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        handleActiveDepositChange(index, 'expiry_date', formattedDate);
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: false })); // Close the specific dialog

        const errorKey = `activeDeposits.${index}.expiry_date` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
    };

    // --- Handler to open/close specific expiry date dialogs (Uses index) ---
    const handleExpiryDateDialogOpenChange = (index: number, open: boolean) => {
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: open }));
    };

    // handleAddDeposit (Adds an additional deposit)
    const handleAddDeposit = () => {
        const newDeposit: FormDeposit = {
            id: `new_${Date.now()}`,
            deposit_type: '',
            deposit_value: '',
            registered_number: '',
            expiry_date: '',
            description: '',
            is_primary: false,
        };
        setData('activeDeposits', [...data.activeDeposits, newDeposit]);
        if (formErrors.activeDeposits) {
            clearErrors('activeDeposits');
        }
    };

    // handleRemoveDeposit (Uses index, prevents removing primary)
    const handleRemoveDeposit = (indexToRemove: number) => {
        if (indexToRemove === 0) {
            // Should not happen as button is hidden, but safeguard
            toast.error('Cannot remove the primary deposit.');
            return;
        }
        const updatedDeposits = data.activeDeposits.filter((_, index) => index !== indexToRemove);
        setData('activeDeposits', updatedDeposits);

        // Also remove the dialog state for the removed item and shift subsequent ones
        setExpiryDateDialogsOpen((prev) => {
            const newState: Record<number, boolean> = {};
            Object.entries(prev).forEach(([key, value]) => {
                const idx = parseInt(key, 10);
                if (idx < indexToRemove) {
                    newState[idx] = value;
                } else if (idx > indexToRemove) {
                    newState[idx - 1] = value; // Shift index down
                }
            });
            return newState;
        });

        clearErrors(); // Simplify by clearing all errors on removal
    };

    // --- Date Picker Handler (for Start/End/Coming Date - unchanged) ---
    const handleDateChange = (field: 'start_date' | 'end_date' | 'coming_date', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        setData(field, formattedDate);
        if (formErrors[field]) {
            clearErrors(field);
        }

        if (field === 'start_date') setStartDateDialogOpen(false);
        if (field === 'end_date') setEndDateDialogOpen(false);
        if (field === 'coming_date') setComingDateDialogOpen(false);

        if (field === 'start_date') {
            const newStartDate = parseDateString(formattedDate);
            if (newStartDate) {
                const endDate = parseDateString(data.end_date);
                const comingDate = parseDateString(data.coming_date);
                if (endDate && endDate < newStartDate) {
                    setData('end_date', '');
                }
                if (comingDate && comingDate < newStartDate) {
                    setData('coming_date', '');
                }
            }
        }
    };

    // Memoized valid options (unchanged)
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

    // --- Form Submission (Validates primary and additional deposits separately) ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();
        if (!data.rental_id) {
            toast.error('Cannot submit: Rental ID is missing.');
            return;
        }
        const url = `/rentals/${data.rental_id}/update/pick-up`;

        let hasValidationError = false;
        const validationErrors: Partial<FormErrors> = {};

        // --- Basic Field Validation ---
        if (!data.start_date) {
            validationErrors.start_date = 'Start date is required.';
            hasValidationError = true;
        }
        if (!data.end_date) {
            validationErrors.end_date = 'End date is required.';
            hasValidationError = true;
        }
        if (!data.total_cost || isNaN(parseFloat(data.total_cost)) || parseFloat(data.total_cost) < 0) {
            validationErrors.total_cost = 'Valid rental cost is required.';
            hasValidationError = true;
        }
        if (!data.status_name) {
            validationErrors.status_name = 'Vehicle status is required.';
            hasValidationError = true;
        }
        if (!data.user_name) {
            validationErrors.user_name = 'Incharge user is required.';
            hasValidationError = true;
        }

        // --- Deposit Validation ---
        // Primary Deposit (index 0)
        const primaryDeposit = data.activeDeposits[0];
        if (!primaryDeposit) {
            // Should always exist based on initialization
            validationErrors.activeDeposits = 'Primary deposit information is missing.';
            hasValidationError = true;
        } else {
            if (!primaryDeposit.deposit_type) {
                validationErrors['activeDeposits.0.deposit_type'] = 'Primary deposit type is required.';
                hasValidationError = true;
            }
            if (!primaryDeposit.deposit_value) {
                validationErrors['activeDeposits.0.deposit_value'] = 'Primary deposit value is required.';
                hasValidationError = true;
            }
            if (primaryDeposit.expiry_date && !isValid(parseDateString(primaryDeposit.expiry_date))) {
                validationErrors['activeDeposits.0.expiry_date'] = 'Primary deposit expiry date is invalid.';
                hasValidationError = true;
            }
        }

        // Additional Deposits (starting from index 1)
        data.activeDeposits.slice(1).forEach((deposit, index) => {
            const actualIndex = index + 1; // Index in the original array
            if (!deposit.deposit_type) {
                validationErrors[`activeDeposits.${actualIndex}.deposit_type`] = `Deposit ${actualIndex + 1} type is required.`;
                hasValidationError = true;
            }
            if (!deposit.deposit_value) {
                validationErrors[`activeDeposits.${actualIndex}.deposit_value`] = `Deposit ${actualIndex + 1} value is required.`;
                hasValidationError = true;
            }
            if (deposit.expiry_date && !isValid(parseDateString(deposit.expiry_date))) {
                validationErrors[`activeDeposits.${actualIndex}.expiry_date`] = `Deposit ${actualIndex + 1} expiry date is invalid.`;
                hasValidationError = true;
            }
        });
        // --- End of Deposit Validation ---

        if (hasValidationError) {
            setData('errors', validationErrors);
            toast.error('Please correct the errors in the form.');
            return;
        }

        // --- Post Data ---
        put(url, {
            preserveScroll: true,
            onSuccess: () => {
                const today = formatDateForInput(new Date());
                reset(); // Resets to initial state including one empty deposit
                setData((prev) => ({ ...prev, start_date: today }));
                setExpiryDateDialogsOpen({});
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);
                // Toast error display logic (unchanged)
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        const fieldNameParts = field.split('.');
                        const userFriendlyFieldName = fieldNameParts
                            .map((part) => {
                                if (part === 'activeDeposits') return 'Deposits';
                                // Adjust index display for user (+1)
                                if (/^\d+$/.test(part)) return `Item ${parseInt(part) + 1}`;
                                if (part === 'vehicle_no') return 'Vehicle No';
                                if (part === 'user_name') return 'Incharge By';
                                if (part === 'start_date') return 'Start Date';
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
                    toast.error('Failed to process pickup. An unknown error occurred.');
                }
            },
        });
    };

    // Memoize primary deposit details for easier access in JSX
    const primaryDeposit = useMemo(() => data.activeDeposits[0] || createEmptyDeposit(), [data.activeDeposits]);
    const primaryDepositTypeError = formErrors['activeDeposits.0.deposit_type'];
    const primaryDepositValueError = formErrors['activeDeposits.0.deposit_value'];
    const primaryDepositRegNumError = formErrors['activeDeposits.0.registered_number'];
    const primaryDepositExpiryError = formErrors['activeDeposits.0.expiry_date'];
    const primaryDepositDescError = formErrors['activeDeposits.0.description'];

    // Conditional rendering for loading/no selection (Unchanged)
    if (!selectedRow && !processing) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">No rental selected for pickup processing.</div>;
    }
    if (processing && data.rental_id !== selectedRow?.id) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Loading rental data...</div>;
    }
    if (!data.rental_id && selectedRow) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Initializing form...</div>;
    }

    // --- JSX Structure ---
    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer & Vehicle Section (Read-Only) */}
                <FormSection title="Customer & Vehicle" description="Customer and vehicle associated with this rental (read-only).">
                    <FormField label="Customer" htmlFor="customer_name">
                        <Input id="customer_name" name="customer_name" value={data.customer_name} readOnly disabled className="bg-muted/50" />
                    </FormField>
                    <FormField label="Vehicle No" htmlFor="vehicle_no">
                        <Input id="vehicle_no" name="vehicle_no" value={data.vehicle_no} readOnly disabled className="bg-muted/50" />
                    </FormField>
                </FormSection>

                {/* Rental Details Section */}
                <FormSection title="Rental Details" description="Update the dates, period, cost, status, and responsible user.">
                    {/* Start Date Field */}
                    <FormField label="Start Date" htmlFor="start_date" error={formErrors.start_date} required>
                        <Dialog open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="start_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.start_date && 'text-muted-foreground',
                                        formErrors.start_date && 'border-red-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.start_date && isValid(parseDateString(data.start_date)) ? (
                                        format(parseDateString(data.start_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.start_date)}
                                    onSelect={(date) => handleDateChange('start_date', date)}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* End Date Field */}
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
                                    disabled={!data.start_date || !isValid(parseDateString(data.start_date))}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.end_date && isValid(parseDateString(data.end_date)) ? (
                                        format(parseDateString(data.end_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.end_date)}
                                    onSelect={(date) => handleDateChange('end_date', date)}
                                    disabled={(date) => {
                                        const startDate = parseDateString(data.start_date);
                                        return startDate ? date < startDate : false;
                                    }}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Period Display (Read-Only) */}
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

                    {/* Coming Date Field (Optional) */}
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
                                    disabled={!data.start_date || !isValid(parseDateString(data.start_date))}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.coming_date && isValid(parseDateString(data.coming_date)) ? (
                                        format(parseDateString(data.coming_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date (Optional)</span>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.coming_date)}
                                    onSelect={(date) => handleDateChange('coming_date', date)}
                                    disabled={(date) => {
                                        const startDate = parseDateString(data.start_date);
                                        return startDate ? date < startDate : false;
                                    }}
                                    initialFocus
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Rental Cost Field */}
                    <FormField label="Rental Cost" htmlFor="total_cost" error={formErrors.total_cost} required>
                        <Input
                            id="total_cost"
                            name="total_cost"
                            type="number"
                            step="any"
                            min="0"
                            value={data.total_cost}
                            onChange={handleInputChange}
                            placeholder="e.g., 1200.50"
                            className={cn(formErrors.total_cost && 'border-red-500')}
                            required
                        />
                    </FormField>

                    {/* Vehicle Status Combobox */}
                    <FormField label="Vehicle Status" htmlFor="pickup-status_name" error={formErrors.status_name} required>
                        <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleStatusDialogOpen}
                                    aria-label="Select vehicle status"
                                    id="pickup-status_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.status_name && 'text-muted-foreground',
                                        formErrors.status_name && 'border-red-500',
                                    )}
                                    disabled={processing || validVehicleStatuses.length === 0}
                                >
                                    {data.status_name
                                        ? (validVehicleStatuses.find((status) => status.status_name === data.status_name)?.status_name ??
                                          'Select status...')
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
                                                    key={status.id}
                                                    value={status.status_name}
                                                    onSelect={(currentValue) => {
                                                        const selectedStatus = validVehicleStatuses.find(
                                                            (s) => s.status_name.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        handleComboboxChange('status_name', selectedStatus ? selectedStatus.status_name : '');
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

                    {/* User (Incharge By) Combobox */}
                    <FormField label="Incharge By" htmlFor="pickup-user_name" error={formErrors.user_name} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    aria-label="Select user"
                                    id="pickup-user_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground',
                                        formErrors.user_name && 'border-red-500',
                                    )}
                                    disabled={processing || validUsers.length === 0}
                                >
                                    {data.user_name
                                        ? (validUsers.find((user) => user.name === data.user_name)?.name ?? 'Select user...')
                                        : 'Select user...'}
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
                                                        const selectedUser = validUsers.find(
                                                            (u) => u.name.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        handleComboboxChange('user_name', selectedUser ? selectedUser.name : '');
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

                {/* Deposit Information Section */}
                <FormSection title="Deposit Information" description="Add the primary deposit and any additional deposits collected.">
                    {/* --- Primary Deposit Section --- */}
                    <h4 className="text-base font-semibold">Primary Deposit</h4>
                    <div className="border-primary/50 space-y-4 rounded-md p-4">
                        {/* Type */}
                        <FormField label="Type" htmlFor="primary_deposit_type_0" error={primaryDepositTypeError} required>
                            <Select
                                value={primaryDeposit.deposit_type}
                                onValueChange={(value) => handleActiveDepositChange(0, 'deposit_type', value)}
                                required
                            >
                                <SelectTrigger id="primary_deposit_type_0" className={cn(primaryDepositTypeError && 'border-red-500')}>
                                    <SelectValue placeholder="Select primary type *" />
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
                        <FormField label="Value" htmlFor="primary_deposit_value_0" error={primaryDepositValueError} required>
                            <Input
                                id="primary_deposit_value_0"
                                name="activeDeposits.0.deposit_value" // Use index in name
                                value={primaryDeposit.deposit_value}
                                onChange={(e) => handleActiveDepositChange(0, 'deposit_value', e.target.value)}
                                className={cn(primaryDepositValueError && 'border-red-500')}
                                placeholder="e.g., 500 or ID Card *"
                                type="text"
                                required
                            />
                        </FormField>
                        {/* Registered Number */}
                        <FormField label="Registered Number" htmlFor="primary_deposit_registered_number_0" error={primaryDepositRegNumError}>
                            <Input
                                id="primary_deposit_registered_number_0"
                                name="activeDeposits.0.registered_number"
                                value={primaryDeposit.registered_number || ''}
                                onChange={(e) => handleActiveDepositChange(0, 'registered_number', e.target.value)}
                                className={cn(primaryDepositRegNumError && 'border-red-500')}
                                placeholder="Registered Number (Optional)"
                            />
                        </FormField>

                        {/* Primary Expiry Date (using Calendar Dialog) */}
                        <FormField label="Expiry Date" htmlFor="primary_expiry_date_0" error={primaryDepositExpiryError}>
                            <Dialog open={expiryDateDialogsOpen[0] || false} onOpenChange={(open) => handleExpiryDateDialogOpenChange(0, open)}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        id="primary_expiry_date_0"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !primaryDeposit.expiry_date && 'text-muted-foreground',
                                            primaryDepositExpiryError && 'border-red-500',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {primaryDeposit.expiry_date && isValid(parseDateString(primaryDeposit.expiry_date)) ? (
                                            format(parseDateString(primaryDeposit.expiry_date)!, 'PPP')
                                        ) : (
                                            <span>Pick expiry date (Optional)</span>
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="w-auto py-6">
                                    <Calendar
                                        mode="single"
                                        selected={parseDateString(primaryDeposit.expiry_date)}
                                        onSelect={(date) => handleExpiryDateSelect(0, date)} // Pass index 0
                                        initialFocus
                                        // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Optional: disable past dates
                                    />
                                </DialogContent>
                            </Dialog>
                        </FormField>

                        {/* Description */}
                        <FormField label="Description" htmlFor="primary_deposit_description_0" error={primaryDepositDescError}>
                            <Input
                                id="primary_deposit_description_0"
                                name="activeDeposits.0.description"
                                value={primaryDeposit.description || ''}
                                onChange={(e) => handleActiveDepositChange(0, 'description', e.target.value)}
                                className={cn(primaryDepositDescError && 'border-red-500')}
                                placeholder="Description (Optional)"
                            />
                        </FormField>
                    </div>
                    {/* --- End of Primary Deposit Section --- */}

                    {/* --- Additional Deposits Section --- */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold">Additional Deposits</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddDeposit} disabled={processing}>
                                Add Deposit
                            </Button>
                        </div>
                        {data.activeDeposits.length > 1 ? (
                            data.activeDeposits.slice(1).map((deposit, index) => {
                                const actualIndex = index + 1; // Index in the full activeDeposits array
                                const typeErrorKey = `activeDeposits.${actualIndex}.deposit_type` as keyof FormErrors;
                                const valueErrorKey = `activeDeposits.${actualIndex}.deposit_value` as keyof FormErrors;
                                const regNumErrorKey = `activeDeposits.${actualIndex}.registered_number` as keyof FormErrors;
                                const expiryErrorKey = `activeDeposits.${actualIndex}.expiry_date` as keyof FormErrors;
                                const descErrorKey = `activeDeposits.${actualIndex}.description` as keyof FormErrors;

                                return (
                                    <div
                                        key={`additional_${actualIndex}`} // Use index for key
                                        className="bg-muted/50 hover:bg-muted/70 flex flex-col gap-3 rounded-md border p-3 transition-colors sm:flex-row sm:items-start sm:gap-2"
                                    >
                                        {/* Input Fields Container */}
                                        <div className="grid flex-grow grid-cols-1 gap-x-2 gap-y-3 sm:grid-cols-2">
                                            {/* Type Select */}
                                            <div className="w-full">
                                                <Label htmlFor={`deposit_type_${actualIndex}`} className="sr-only">
                                                    Type {actualIndex + 1}
                                                </Label>
                                                <Select
                                                    value={deposit.deposit_type}
                                                    onValueChange={(value) => handleActiveDepositChange(actualIndex, 'deposit_type', value)}
                                                    required
                                                >
                                                    <SelectTrigger
                                                        id={`deposit_type_${actualIndex}`}
                                                        className={cn('h-9 w-full', formErrors[typeErrorKey] && 'border-red-500')}
                                                    >
                                                        <SelectValue placeholder="Select Type *" />
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
                                                    Value {actualIndex + 1}
                                                </Label>
                                                <Input
                                                    id={`deposit_value_${actualIndex}`}
                                                    name={`activeDeposits.${actualIndex}.deposit_value`}
                                                    value={deposit.deposit_value}
                                                    onChange={(e) => handleActiveDepositChange(actualIndex, 'deposit_value', e.target.value)}
                                                    placeholder="Value *"
                                                    className={cn('h-9 w-full', formErrors[valueErrorKey] && 'border-red-500')}
                                                    type="text"
                                                    required
                                                />
                                                {formErrors[valueErrorKey] && (
                                                    <p className="mt-1 text-xs text-red-500">{formErrors[valueErrorKey]}</p>
                                                )}
                                            </div>

                                            {/* Registered Number Input */}
                                            <div className="w-full">
                                                <Label htmlFor={`deposit_registered_number_${actualIndex}`} className="sr-only">
                                                    Registered Number {actualIndex + 1}
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

                                            {/* Additional Expiry Date (using Calendar Dialog) */}
                                            <div className="w-full">
                                                <Label htmlFor={`expiry_date_${actualIndex}`} className="sr-only">
                                                    Expiry Date {actualIndex + 1}
                                                </Label>
                                                <Dialog
                                                    open={expiryDateDialogsOpen[actualIndex] || false}
                                                    onOpenChange={(open) => handleExpiryDateDialogOpenChange(actualIndex, open)}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant={'outline'}
                                                            id={`expiry_date_${actualIndex}`}
                                                            className={cn(
                                                                'h-9 w-full justify-start text-left font-normal',
                                                                !deposit.expiry_date && 'text-muted-foreground',
                                                                formErrors[expiryErrorKey] && 'border-red-500',
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {deposit.expiry_date && isValid(parseDateString(deposit.expiry_date)) ? (
                                                                format(parseDateString(deposit.expiry_date)!, 'PPP')
                                                            ) : (
                                                                <span>Pick expiry date</span>
                                                            )}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="w-auto py-6">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseDateString(deposit.expiry_date)}
                                                            onSelect={(date) => handleExpiryDateSelect(actualIndex, date)}
                                                            initialFocus
                                                            // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                {formErrors[expiryErrorKey] && (
                                                    <p className="mt-1 text-xs text-red-500">{formErrors[expiryErrorKey]}</p>
                                                )}
                                            </div>

                                            {/* Description Input */}
                                            <div className="w-full sm:col-span-2">
                                                <Label htmlFor={`deposit_description_${actualIndex}`} className="sr-only">
                                                    Description {actualIndex + 1}
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
                                            className="text-destructive hover:bg-destructive/10 mt-2 h-9 w-9 flex-shrink-0 self-start sm:mt-0"
                                            onClick={() => handleRemoveDeposit(actualIndex)}
                                            aria-label={`Remove deposit ${actualIndex + 1}`}
                                            disabled={processing}
                                        >
                                            <Trash2 className="h-4 w-4" />
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
                            <p className="mt-2 text-sm text-red-500">{formErrors.activeDeposits}</p>
                        )}
                    </div>
                    {/* --- End of Additional Deposits Section --- */}
                </FormSection>

                {/* Additional Notes Section */}
                <FormSection title="Additional Notes" description="Update any relevant notes about this specific rental pickup.">
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
                            disabled={processing}
                        />
                    </FormField>
                </FormSection>

                {/* Form Actions Section (Footer) */}
                <SheetFooter>
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={processing}>
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const today = formatDateForInput(new Date());
                                // Reset form data, ensuring activeDeposits goes back to one empty item
                                setData({
                                    ...initialFormValues, // Reset to base structure (includes one empty deposit)
                                    rental_id: selectedRow?.id ?? '',
                                    customer_name: selectedRow?.customer?.name || selectedRow?.full_name || '',
                                    vehicle_no: selectedRow?.vehicle?.vehicle_no || selectedRow?.vehicle_no || '',
                                    start_date: today,
                                    notes: selectedRow?.notes || '',
                                });
                                setExpiryDateDialogsOpen({});
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing || !data.rental_id} className="w-full sm:w-auto">
                            {processing ? 'Processing...' : 'Save Changed'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
