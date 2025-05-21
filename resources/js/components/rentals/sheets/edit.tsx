import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Contacts, ContactTypes, Customers } from '@/types'; // Assuming Customers and Contacts types are defined
import { useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import countries from 'world-countries';

// --- Type Definitions ---
// Assuming ContactTypes has at least { id: number; name: string; }
// Assuming Contacts from '@/types' has contact_type_id: number;
interface EnhancedContact extends Omit<Contacts, 'id' | 'contact_type_id'> {
    // Omit contact_type_id if it exists in base Contacts
    id?: number | null;
    is_primary?: boolean;
    contact_type: string; // Ensure contact_type is always a string in the form state
}
interface CustomerWithContacts extends Customers {
    // Assuming activeContacts from backend might have contact_type_id
    activeContacts?: (Contacts & { is_primary?: boolean })[];
}
type InitialFormValues = Omit<
    CustomerWithContacts,
    'id' | 'created_at' | 'updated_at' | 'primary_contact_type' | 'primary_contact' | 'activeContacts'
> & {
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
    contactTypes: ContactTypes[]; // Expecting array of { id: number; name: string; ... }
    selectedCustomer: CustomerWithContacts | null;
    onSubmitSuccess: () => void;
}

export function Edit({ selectedCustomer, contactTypes = [], onSubmitSuccess }: EditProps) {
    // Default contactTypes to empty array
    // --- State ---
    const [dobMonth, setDobMonth] = useState<number | null>(null);
    const [dobDay, setDobDay] = useState<string>('');
    const [dobYear, setDobYear] = useState<string>('');
    const [daysInMonth, setDaysInMonth] = useState<number>(31);
    const [nationalityPopoverOpen, setNationalityPopoverOpen] = useState(false);

    // Create a map for quick lookup of contact type name by ID
    const contactTypeMap = useMemo(() => {
        const map = new Map<number, string>();
        contactTypes.forEach((type) => {
            if (type.id && type.name) {
                map.set(type.id, type.name);
            }
        });
        return map;
    }, [contactTypes]);

    // --- Initialize Inertia Form ---
    const initialFormValues: InitialFormValues = useMemo(() => {
        let contacts: EnhancedContact[] = [];
        if (selectedCustomer && Array.isArray(selectedCustomer.activeContacts) && selectedCustomer.activeContacts.length > 0) {
            contacts = selectedCustomer.activeContacts.map((c, index) => {
                // Find the contact type name using the ID from the map
                const typeName = c.contact_type_id ? (contactTypeMap.get(c.contact_type_id) ?? '') : '';

                // Return the contact object for the form state
                return {
                    ...c, // Spread other properties like contact_value, description
                    id: c.id || null,
                    contact_type: typeName, // Use the found name
                    is_primary: c.is_primary ?? index === 0, // Default first to primary if not specified
                };
            });

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
            date_of_birth: selectedCustomer?.date_of_birth ?? undefined,
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
        // Add contactTypeMap dependency, so if contactTypes prop changes, this recalculates
    }, [selectedCustomer, contactTypeMap]);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    // --- Effect to Reset Form and Populate DoB Fields on Customer Change ---
    useEffect(() => {
        if (selectedCustomer) {
            // Reset Inertia form state FIRST using the calculated initial values
            reset(); // This should now reset to the values including the correct contact_type name

            // FIX: Use setTimeout to ensure reset() completes before setting local DoB state
            const timerId = setTimeout(() => {
                let initialMonth: number | null = null;
                let initialDay = '';
                let initialYear = '';

                if (selectedCustomer.date_of_birth && typeof selectedCustomer.date_of_birth === 'string') {
                    const parts = selectedCustomer.date_of_birth.split('-'); // Expect YYYY-MM-DD
                    if (parts.length === 3) {
                        const yearNum = parseInt(parts[0], 10);
                        const monthNum = parseInt(parts[1], 10);
                        const dayNum = parseInt(parts[2], 10);

                        if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
                            initialYear = parts[0];
                            initialMonth = monthNum;
                            initialDay = parts[2];
                        }
                    }
                }
                setDobYear(initialYear);
                setDobMonth(initialMonth);
                setDobDay(initialDay);

                clearErrors();
            }, 0);

            return () => clearTimeout(timerId);
        } else {
            setDobYear('');
            setDobMonth(null);
            setDobDay('');
            clearErrors();
        }
    }, [selectedCustomer, reset, clearErrors]); // Keep reset/clearErrors dependencies

    // --- Effect to calculate max days in month ---
    useEffect(() => {
        const numDays = getDaysInMonth(dobMonth, dobYear);
        setDaysInMonth(numDays);
        const dayNum = parseInt(dobDay, 10);
        if (!isNaN(dayNum) && dayNum > numDays) {
            setDobDay('');
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    }, [dobMonth, dobYear, dobDay, clearErrors, formErrors.date_of_birth]);

    // --- Effect to update Inertia form data 'date_of_birth' ---
    useEffect(() => {
        const month = dobMonth;
        const day = parseInt(dobDay, 10);
        const year = parseInt(dobYear, 10);

        let formattedDate: string | undefined = undefined;
        if (month && !isNaN(day) && day >= 1 && day <= daysInMonth && !isNaN(year) && year >= 1000 && year <= 3000) {
            formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        if (formattedDate !== data.date_of_birth) {
            setData('date_of_birth', formattedDate);
            if (formattedDate && formErrors.date_of_birth) {
                clearErrors('date_of_birth');
            }
        } else if (!formattedDate && data.date_of_birth !== undefined) {
            setData('date_of_birth', undefined);
        }
    }, [dobMonth, dobDay, dobYear, daysInMonth, setData, data.date_of_birth, clearErrors, formErrors.date_of_birth]);

    // --- Generic Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
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
        const finalValue = nationalityOptions.find((opt) => opt.value.toLowerCase() === currentValue.toLowerCase())?.value || '';
        if (finalValue !== data.nationality) {
            setData('nationality', finalValue);
            if (formErrors.nationality) clearErrors('nationality');
        }
        setNationalityPopoverOpen(false);
    };

    // --- Date of Birth Input Handlers ---
    const handleDobMonthChange = (value: string) => {
        const monthNum = value ? parseInt(value, 10) : null;
        setDobMonth(monthNum);
        if (formErrors.date_of_birth) clearErrors('date_of_birth');
    };
    const handleDobDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dayValue = e.target.value;
        if (dayValue === '' || (/^\d+$/.test(dayValue) && parseInt(dayValue, 10) <= daysInMonth)) {
            setDobDay(dayValue);
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        } else if (/^\d+$/.test(dayValue) && parseInt(dayValue, 10) > daysInMonth) {
            // Allow typing, validation happens on blur or submit
            setDobDay(dayValue);
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    };
    const handleDobDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const dayValue = e.target.value;
        if (dayValue === '') {
            setDobDay('');
            return;
        }
        const dayNum = parseInt(dayValue, 10);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) {
            setDobDay('');
        }
    };
    const handleDobYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const yearValue = e.target.value;
        if (yearValue === '' || /^\d{0,4}$/.test(yearValue)) {
            setDobYear(yearValue);
            if (formErrors.date_of_birth) clearErrors('date_of_birth');
        }
    };
    const handleDobYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const yearValue = e.target.value;
        if (yearValue === '') {
            setDobYear('');
            return;
        }
        const yearNum = parseInt(yearValue, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
            setDobYear('');
        }
    };

    // --- Contact Handlers ---
    const handleActiveContactChange = (index: number, field: keyof EnhancedContact, value: string | boolean) => {
        const updatedContacts = data.activeContacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact));
        setData('activeContacts', updatedContacts);

        const errorKey = `activeContacts.${index}.${field}` as keyof FormErrors;
        if (formErrors[errorKey]) clearErrors(errorKey);
        if (formErrors.activeContacts) clearErrors('activeContacts');
    };

    const handleAddContact = () => {
        const newContact: EnhancedContact = {
            id: null,
            contact_type: '',
            contact_value: '',
            description: '',
            is_primary: false,
        };
        setData('activeContacts', [...data.activeContacts, newContact]);
    };

    const handleRemoveContact = (indexToRemove: number) => {
        const contactToRemove = data.activeContacts[indexToRemove];
        if (contactToRemove?.is_primary) {
            toast.error('Cannot remove the primary contact. Assign another contact as primary first.');
            return;
        }
        setData(
            'activeContacts',
            data.activeContacts.filter((_, index) => index !== indexToRemove),
        );
        clearErrors();
    };

    const handleSetPrimaryContact = (indexToSet: number) => {
        setData(
            'activeContacts',
            data.activeContacts.map((contact, index) => ({
                ...contact,
                is_primary: index === indexToSet,
            })),
        );
        clearErrors();
    };

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedCustomer.id) {
            toast.error('No customer selected or customer ID missing.');
            return;
        }
        clearErrors();

        const url = `/customers/${selectedCustomer.id}/update`;

        // --- Frontend Validation ---
        let isValid = true;
        const newErrors: FormErrors = {};

        if (!data.first_name) {
            newErrors.first_name = 'First name is required.';
            isValid = false;
        }
        if (!data.last_name) {
            newErrors.last_name = 'Last name is required.';
            isValid = false;
        }

        const month = dobMonth;
        const day = parseInt(dobDay, 10);
        const year = parseInt(dobYear, 10);
        const isDobFilled = month || dobDay || dobYear;
        const isDobValid = month && !isNaN(day) && day >= 1 && day <= daysInMonth && !isNaN(year) && year >= 1000 && year <= 3000;

        if (isDobFilled && !isDobValid) {
            newErrors.date_of_birth = 'Please enter a complete and valid date of birth.';
            isValid = false;
        } else if (isDobFilled && isDobValid && data.date_of_birth === undefined) {
            newErrors.date_of_birth = 'Date of birth calculation failed. Please check values.';
            isValid = false;
        }

        const primaryIndex = data.activeContacts.findIndex((c) => c.is_primary);
        if (primaryIndex === -1) {
            newErrors.activeContacts = 'A primary contact must be designated.';
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
            // Add specific format validation if needed
            if (primaryContact.contact_type === 'Email' && !/\S+@\S+\.\S+/.test(primaryContact.contact_value)) {
                newErrors[`activeContacts.${primaryIndex}.contact_value`] = 'Please enter a valid email address.';
                isValid = false;
            }
            if (
                ['Phone', 'Mobile', 'Work Phone', 'Home Phone'].includes(primaryContact.contact_type) &&
                !/^[+\d\s-]+$/.test(primaryContact.contact_value)
            ) {
                newErrors[`activeContacts.${primaryIndex}.contact_value`] = 'Please enter a valid phone number.';
                isValid = false;
            }
        }

        data.activeContacts.forEach((contact, index) => {
            if (!contact.is_primary) {
                if (contact.contact_type && !contact.contact_value) {
                    newErrors[`activeContacts.${index}.contact_value`] = 'Contact value is required if type is selected.';
                    isValid = false;
                } else if (!contact.contact_type && contact.contact_value) {
                    newErrors[`activeContacts.${index}.contact_type`] = 'Contact type is required if value is entered.';
                    isValid = false;
                }
                // Add specific format validation for non-primary contacts if needed
            }
        });

        if (!isValid) {
            // @ts-ignore - Inertia's setData type might not perfectly match FormErrors structure, but this is how errors are typically set.
            setData('errors', newErrors);
            toast.error('Please fix the errors in the form.');
            return;
        }
        // --- End Frontend Validation ---

        // **IMPORTANT**: Before sending data to the backend, map `contact_type` (name)
        // back to `contact_type_id` if your backend expects the ID.
        const contactTypeIdMap = new Map<string, number>();
        contactTypes.forEach((type) => {
            if (type.id && type.name) {
                contactTypeIdMap.set(type.name, type.id);
            }
        });

        const dataToSend = {
            ...data,
            activeContacts: data.activeContacts.map((contact) => {
                const { contact_type, ...restOfContact } = contact; // Destructure to remove contact_type name
                return {
                    ...restOfContact,
                    contact_type_id: contactTypeIdMap.get(contact_type) ?? null, // Get ID from name, fallback to null if not found
                };
            }),
        };

        // Use dataToSend which has contact_type_id
        put(url, {
            data: dataToSend, // Send the transformed data
            preserveScroll: true,
            onSuccess: () => {
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Backend Submission Errors:', currentErrors);
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    toast.error('Failed to update customer. Please check the errors below.');
                } else {
                    toast.error('Failed to update customer. An unknown error occurred.');
                }
                // Inertia automatically sets errors state via the hook
            },
        });
    };

    // --- Get Primary Contact Info (Memoized for performance) ---
    const primaryContactInfo = useMemo(() => {
        // Find index based on the form's current data state
        const index = data.activeContacts.findIndex((c) => c.is_primary);
        if (index === -1) {
            console.warn('No primary contact found in activeContacts array.');
            // Attempt to find the first contact as a fallback, though validation should prevent this state
            const firstContact = data.activeContacts[0];
            if (firstContact) {
                return {
                    index: 0,
                    contact: firstContact,
                    typeError: formErrors[`activeContacts.0.contact_type`],
                    valueError: formErrors[`activeContacts.0.contact_value`],
                    descError: formErrors[`activeContacts.0.description`],
                };
            }
            // If no contacts at all, return a structure indicating missing contact
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
        return <div className="p-6 text-center text-gray-500">Loading customer data or select a customer...</div>;
    }

    // Ensure primaryContact is available before rendering dependent sections
    if (!primaryContactInfo.contact) {
        // This might happen briefly if contacts array is empty initially and logic hasn't added the default one yet
        // Or if the fallback in primaryContactInfo failed.
        console.error('Primary contact data is missing or invalid. Form state:', data.activeContacts);
        // You might want a more robust loading/error state here
        return <div className="p-6 text-center text-red-500">Error: Primary contact data is missing. Cannot render form.</div>;
    }

    // Prepare contact type options for Select components
    const contactTypeSelectOptions = contactTypes.map((option) => ({
        value: option.name, // Use name as the value for SelectItem
        label: option.name,
    }));

    return (
        <div className="h-full px-1 py-2 sm:px-4">
            <form onSubmit={handleSubmit} className="flex h-full flex-col space-y-4">
                {/* Scrollable Content Area */}
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
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
                                        type="number"
                                        placeholder="Day"
                                        value={dobDay}
                                        onChange={handleDobDayChange}
                                        onBlur={handleDobDayBlur}
                                        min="1"
                                        max={daysInMonth}
                                        disabled={!dobMonth || !dobYear}
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
                                        type="number"
                                        placeholder="Year"
                                        value={dobYear}
                                        onChange={handleDobYearChange}
                                        onBlur={handleDobYearBlur}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        className={cn(formErrors.date_of_birth && 'border-red-500')}
                                        aria-label="Year"
                                    />
                                </div>
                            </div>
                        </FormField>
                        <FormField label="Gender" htmlFor="gender" error={formErrors.gender}>
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
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={nationalityPopoverOpen}
                                        className={cn(
                                            'w-full justify-between font-normal',
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
                                <DialogContent className="max-h-[80vh] w-[--radix-popover-trigger-width] overflow-hidden p-0">
                                    <Command>
                                        <CommandInput placeholder="Search nationality..." />
                                        <CommandList className="max-h-[calc(80vh-80px)]">
                                            <CommandEmpty>No nationality found.</CommandEmpty>
                                            <CommandGroup>
                                                {nationalityOptions.map((option) => (
                                                    <CommandItem key={option.value} value={option.value} onSelect={handleNationalitySelect}>
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
                        <h4 className="text-base font-semibold">Primary Contact</h4>
                        <div className="border-primary/20 bg-primary/5 space-y-4 rounded-md border p-4">
                            <FormField
                                label="Type"
                                htmlFor={`primary_contact_type_${primaryContactInfo.index}`}
                                error={primaryContactInfo.typeError}
                                required
                            >
                                <Select
                                    // Use the contact_type name from the form state
                                    value={primaryContactInfo.contact.contact_type || ''}
                                    onValueChange={(value) => handleActiveContactChange(primaryContactInfo.index, 'contact_type', value)}
                                >
                                    <SelectTrigger
                                        id={`primary_contact_type_${primaryContactInfo.index}`}
                                        className={cn(primaryContactInfo.typeError && 'border-red-500')}
                                    >
                                        {/* The value should now correctly match an option */}
                                        <SelectValue placeholder="Select primary type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contactTypeSelectOptions.map((option) => (
                                            // Key and value use the name string
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

                        {/* Additional Contacts */}
                        <div className="space-y-3 pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold">Additional Contacts</h4>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                                    Add Contact
                                </Button>
                            </div>
                            {data.activeContacts.filter((c) => !c.is_primary).length > 0 ? (
                                data.activeContacts.map((contact, index) => {
                                    if (contact.is_primary) return null;

                                    const typeErrorKey = `activeContacts.${index}.contact_type` as keyof FormErrors;
                                    const valueErrorKey = `activeContacts.${index}.contact_value` as keyof FormErrors;
                                    const descErrorKey = `activeContacts.${index}.description` as keyof FormErrors;
                                    return (
                                        <div
                                            key={contact.id ?? `new_contact_${index}`}
                                            className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-start gap-2 rounded-md border p-3 transition-colors sm:flex-nowrap sm:space-x-2"
                                        >
                                            {' '}
                                            {/* Changed to items-start */}
                                            {/* Contact Details Flex Container */}
                                            <div className="flex flex-grow flex-col gap-2">
                                                {/* Type and Value Row */}
                                                <div className="flex w-full flex-col gap-2 sm:flex-row">
                                                    <div className="flex-grow sm:w-1/3 sm:min-w-[150px]">
                                                        {' '}
                                                        {/* Adjusted width */}
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
                                                                {contactTypeSelectOptions.map((option) => (
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
                                                    <div className="flex-grow sm:w-2/3">
                                                        {' '}
                                                        {/* Adjusted width */}
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
                                                </div>
                                                {/* Description Row */}
                                                <div className="w-full">
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
                                            {/* Action Buttons Container */}
                                            <div className="flex flex-shrink-0 flex-col items-center gap-1 pt-1 sm:pt-0">
                                                {' '}
                                                {/* Added pt-1 for small screens */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 w-full px-2 sm:w-auto"
                                                    onClick={() => handleSetPrimaryContact(index)}
                                                    aria-label={`Make contact ${index + 1} primary`}
                                                    title="Make Primary"
                                                >
                                                    Primary
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9"
                                                    onClick={() => handleRemoveContact(index)}
                                                    aria-label={`Remove contact ${index + 1}`}
                                                    title="Remove Contact"
                                                >
                                                    <Trash2 className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-sm">
                                    No additional contacts added yet.
                                </p>
                            )}
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
                                value={data.address_line_1 || ''}
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
                                autoComplete="address-level3"
                                className={cn(formErrors.commune && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="District" htmlFor="district" error={formErrors.district}>
                            <Input
                                id="district"
                                name="district"
                                value={data.district || ''}
                                onChange={handleInputChange}
                                autoComplete="address-level2"
                                className={cn(formErrors.district && 'border-red-500')}
                            />
                        </FormField>
                        <FormField label="City" htmlFor="city" error={formErrors.city}>
                            <Input
                                id="city"
                                name="city"
                                value={data.city || ''}
                                onChange={handleInputChange}
                                autoComplete="address-level1"
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
                </div>{' '}
                {/* End Scrollable Content Area */}
                {/* --- Form Actions (Sticky Footer) --- */}
                <SheetFooter className="bg-background sticky bottom-0 py-4">
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
                                reset(); // Reset Inertia form data to recalculated initial values
                                // Re-parse DoB and reset local state based on the *original* selectedCustomer data
                                let initialMonth: number | null = null;
                                let initialDay = '';
                                let initialYear = '';
                                if (selectedCustomer?.date_of_birth) {
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
                                clearErrors();
                                toast.info('Changes have been reset.');
                            }}
                            disabled={processing}
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
