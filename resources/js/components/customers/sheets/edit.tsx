import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Contacts, Customers } from '@/types'; // Assuming Customers and Contacts types are defined
import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import countries from 'world-countries';

// --- Type Definitions ---
interface EnhancedContact extends Omit<Contacts, 'id'> {
    id?: number | null;
    is_primary?: boolean;
}
interface CustomerWithContacts extends Customers {
    activeContacts?: EnhancedContact[];
}
type InitialFormValues = Omit<CustomerWithContacts, 'id' | 'created_at' | 'updated_at' | 'primary_contact_type' | 'primary_contact'> & {
    activeContacts: EnhancedContact[];
};
type FormErrors = Partial<
    Record<
        | keyof Omit<InitialFormValues, 'activeContacts' | 'date_of_birth'>
        | 'dob_month'
        | 'dob_day'
        | 'dob_year'
        | 'date_of_birth'
        | `activeContacts.${number}.${keyof EnhancedContact}`
        | 'activeContacts',
        string
    >
>;

// --- Helper Function ---
const getDaysInMonth = (month: number | null, year: string | number): number => {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    if (!month || isNaN(month) || month < 1 || month > 12) return 31;
    if (isNaN(yearNum) || yearNum < 1000 || yearNum > 3000) return 31;
    return new Date(yearNum, month, 0).getDate();
};

// --- Static Options ---
const nationalityOptions = countries
    .map((country) => ({
        value: country.name.common,
        label: country.name.common,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

const contactTypeOptions = [
    { value: 'Email', label: 'Email' },
    { value: 'Phone', label: 'Phone' },
    { value: 'Mobile', label: 'Mobile' },
    { value: 'Work Phone', label: 'Work Phone' },
    { value: 'Home Phone', label: 'Home Phone' },
    { value: 'Fax', label: 'Fax' },
    { value: 'Other', label: 'Other' },
];

const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Others', label: 'Others' },
];

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

// --- Reusable Components ---
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

// --- Main Edit Component ---
interface EditProps {
    selectedCustomer: CustomerWithContacts | null;
    onSubmitSuccess: () => void;
}

export function Edit({ selectedCustomer, onSubmitSuccess }: EditProps) {
    // --- State ---
    const [dobMonth, setDobMonth] = useState<number | null>(null);
    const [dobDay, setDobDay] = useState<string>('');
    const [dobYear, setDobYear] = useState<string>('');
    const [daysInMonth, setDaysInMonth] = useState<number>(31);
    const [nationalityPopoverOpen, setNationalityPopoverOpen] = useState(false);

    // --- Initialize Inertia Form ---
    const initialFormValues: InitialFormValues = useMemo(() => {
        let contacts: EnhancedContact[] = [];
        if (selectedCustomer && Array.isArray(selectedCustomer.activeContacts) && selectedCustomer.activeContacts.length > 0) {
            contacts = selectedCustomer.activeContacts.map((c, index) => ({
                ...c,
                id: c.id || null,
                is_primary: c.is_primary ?? index === 0, // Default first to primary if not specified
            }));
            // Ensure at least one contact is primary
            if (!contacts.some((c) => c.is_primary)) {
                if (contacts.length > 0) contacts[0].is_primary = true;
            }
        } else {
            // Start with one empty primary contact if none exist
            contacts = [{ id: null, contact_type: '', contact_value: '', description: '', is_primary: true }];
        }

        return {
            first_name: selectedCustomer?.first_name ?? '',
            last_name: selectedCustomer?.last_name ?? '',
            date_of_birth: selectedCustomer?.date_of_birth ?? undefined, // Keep undefined if null/missing
            gender: selectedCustomer?.gender ?? '',
            nationality: selectedCustomer?.nationality ?? '',
            address_line_1: selectedCustomer?.address_line_1 ?? '',
            address_line_2: selectedCustomer?.address_line_2 ?? '',
            commune: selectedCustomer?.commune ?? '',
            district: selectedCustomer?.district ?? '',
            city: selectedCustomer?.city ?? '',
            notes: selectedCustomer?.notes ?? '',
            activeContacts: contacts,
        };
    }, [selectedCustomer]);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    // --- Effect to Reset Form and Populate DoB Fields on Customer Change ---
    useEffect(() => {
        if (selectedCustomer) {
            console.log('Selected customer changed:', selectedCustomer);
            // Reset Inertia form state FIRST
            reset();

            // FIX: Use setTimeout to ensure reset() completes before setting local DoB state
            const timerId = setTimeout(() => {
                let initialMonth: number | null = null;
                let initialDay = '';
                let initialYear = '';

                if (selectedCustomer.date_of_birth && typeof selectedCustomer.date_of_birth === 'string') {
                    const parts = selectedCustomer.date_of_birth.split('-'); // Expect YYYY-MM-DD
                    if (parts.length === 3) {
                        const yearNum = parseInt(parts[0], 10);
                        const monthNum = parseInt(parts[1], 10); // Parses "01" as 1
                        const dayNum = parseInt(parts[2], 10);

                        if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
                            initialYear = parts[0];
                            initialMonth = monthNum; // Correctly gets 1 for January
                            initialDay = parts[2]; // Keep as string '02'
                        }
                    }
                }
                console.log(`Parsed DoB (inside timeout): Y=${initialYear}, M=${initialMonth}, D=${initialDay}`);
                // Set local state *after* reset has likely finished processing
                setDobYear(initialYear);
                setDobMonth(initialMonth); // Should now correctly update state reflected in Select
                setDobDay(initialDay);

                // Clear errors after potentially resetting/setting state
                clearErrors();
            }, 0); // Timeout of 0 pushes execution after current event loop tasks

            // Cleanup timeout if component unmounts or customer changes again before timeout runs
            return () => clearTimeout(timerId);
        } else {
            // Reset local state if no customer is selected
            setDobYear('');
            setDobMonth(null);
            setDobDay('');
            // Optionally reset the form if needed when deselected
            // reset();
            clearErrors();
        }
        // Dependencies: selectedCustomer triggers the effect.
        // `reset` and `clearErrors` are functions from the hook, typically stable,
        // but including `reset` is safer if its identity could change.
    }, [selectedCustomer, reset, clearErrors]);

    // --- Effect to calculate max days in month ---
    useEffect(() => {
        const numDays = getDaysInMonth(dobMonth, dobYear);
        setDaysInMonth(numDays);
        const dayNum = parseInt(dobDay, 10);
        // If current day is invalid for the new month/year, clear it
        if (!isNaN(dayNum) && dayNum > numDays) {
            setDobDay('');
            // Optionally clear the combined date_of_birth error if day was the issue
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    }, [dobMonth, dobYear, dobDay, clearErrors, formErrors.date_of_birth]); // Added clearErrors dependencies

    // --- Effect to update Inertia form data 'date_of_birth' ---
    useEffect(() => {
        const month = dobMonth;
        const day = parseInt(dobDay, 10);
        const year = parseInt(dobYear, 10);

        let formattedDate: string | undefined = undefined;
        // Validate all parts are present and reasonable before formatting
        if (month && !isNaN(day) && day >= 1 && day <= daysInMonth && !isNaN(year) && year >= 1000 && year <= 3000) {
            // Format as YYYY-MM-DD
            formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        // Only update Inertia data if the formatted date changes
        if (formattedDate !== data.date_of_birth) {
            setData('date_of_birth', formattedDate);
            // Clear combined date error if a valid date is now formed
            if (formattedDate && formErrors.date_of_birth) {
                clearErrors('date_of_birth');
            }
        }
        // Also handle the case where the date becomes invalid/incomplete
        else if (!formattedDate && data.date_of_birth !== undefined) {
            setData('date_of_birth', undefined);
        }
        // Dependencies ensure this runs when any DoB part changes or the calculated daysInMonth changes
    }, [dobMonth, dobDay, dobYear, daysInMonth, setData, data.date_of_birth, clearErrors, formErrors.date_of_birth]); // Added clearErrors dependencies

    // --- Generic Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Type assertion for safety
        const key = name as keyof Omit<InitialFormValues, 'activeContacts' | 'date_of_birth'>;
        setData(key, value);
        if (formErrors[key]) clearErrors(key);
    };

    const handleSelectChange = (name: keyof Omit<InitialFormValues, 'activeContacts' | 'date_of_birth'>, value: string) => {
        setData(name, value);
        if (formErrors[name]) clearErrors(name);
    };

    // --- Specific Handlers ---
    const handleNationalitySelect = (currentValue: string) => {
        // Find the actual value from options based on case-insensitive comparison
        const finalValue = nationalityOptions.find((opt) => opt.value.toLowerCase() === currentValue.toLowerCase())?.value || '';
        if (finalValue !== data.nationality) {
            setData('nationality', finalValue);
            if (formErrors.nationality) clearErrors('nationality');
        }
        setNationalityPopoverOpen(false); // Close popover on selection
    };

    // --- Date of Birth Input Handlers ---
    const handleDobMonthChange = (value: string) => {
        const monthNum = value ? parseInt(value, 10) : null;
        setDobMonth(monthNum);
        // Clear combined error when month changes
        if (formErrors.date_of_birth) clearErrors('date_of_birth');
    };
    const handleDobDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dayValue = e.target.value;
        // Allow empty input or numbers within the valid range for the current month/year
        if (dayValue === '' || (/^\d+$/.test(dayValue) && parseInt(dayValue, 10) <= daysInMonth)) {
            setDobDay(dayValue);
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        } else if (parseInt(dayValue, 10) > daysInMonth) {
            // If user types a number too large, maybe just set it to max days? Or keep current behavior.
            // For now, let's prevent setting it if it immediately exceeds max days.
            // Alternatively, allow typing but validate on blur. Let's stick to blur validation for now.
            setDobDay(dayValue); // Allow typing, validate on blur
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    };
    const handleDobDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const dayValue = e.target.value;
        if (dayValue === '') {
            setDobDay(''); // Allow empty
            return;
        }
        const dayNum = parseInt(dayValue, 10);
        // Validate day is a number between 1 and daysInMonth
        if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) {
            setDobDay(''); // Clear if invalid
            // Optionally show a specific error here if needed
        } else {
            // Format to two digits on blur if valid? Optional.
            // setDobDay(String(dayNum).padStart(2, '0'));
        }
    };
    const handleDobYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const yearValue = e.target.value;
        // Allow empty or up to 4 digits
        if (yearValue === '' || /^\d{0,4}$/.test(yearValue)) {
            setDobYear(yearValue);
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    };
    const handleDobYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const yearValue = e.target.value;
        if (yearValue === '') {
            setDobYear(''); // Allow empty
            return;
        }
        const yearNum = parseInt(yearValue, 10);
        // Basic year range validation
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
            // Allow current year + 1 maybe? Adjust range as needed
            setDobYear(''); // Clear if invalid
        }
    };

    // --- Contact Handlers ---
    const handleActiveContactChange = (index: number, field: keyof EnhancedContact, value: string | boolean) => {
        // Create a new array with the updated contact
        const updatedContacts = data.activeContacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact));
        setData('activeContacts', updatedContacts);

        // Clear specific field error and general array error
        const errorKey = `activeContacts.${index}.${field}` as keyof FormErrors;
        if (formErrors[errorKey]) clearErrors(errorKey);
        if (formErrors.activeContacts) clearErrors('activeContacts');
    };

    const handleAddContact = () => {
        // Add a new, empty contact object with id: null
        const newContact: EnhancedContact = {
            id: null, // Important for backend to know it's new
            contact_type: '',
            contact_value: '',
            description: '',
            is_primary: false, // New contacts are never primary by default
        };
        setData('activeContacts', [...data.activeContacts, newContact]);
    };

    const handleRemoveContact = (indexToRemove: number) => {
        const contactToRemove = data.activeContacts[indexToRemove];
        // Should not be able to remove the primary contact
        if (contactToRemove?.is_primary) {
            toast.error('Cannot remove the primary contact. Assign another contact as primary first.');
            return;
        }
        // Filter out the contact at the specified index
        setData(
            'activeContacts',
            data.activeContacts.filter((_, index) => index !== indexToRemove),
        );
        // Clear all potential errors related to contacts after removal
        // This is broad but safer than trying to recalculate specific error keys
        clearErrors();
    };

    // Handler to set a contact as primary
    const handleSetPrimaryContact = (indexToSet: number) => {
        setData(
            'activeContacts',
            data.activeContacts.map((contact, index) => ({
                ...contact,
                is_primary: index === indexToSet,
            })),
        );
        // Clear potential primary contact errors when changing primary
        clearErrors();
    };

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedCustomer.id) {
            toast.error('No customer selected or customer ID missing.');
            return;
        }
        clearErrors(); // Clear previous errors before new submission attempt

        const url = `/customers/${selectedCustomer.id}/update`;

        // --- Frontend Validation ---
        let isValid = true;
        const newErrors: FormErrors = {};

        // 1. Check required fields
        if (!data.first_name) {
            newErrors.first_name = 'First name is required.';
            isValid = false;
        }
        if (!data.last_name) {
            newErrors.last_name = 'Last name is required.';
            isValid = false;
        }

        // 2. Check Date of Birth (if all fields are filled but date is invalid)
        const month = dobMonth;
        const day = parseInt(dobDay, 10);
        const year = parseInt(dobYear, 10);
        const isDobFilled = month || dobDay || dobYear; // Check if any DoB field is touched
        const isDobValid = month && !isNaN(day) && day >= 1 && day <= daysInMonth && !isNaN(year) && year >= 1000 && year <= 3000;

        if (isDobFilled && !isDobValid) {
            newErrors.date_of_birth = 'Please enter a complete and valid date of birth.';
            isValid = false;
        } else if (isDobFilled && isDobValid && data.date_of_birth === undefined) {
            // This case should ideally not happen if the effect works, but as a fallback
            newErrors.date_of_birth = 'Date of birth calculation failed. Please check values.';
            isValid = false;
        }

        // 3. Check Contacts
        const primaryIndex = data.activeContacts.findIndex((c) => c.is_primary);
        if (primaryIndex === -1) {
            newErrors.activeContacts = 'A primary contact must be designated.'; // General array error
            isValid = false;
        } else {
            const primaryContact = data.activeContacts[primaryIndex];
            if (!primaryContact.contact_type) {
                newErrors[`activeContacts.${primaryIndex}.contact_type`] = 'Primary contact type is required.';
                isValid = false;
            }
            if (!primaryContact.contact_value) {
                newErrors[`activeContacts.${primaryIndex}.contact_value`] = 'Primary contact value is required.';
                isValid = false;
            }
            // Basic email validation (example)
            if (primaryContact.contact_type === 'Email' && !/\S+@\S+\.\S+/.test(primaryContact.contact_value)) {
                newErrors[`activeContacts.${primaryIndex}.contact_value`] = 'Please enter a valid email address.';
                isValid = false;
            }
            // Basic phone validation (example - allows +, numbers, spaces, hyphens)
            if (
                ['Phone', 'Mobile', 'Work Phone', 'Home Phone'].includes(primaryContact.contact_type) &&
                !/^[+\d\s-]+$/.test(primaryContact.contact_value)
            ) {
                newErrors[`activeContacts.${primaryIndex}.contact_value`] = 'Please enter a valid phone number.';
                isValid = false;
            }
        }

        // Check non-primary contacts for completeness (optional, depends on requirements)
        data.activeContacts.forEach((contact, index) => {
            if (!contact.is_primary) {
                if (contact.contact_type && !contact.contact_value) {
                    newErrors[`activeContacts.${index}.contact_value`] = 'Contact value is required if type is selected.';
                    isValid = false;
                } else if (!contact.contact_type && contact.contact_value) {
                    newErrors[`activeContacts.${index}.contact_type`] = 'Contact type is required if value is entered.';
                    isValid = false;
                }
                // Add more specific validation if needed (e.g., email/phone format for additional contacts)
            }
        });

        if (!isValid) {
            setData('errors', newErrors); // Use Inertia's way to set frontend errors
            toast.error('Please fix the errors in the form.');
            console.log('Frontend Validation Errors:', newErrors);
            return; // Stop submission
        }
        // --- End Frontend Validation ---

        // If frontend validation passes, proceed with PUT request
        put(url, {
            preserveScroll: true,
            onSuccess: () => {
                onSubmitSuccess(); // Call callback (e.g., close modal/sheet)
            },
            onError: (receivedErrors) => {
                // Cast received errors for better type checking
                const currentErrors = receivedErrors as FormErrors;
                console.error('Backend Submission Errors:', currentErrors);
                // Display backend errors using toast
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    toast.error('Failed to update customer. Please check the errors below.');
                    // Optionally loop through backend errors and show specific toasts, though setData('errors', ...) handles displaying them inline
                    /*
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        // You might want to format the field name here
                        if (errorMessage) toast.error(`${field}: ${errorMessage}`);
                    });
                    */
                } else {
                    // Generic error if backend provides no specific error messages
                    toast.error('Failed to update customer. An unknown error occurred.');
                }
                // No need to call setData('errors', currentErrors) here,
                // Inertia's useForm hook does this automatically on onError.
            },
            onFinish: () => {
                // This runs regardless of success or error
                console.log('Submission finished.');
            },
        });
    };

    // --- Get Primary Contact Info (Memoized for performance) ---
    const primaryContactInfo = useMemo(() => {
        const index = data.activeContacts.findIndex((c) => c.is_primary);
        if (index === -1) {
            // Fallback if no primary contact somehow (should be prevented by init logic)
            console.warn('No primary contact found in activeContacts array.');
            return { index: -1, contact: null, typeError: undefined, valueError: undefined, descError: undefined };
        }
        const contact = data.activeContacts[index];
        return {
            index: index,
            contact: contact,
            typeError: formErrors[`activeContacts.${index}.contact_type`],
            valueError: formErrors[`activeContacts.${index}.contact_value`],
            descError: formErrors[`activeContacts.${index}.description`],
        };
    }, [data.activeContacts, formErrors]);

    // --- Render Logic ---
    if (!selectedCustomer) {
        // Display a loading or placeholder state if no customer is selected yet
        return <div className="p-6 text-center text-gray-500">Loading customer data or select a customer...</div>;
    }

    // Ensure primaryContact is available before rendering dependent sections
    if (!primaryContactInfo.contact) {
        // This case should ideally be prevented by the initialization logic and validation
        console.error('Critical Error: Primary contact data is missing or invalid.');
        return <div className="p-6 text-center text-red-500">Error: Primary contact data is missing. Cannot render form.</div>;
    }

    return (
        // Using overflow-y-auto on the container if the form might exceed sheet height
        <div className="h-full px-1 py-2 sm:px-4">
            <form onSubmit={handleSubmit} className="flex h-full flex-col space-y-4">
                {/* Scrollable Content Area */}
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    {' '}
                    {/* Added pr-2 for scrollbar spacing */}
                    {/* --- Basic Information --- */}
                    <FormSection title="Edit Customer" description="Update the basic information for the customer.">
                        <FormField label="First Name" htmlFor="first_name" error={formErrors.first_name} required>
                            <Input
                                id="first_name"
                                name="first_name"
                                value={data.first_name}
                                onChange={handleInputChange}
                                autoFocus
                                autoComplete="off"
                                className={cn(formErrors.first_name && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="Last Name" htmlFor="last_name" error={formErrors.last_name} required>
                            <Input
                                id="last_name"
                                name="last_name"
                                value={data.last_name}
                                onChange={handleInputChange}
                                autoComplete="off"
                                className={cn(formErrors.last_name && 'border-red-500')}
                            />
                        </FormField>
                        {/* Date of Birth Field */}
                        <FormField label="Date of Birth" htmlFor="dob_month" error={formErrors.date_of_birth}>
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
                                <div className="flex-1">
                                    <Label htmlFor="dob_month" className="sr-only">
                                        Month
                                    </Label>
                                    {/* Ensure value is string or undefined for Select */}
                                    <Select value={dobMonth ? String(dobMonth) : ''} onValueChange={handleDobMonthChange}>
                                        <SelectTrigger id="dob_month" className={cn(formErrors.date_of_birth && 'border-red-500')} aria-label="Month">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map((option) => (
                                                <SelectItem key={option.value} value={String(option.value)}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="dob_day" className="sr-only">
                                        Day
                                    </Label>
                                    <Input
                                        id="dob_day"
                                        type="number" // Use text type? Number type can have weird behavior
                                        placeholder="Day"
                                        value={dobDay}
                                        onChange={handleDobDayChange}
                                        onBlur={handleDobDayBlur}
                                        min="1"
                                        max={daysInMonth} // Informational, validation done in handlers
                                        disabled={!dobMonth || !dobYear} // Disable day if month/year isn't set
                                        className={cn(formErrors.date_of_birth && 'border-red-500')}
                                        aria-label="Day"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="dob_year" className="sr-only">
                                        Year
                                    </Label>
                                    <Input
                                        id="dob_year"
                                        type="number" // Use text type?
                                        placeholder="Year"
                                        value={dobYear}
                                        onChange={handleDobYearChange}
                                        onBlur={handleDobYearBlur}
                                        min="1900" // Informational
                                        max={new Date().getFullYear()} // Informational
                                        className={cn(formErrors.date_of_birth && 'border-red-500')}
                                        aria-label="Year"
                                    />
                                </div>
                            </div>
                        </FormField>
                        <FormField label="Gender" htmlFor="gender" error={formErrors.gender}>
                            {/* Ensure value is string or undefined */}
                            <Select onValueChange={(value) => handleSelectChange('gender', value)} value={data.gender || ''}>
                                <SelectTrigger id="gender" className={cn(formErrors.gender && 'border-red-500')}>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    {genderOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Nationality" htmlFor="nationality_trigger" error={formErrors.nationality}>
                            <Dialog open={nationalityPopoverOpen} onOpenChange={setNationalityPopoverOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        id="nationality_trigger"
                                        type="button" // Ensure it's not submitting the form
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={nationalityPopoverOpen}
                                        className={cn(
                                            'w-full justify-between font-normal', // Use full width
                                            !data.nationality && 'text-muted-foreground',
                                            formErrors.nationality && 'border-red-500',
                                        )}
                                    >
                                        {data.nationality
                                            ? nationalityOptions.find((option) => option.value === data.nationality)?.label
                                            : 'Select nationality...'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </DialogTrigger>
                                {/* Adjust DialogContent styling if needed */}
                                <DialogContent className="max-h-[80vh] w-[--radix-popover-trigger-width] overflow-hidden p-0">
                                    <Command>
                                        <CommandInput placeholder="Search nationality..." />
                                        {/* Ensure CommandList is scrollable within the DialogContent */}
                                        <CommandList className="max-h-[calc(80vh-80px)]">
                                            {' '}
                                            {/* Adjust max-height as needed */}
                                            <CommandEmpty>No nationality found.</CommandEmpty>
                                            <CommandGroup>
                                                {nationalityOptions.map((option) => (
                                                    <CommandItem
                                                        key={option.value}
                                                        value={option.value} // value is used for search
                                                        onSelect={handleNationalitySelect} // Use the value from onSelect argument
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                data.nationality === option.value ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
                                                        {option.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </DialogContent>
                            </Dialog>
                        </FormField>
                    </FormSection>
                    {/* --- Contact Information --- */}
                    <FormSection title="Contact Information" description="Manage customer contact details. Designate one as primary.">
                        {/* --- Primary Contact Section (Readonly Display Area) --- */}
                        <h4 className="text-base font-semibold">Primary Contact</h4>
                        <div className="border-primary/20 bg-primary/5 space-y-4 rounded-md border p-4">
                            {/* Use primaryContactInfo safely */}
                            <FormField
                                label="Type"
                                htmlFor={`primary_contact_type_${primaryContactInfo.index}`}
                                error={primaryContactInfo.typeError}
                                required
                            >
                                <Select
                                    value={primaryContactInfo.contact.contact_type || ''}
                                    onValueChange={(value) => handleActiveContactChange(primaryContactInfo.index, 'contact_type', value)}
                                >
                                    <SelectTrigger
                                        id={`primary_contact_type_${primaryContactInfo.index}`}
                                        className={cn(primaryContactInfo.typeError && 'border-red-500')}
                                    >
                                        <SelectValue placeholder="Select primary type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contactTypeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField
                                label="Contact"
                                htmlFor={`primary_contact_value_${primaryContactInfo.index}`}
                                error={primaryContactInfo.valueError}
                                required
                            >
                                <Input
                                    id={`primary_contact_value_${primaryContactInfo.index}`}
                                    value={primaryContactInfo.contact.contact_value || ''}
                                    onChange={(e) => handleActiveContactChange(primaryContactInfo.index, 'contact_value', e.target.value)}
                                    className={cn(primaryContactInfo.valueError && 'border-red-500')}
                                    placeholder="e.g., john.doe@example.com or +123456789"
                                />
                            </FormField>
                            <FormField
                                label="Description"
                                htmlFor={`primary_contact_description_${primaryContactInfo.index}`}
                                error={primaryContactInfo.descError}
                            >
                                <Input
                                    id={`primary_contact_description_${primaryContactInfo.index}`}
                                    value={primaryContactInfo.contact.description || ''}
                                    onChange={(e) => handleActiveContactChange(primaryContactInfo.index, 'description', e.target.value)}
                                    placeholder="Description (Optional)"
                                    className={cn(primaryContactInfo.descError && 'border-red-500')}
                                />
                            </FormField>
                        </div>
                        {/* --- End of Primary Contact Section --- */}

                        {/* Additional Contacts */}
                        <div className="space-y-3 pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold">Additional Contacts</h4>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                                    Add Contact
                                </Button>
                            </div>
                            {/* Render non-primary contacts */}
                            {data.activeContacts.filter((c) => !c.is_primary).length > 0 ? (
                                data.activeContacts.map((contact, index) => {
                                    // Skip primary contact rendering here
                                    if (contact.is_primary) return null;

                                    // Get error keys for this specific contact index
                                    const typeErrorKey = `activeContacts.${index}.contact_type` as keyof FormErrors;
                                    const valueErrorKey = `activeContacts.${index}.contact_value` as keyof FormErrors;
                                    const descErrorKey = `activeContacts.${index}.description` as keyof FormErrors;
                                    return (
                                        <div
                                            // Use backend ID (number) or index (string) as key for stable identity
                                            key={contact.id ?? `new_contact_${index}`}
                                            className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-center gap-2 rounded-md border p-3 transition-colors sm:flex-nowrap sm:space-x-2" // Use items-start for better alignment with errors
                                        >
                                            {/* Contact Type */}
                                            <div className="flex w-full flex-col gap-2">
                                                <div className="item-center flex w-full gap-2">
                                                    <div className="flex-shrink-0 sm:w-auto sm:min-w-[150px] sm:flex-1">
                                                        <Label htmlFor={`contact_type_${index}`} className="sr-only">
                                                            Type
                                                        </Label>
                                                        <Select
                                                            value={contact.contact_type || ''}
                                                            onValueChange={(value) => handleActiveContactChange(index, 'contact_type', value)}
                                                        >
                                                            <SelectTrigger
                                                                id={`contact_type_${index}`}
                                                                className={cn('h-9 w-full', formErrors[typeErrorKey] && 'border-red-500')}
                                                            >
                                                                <SelectValue placeholder="Select Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {contactTypeOptions.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {formErrors[typeErrorKey] && (
                                                            <p className="mt-1 text-xs text-red-500">{formErrors[typeErrorKey]}</p>
                                                        )}
                                                    </div>
                                                    {/* Contact Value */}
                                                    <div className="w-1/2 sm:min-w-0">
                                                        <Label htmlFor={`contact_value_${index}`} className="sr-only">
                                                            Value
                                                        </Label>
                                                        <Input
                                                            id={`contact_value_${index}`}
                                                            value={contact.contact_value || ''}
                                                            onChange={(e) => handleActiveContactChange(index, 'contact_value', e.target.value)}
                                                            placeholder="Value"
                                                            className={cn('h-9 w-full', formErrors[valueErrorKey] && 'border-red-500')}
                                                        />
                                                        {formErrors[valueErrorKey] && (
                                                            <p className="mt-1 text-xs text-red-500">{formErrors[valueErrorKey]}</p>
                                                        )}
                                                    </div>
                                                    {/* Action Buttons */}
                                                    <div className="flex flex-shrink-0 items-center space-x-1">
                                                        {/* Button to set this contact as primary */}
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm" // Smaller button
                                                            className="h-9 px-2" // Adjust padding
                                                            onClick={() => handleSetPrimaryContact(index)}
                                                            aria-label={`Make contact ${index + 1} primary`}
                                                            title="Make Primary" // Tooltip
                                                        >
                                                            Primary
                                                        </Button>
                                                    </div>
                                                </div>
                                                {/* Contact Description */}
                                                <div className="flex-1 sm:min-w-0">
                                                    <Label htmlFor={`contact_description_${index}`} className="sr-only">
                                                        Description
                                                    </Label>
                                                    <Input
                                                        id={`contact_description_${index}`}
                                                        value={contact.description || ''}
                                                        onChange={(e) => handleActiveContactChange(index, 'description', e.target.value)}
                                                        placeholder="Description (Optional)"
                                                        className={cn('h-9 w-full', formErrors[descErrorKey] && 'border-red-500')}
                                                    />
                                                    {formErrors[descErrorKey] && (
                                                        <p className="mt-1 text-xs text-red-500">{formErrors[descErrorKey]}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Remove Button */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => handleRemoveContact(index)} // Use original index
                                                aria-label={`Remove contact ${index + 1}`}
                                                title="Remove Contact" // Tooltip
                                            >
                                                <Trash2 className="text-destructive h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-sm">
                                    No additional contacts added yet.
                                </p>
                            )}
                            {/* Display general array error if it's a string */}
                            {formErrors.activeContacts && typeof formErrors.activeContacts === 'string' && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.activeContacts}</p>
                            )}
                        </div>
                    </FormSection>
                    {/* --- Address Information --- */}
                    <FormSection title="Address Information" description="Update the customer's address details.">
                        <FormField label="Address Line 1" htmlFor="address_line_1" error={formErrors.address_line_1}>
                            <Input
                                id="address_line_1"
                                name="address_line_1"
                                value={data.address_line_1 || ''} // Handle potential null/undefined
                                onChange={handleInputChange}
                                autoComplete="address-line1"
                                className={cn(formErrors.address_line_1 && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="Address Line 2" htmlFor="address_line_2" error={formErrors.address_line_2}>
                            <Input
                                id="address_line_2"
                                name="address_line_2"
                                value={data.address_line_2 || ''}
                                onChange={handleInputChange}
                                autoComplete="address-line2"
                                className={cn(formErrors.address_line_2 && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="Commune" htmlFor="commune" error={formErrors.commune}>
                            <Input
                                id="commune"
                                name="commune"
                                value={data.commune || ''}
                                onChange={handleInputChange}
                                autoComplete="address-level3" // More specific autocomplete
                                className={cn(formErrors.commune && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="District" htmlFor="district" error={formErrors.district}>
                            <Input
                                id="district"
                                name="district"
                                value={data.district || ''}
                                onChange={handleInputChange}
                                autoComplete="address-level2" // More specific autocomplete
                                className={cn(formErrors.district && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="City" htmlFor="city" error={formErrors.city}>
                            <Input
                                id="city"
                                name="city"
                                value={data.city || ''}
                                onChange={handleInputChange}
                                autoComplete="address-level1" // More specific autocomplete (City/Province)
                                className={cn(formErrors.city && 'border-red-500')}
                            />
                        </FormField>
                    </FormSection>
                    {/* --- Additional Notes --- */}
                    <FormSection title="Additional Notes" description="Update any relevant notes about the customer.">
                        <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2 md:pt-0" className="md:items-start">
                            <textarea
                                id="notes"
                                name="notes"
                                value={data.notes || ''} // Handle potential null/undefined
                                onChange={handleInputChange}
                                rows={4}
                                className={cn(
                                    'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50', // Base styles
                                    formErrors.notes && 'border-red-500', // Error style
                                )}
                                placeholder="Enter any additional notes here..."
                            />
                        </FormField>
                    </FormSection>
                </div>{' '}
                {/* End Scrollable Content Area */}
                {/* --- Form Actions (Sticky Footer) --- */}
                {/* Use SheetFooter for styling if inside a Sheet, otherwise use a standard div */}
                <SheetFooter className="bg-background sticky bottom-0 py-4">
                    {' '}
                    {/* Make footer sticky */}
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {/* Close button likely provided by parent Sheet/Dialog, or pass close handler */}
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button
                            type="button" // Important: Not type="submit"
                            variant="outline"
                            onClick={() => {
                                reset(); // Reset Inertia form data
                                // Re-parse DoB and reset local state based on the *original* selectedCustomer data
                                let initialMonth: number | null = null;
                                let initialDay = '';
                                let initialYear = '';
                                if (selectedCustomer?.date_of_birth) {
                                    // Use optional chaining
                                    const parts = selectedCustomer.date_of_birth.split('-');
                                    if (parts.length === 3) {
                                        initialYear = parts[0];
                                        initialMonth = parseInt(parts[1], 10);
                                        initialDay = parts[2];
                                    }
                                }
                                setDobYear(initialYear);
                                setDobMonth(initialMonth);
                                setDobDay(initialDay);
                                clearErrors(); // Clear any validation errors
                                toast.info('Changes have been reset.');
                            }}
                            disabled={processing} // Disable while submitting
                        >
                            Reset Changes
                        </Button>
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
