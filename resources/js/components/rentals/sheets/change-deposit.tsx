import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet'; // SheetClose and SheetFooter might not be used directly here if this is not inside a Sheet.
import { cn } from '@/lib/utils';
// Assuming types are correctly defined and RentalsType includes vehicle status info
import { Deposits, RentalsType, User } from '@/types'; // Make sure RentalsType has vehicle.status.status_name or similar
import { useForm } from '@inertiajs/react';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import React, { FormEventHandler, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) {
        return 'N/A';
    }
    try {
        const date = new Date(dateString);
        // Options for toLocaleDateString to get "DD Month YYYY" format
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short', // 'short' for 'May', 'long' for 'May'
            year: 'numeric',
        };
        return date.toLocaleDateString('en-GB', options); // 'en-GB' for day-month-year order
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

// --- Type Definitions ---
interface EnhancedDeposit extends Omit<Deposits, 'id' | 'deposit_type_id'> {
    // Assuming deposit_type_id is replaced by deposit_type string
    id?: string | number | null; // Allow null for new deposits
    deposit_type: string; // Name of the deposit type
    deposit_value: string; // Value of the deposit
    is_primary?: boolean;
    registered_number?: string | null;
    expiry_date?: string | null; // Stays as string 'YYYY-MM-DD' or null/empty
    description?: string | null;
}

// --- Form state structure ---
type ChangeDepositFormValues = {
    activeDeposits: EnhancedDeposit[];
    rental_id: number | string;
    customer_name: string; // Readonly original customer
    vehicle_no: string;
    user_name: string; // Incharge user
    notes: string;
};

// --- FormErrors type ---
type FormErrors = Partial<
    Record<
        | keyof Omit<ChangeDepositFormValues, 'activeDeposits'> // Exclude activeDeposits itself, but include its nested fields
        | `activeDeposits.${number}.${keyof EnhancedDeposit}`
        | 'activeDeposits', // For a general error on the array
        string
    >
>;

// --- Main ChangeDeposit Component ---
interface ChangeDepositProps {
    depositTypes: Pick<Deposits, 'id' | 'name'>[] | null; // Use Pick for specific properties
    selectedRow: RentalsType | null; // Assuming RentalsType has activeDeposits, customer_name, vehicle_no, notes, id
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function ChangeDeposit({ selectedRow, depositTypes, users, onSubmitSuccess }: ChangeDepositProps) {
    // State for Dialogs
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [expiryDateDialogsOpen, setExpiryDateDialogsOpen] = useState<Record<number, boolean>>({});

    const depositTypeOptions = useMemo(() => depositTypes || [], [depositTypes]);

    // Create a map for quick lookup of contact type name by ID
    const depositTypeMap = useMemo(() => {
        const map = new Map<number, string>();
        depositTypes?.forEach((type) => {
            if (type.id && type.name) {
                map.set(type.id, type.name);
            }
        });
        return map;
    }, [depositTypes]);

    // --- Initialize Inertia Form ---
    const initialFormValues: ChangeDepositFormValues = useMemo(() => {
        let deposits: EnhancedDeposit[] = [];
        deposits = [
            {
                id: `new_${Date.now()}`,
                deposit_type: '', // Default to first type or empty
                deposit_value: '',
                registered_number: '',
                expiry_date: '',
                description: '',
                is_primary: true,
            },
        ];

        return {
            rental_id: selectedRow?.id ?? '',
            customer_name: selectedRow?.customer?.name || selectedRow?.full_name || '',
            vehicle_no: selectedRow?.vehicle_no || '',
            user_name: '',
            notes: selectedRow?.notes || '',
            activeDeposits: deposits,
        };
    }, [selectedRow, depositTypeMap, depositTypeOptions]);

    const { data, setData, put, processing, errors, reset, clearErrors, setError } = useForm<ChangeDepositFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Correctly type 'key' to be one of the specific string literals, not including 'activeDeposits'
        const key = name as keyof Omit<ChangeDepositFormValues, 'activeDeposits'>;
        setData(key, value);

        if (formErrors[key]) clearErrors(key);
    };

    const handleComboboxChange = (
        name: 'user_name' | 'new_vehicle_no' | 'original_vehicle_status_name' | 'new_vehicle_status_name',
        value: string,
    ) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    const handleActiveDepositChange = (index: number, field: keyof EnhancedDeposit, value: string | boolean) => {
        const updatedDeposits = data.activeDeposits.map((deposit, i) => {
            if (i === index) {
                return { ...deposit, [field]: value };
            }
            return deposit;
        });
        setData('activeDeposits', updatedDeposits);
        const errorKey = `activeDeposits.${index}.${field}` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
        if (formErrors.activeDeposits) {
            // Clear general array error if specific field is changed
            clearErrors('activeDeposits');
        }
    };

    const handleExpiryDateSelect = (index: number, date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        handleActiveDepositChange(index, 'expiry_date', formattedDate);
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: false }));
        const errorKey = `activeDeposits.${index}.expiry_date` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
    };

    const handleExpiryDateDialogOpenChange = (index: number, open: boolean) => {
        setExpiryDateDialogsOpen((prev) => ({ ...prev, [index]: open }));
    };

    const handleAddDeposit = () => {
        const newDeposit: EnhancedDeposit = {
            id: `new_${Date.now()}`, // Temporary unique ID for React key
            deposit_type: depositTypeOptions.length > 0 ? depositTypeOptions[0].name : '',
            deposit_value: '',
            registered_number: '',
            expiry_date: '',
            description: '',
            is_primary: false, // New contacts are not primary by default
        };
        setData('activeDeposits', [...data.activeDeposits, newDeposit]);
    };

    const handleRemoveDeposit = (indexToRemove: number) => {
        // Prevent removing the primary deposit if it's the only one or explicitly marked
        if (data.activeDeposits[indexToRemove]?.is_primary && data.activeDeposits.length === 1) {
            toast.error('Cannot remove the only primary deposit. Add another deposit first or change its type.');
            return;
        }
        if (data.activeDeposits[indexToRemove]?.is_primary) {
            toast.error('Cannot remove the primary deposit. Please set another deposit as primary first.');
            return;
        }

        const updatedDeposits = data.activeDeposits.filter((_, index) => index !== indexToRemove);
        setData('activeDeposits', updatedDeposits);
        setExpiryDateDialogsOpen((prev) => {
            const newState = { ...prev };
            delete newState[indexToRemove];
            return newState;
        });
        clearErrors(); // Consider more targeted error clearing
    };

    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && !!u.id && typeof u.name === 'string' && u.name !== '') : []),
        [users],
    );

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        if (!data.rental_id) {
            toast.error('Cannot submit: Rental ID is missing.');
            console.error('Submit blocked: rental_id is missing from form data.', data);
            return;
        }

        // Validate activeDeposits
        let depositsHaveErrors = false;
        data.activeDeposits.forEach((deposit, index) => {
            if (!deposit.deposit_type) {
                setError(`activeDeposits.${index}.deposit_type`, 'Type is required.');
                depositsHaveErrors = true;
            }
            if (!deposit.deposit_value) {
                setError(`activeDeposits.${index}.deposit_value`, 'Value is required.');
                depositsHaveErrors = true;
            }
            // Add other deposit-specific validations if needed (e.g., expiry_date format if not using picker)
        });

        // The URL seems to be for 'change-vehicle-contract'. If this form is purely for deposits,
        // the URL and some validation fields (original_vehicle_status_name, new_vehicle_no, etc.) might need adjustment.
        // Assuming they are intended to be part of this form based on original handleSubmit logic.
        const url = `/rentals/${data.rental_id}/update/change-deposit-contract`; // Or a more deposit-specific endpoint

        let hasValidationError = false;
        const validationErrors: Partial<Record<keyof ChangeDepositFormValues, string>> = {};

        if (!data.user_name) {
            validationErrors.user_name = 'Incharge user is required.';
            hasValidationError = true;
        }

        if (hasValidationError || depositsHaveErrors) {
            if (Object.keys(validationErrors).length > 0) setError(validationErrors); // Set general form errors
            toast.error('Please correct the errors in the form.');
            return;
        }

        const payload = {
            ...data,
            activeDeposits: data.activeDeposits.map((deposit) => ({
                ...deposit,
                // Ensure deposit_type_id is sent if your backend expects it
                // This requires mapping the name back to an ID
                deposit_type_id: depositTypes?.find((dt) => dt.name === deposit.deposit_type)?.id || null,
            })),
        };

        put(url, {
            data: payload, // Send the modified payload
            preserveScroll: true,
            onSuccess: () => {
                if (selectedRow) {
                    // More robust reset preserving initial read-only and structure
                    const newInitialValues = initialFormValues; // Recalculate based on selectedRow
                    setData({
                        ...newInitialValues,
                        user_name: '', // Clear user selection specifically
                        notes: selectedRow.notes || '', // Keep notes or reset as per newInitialValues
                    });
                } else {
                    reset();
                }
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);

                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        let userFriendlyFieldName = field;
                        if (field.startsWith('activeDeposits.')) {
                            const parts = field.split('.');
                            const index = parseInt(parts[1], 10);
                            const subField = parts[2];
                            userFriendlyFieldName = `Deposit ${index + 1} ${subField.replace(/_/g, ' ')}`;
                        } else {
                            userFriendlyFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                        }

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error('Failed to update deposit information. An unknown error occurred.');
                }
            },
        });
    };

    if (!selectedRow && !processing) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">No rental selected for deposit change.</div>;
    }
    // This condition might be too aggressive if form init is quick
    // if (processing && data.rental_id !== selectedRow?.id) {
    //     return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Loading rental data...</div>;
    // }
    if (!data.rental_id && selectedRow) {
        // Indicates form is still initializing from selectedRow
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Initializing form...</div>;
    }

    const primaryDeposit = useMemo(
        () =>
            data.activeDeposits.find((d) => d.is_primary) ||
            data.activeDeposits[0] || {
                id: 'temp_primary',
                deposit_type: '',
                deposit_value: '',
                is_primary: true,
                registered_number: '',
                expiry_date: '',
                description: '',
            },
        [data.activeDeposits],
    );

    return (
        <div className="px-1 py-1 md:px-4">
            {' '}
            {/* Reduced padding for smaller screens */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="Customer & Rental Details" description="Basic information about the rental agreement.">
                    <FormField label="Customer" htmlFor="customer_name">
                        <Input id="customer_name" name="customer_name" value={data.customer_name} readOnly disabled className="bg-muted/50" />
                    </FormField>
                    <FormField label="Vehicle No" htmlFor="vehicle_no">
                        <Input id="vehicle_no" name="vehicle_no" value={data.vehicle_no} readOnly disabled className="bg-muted/50" />
                    </FormField>
                    <div className="pt-2">
                        <h4 className="mb-3 text-base font-semibold">All Active Identifications</h4>
                        {selectedRow?.activeDeposits && Array.isArray(selectedRow.activeDeposits) && selectedRow.activeDeposits.length > 0 ? (
                            <div className="space-y-3">
                                {selectedRow.activeDeposits.map((deposit) => (
                                    <div
                                        key={deposit.id}
                                        className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border p-3 transition-colors"
                                    >
                                        {/* Deposit Type */}
                                        <div className="min-w-[100px] flex-1">
                                            <Label className="text-muted-foreground text-xs">Type</Label>
                                            <p className="font-medium">{deposit.type_name || 'N/A'}</p>
                                        </div>
                                        {/* Deposit Value */}
                                        <div className="min-w-[100px] flex-1">
                                            <Label className="text-muted-foreground text-xs">Value</Label>
                                            <p className="font-medium">{deposit.deposit_value || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No active identifications found.</p>
                        )}
                    </div>
                </FormSection>

                <FormSection title="Deposit Information" description="Manage customer's deposit details. Designate one deposit as primary.">
                    {data.activeDeposits.map((deposit, index) => {
                        const isPrimary = deposit.is_primary;
                        const typeError = formErrors[`activeDeposits.${index}.deposit_type`];
                        const valueError = formErrors[`activeDeposits.${index}.deposit_value`];
                        const expiryError = formErrors[`activeDeposits.${index}.expiry_date`];
                        const regNumError = formErrors[`activeDeposits.${index}.registered_number`];
                        const descError = formErrors[`activeDeposits.${index}.description`];

                        return (
                            <div key={deposit.id || `deposit_${index}`}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-base font-semibold">
                                        {isPrimary
                                            ? 'Primary Deposit'
                                            : `Additional Deposit ${index - data.activeDeposits.findIndex((d) => d.is_primary === false) + 1}`}
                                    </h4>
                                    {!isPrimary && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveDeposit(index)}
                                            className="text-red-500 hover:text-red-700"
                                            aria-label="Remove this deposit"
                                        >
                                            <Trash2 className="mr-1 h-4 w-4" /> Remove
                                        </Button>
                                    )}
                                </div>
                                {!isPrimary && (
                                    <FormField label="Set as Primary" htmlFor={`is_primary_${index}`} className="mb-3">
                                        <input
                                            type="checkbox"
                                            id={`is_primary_${index}`}
                                            checked={deposit.is_primary}
                                            onChange={(e) => {
                                                const updatedDeposits = data.activeDeposits.map((d, i) => ({
                                                    ...d,
                                                    is_primary: i === index, // Set current to primary, others to false
                                                }));
                                                setData('activeDeposits', updatedDeposits);
                                            }}
                                            className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                                        />
                                    </FormField>
                                )}

                                <div className="space-y-4">
                                    <FormField label="Type" htmlFor={`deposit_type_${index}`} error={typeError} required>
                                        <Select
                                            value={deposit.deposit_type}
                                            onValueChange={(value) => handleActiveDepositChange(index, 'deposit_type', value)}
                                            required
                                        >
                                            <SelectTrigger id={`deposit_type_${index}`} className={cn(typeError && 'border-red-500')}>
                                                <SelectValue placeholder="Select type" />
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
                                    </FormField>
                                    <FormField label="Amount/Value" htmlFor={`deposit_value_${index}`} error={valueError} required>
                                        <Input
                                            id={`deposit_value_${index}`}
                                            value={deposit.deposit_value}
                                            onChange={(e) => handleActiveDepositChange(index, 'deposit_value', e.target.value)}
                                            className={cn(valueError && 'border-red-500')}
                                            placeholder="e.g., 500 or Item Name"
                                            type="text"
                                            required
                                        />
                                    </FormField>
                                    <FormField label="Registered Number" htmlFor={`deposit_registered_number_${index}`} error={regNumError}>
                                        <Input
                                            id={`deposit_registered_number_${index}`}
                                            value={deposit.registered_number || ''}
                                            onChange={(e) => handleActiveDepositChange(index, 'registered_number', e.target.value)}
                                            placeholder="e.g., Cheque No, ID Card No (Optional)"
                                            className={cn(regNumError && 'border-red-500')}
                                        />
                                    </FormField>
                                    <FormField label="Expiry Date" htmlFor={`expiry_date_${index}`} error={expiryError}>
                                        <Dialog
                                            open={expiryDateDialogsOpen[index] || false}
                                            onOpenChange={(open) => handleExpiryDateDialogOpenChange(index, open)}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant={'outline'}
                                                    id={`expiry_date_trigger_${index}`}
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !deposit.expiry_date && 'text-muted-foreground',
                                                        expiryError && 'border-red-500',
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {deposit.expiry_date ? (
                                                        // Attempt to parse the date
                                                        (() => {
                                                            const parsed = parseDateString(deposit.expiry_date);
                                                            // Check if parsing was successful before formatting
                                                            if (parsed) {
                                                                return format(parsed, 'PPP');
                                                            } else {
                                                                // This case handles strings that parseDateString couldn't handle,
                                                                // even if they exist. You might want a different message or simply an empty span.
                                                                return <span className="text-red-500">Invalid Date</span>;
                                                            }
                                                        })()
                                                    ) : (
                                                        <span>Pick expiry date (Optional)</span>
                                                    )}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="w-auto p-6">
                                                {' '}
                                                {/* Adjusted padding for calendar */}
                                                <Calendar
                                                    mode="single"
                                                    selected={parseDateString(deposit.expiry_date)}
                                                    onSelect={(date) => handleExpiryDateSelect(index, date)}
                                                    initialFocus
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </FormField>
                                    <FormField label="Description" htmlFor={`deposit_description_${index}`} error={descError}>
                                        <Input
                                            id={`deposit_description_${index}`}
                                            value={deposit.description || ''}
                                            onChange={(e) => handleActiveDepositChange(index, 'description', e.target.value)}
                                            placeholder="Additional details (Optional)"
                                            className={cn(descError && 'border-red-500')}
                                        />
                                    </FormField>
                                </div>
                                {index === data.activeDeposits.length - 1 && ( // Show add button only after the last deposit entry
                                    <div className="mt-4 flex justify-end">
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddDeposit}>
                                            Add Another Deposit
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {formErrors.activeDeposits && <p className="mt-2 text-sm text-red-500">{formErrors.activeDeposits}</p>}
                </FormSection>

                {/* Incharge & Notes Section */}
                <FormSection title="Processing Information" description="Record who processed this change and any relevant notes.">
                    {/* Incharge User Field */}
                    <FormField label="Incharge By" htmlFor="user_name" error={formErrors.user_name} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground',
                                        formErrors.user_name && 'border-red-500',
                                    )}
                                    disabled={processing || validUsers.length === 0}
                                    id="user_name_trigger"
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
                                                        handleComboboxChange('user_name', currentValue === data.user_name ? '' : currentValue);
                                                        setUserDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn('mr-2 h-4 w-4', data.user_name === user.name ? 'opacity-100' : 'opacity-0')}
                                                    />
                                                    {user.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Notes Field */}
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2 md:pt-0" className="md:items-start">
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
                            placeholder="Enter any additional notes here..."
                        />
                    </FormField>
                </FormSection>

                {/* Form Actions */}
                <SheetFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {/*
                        SheetClose might be intended if this form is part of a Sheet component.
                        If not, a regular button for cancel/close might be more appropriate.
                        Assuming it's in a Sheet context based on the import.
                    */}
                    <SheetClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                /* TODO: Handle close/cancel, maybe reset form or call a prop */
                            }}
                        >
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                        {processing ? 'Saving...' : 'Save Changes'}
                    </Button>
                </SheetFooter>
            </form>
        </div>
    );
}

export default ChangeDeposit;
