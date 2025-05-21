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
import React, { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';
import countries from 'world-countries';

// --- Type Definitions ---
// Adjusted InitialFormValues: Removed top-level primary contact fields
// Added is_primary to Contacts type if not already present
interface EnhancedContact extends Omit<Contacts, 'id'> {
    id?: string | number; // Allow temporary frontend ID
    is_primary?: boolean;
}
type InitialFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_contact_type' | 'primary_contact'> & {
    activeContacts: EnhancedContact[];
};
type FormErrors = Partial<
    Record<
        | keyof Omit<InitialFormValues, 'activeContacts'>
        | 'dob_month'
        | 'dob_day'
        | 'dob_year'
        | `activeContacts.${number}.${keyof EnhancedContact}`
        | 'activeContacts', // General error for the array
        string
    >
>;

// --- Helper Function to get the number of days in a month ---
const getDaysInMonth = (month: number | null, year: string | number): number => {
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    if (!month) return 31;
    if (isNaN(yearNum) || yearNum < 1000 || yearNum > 3000) return 31;
    return new Date(yearNum, month, 0).getDate();
};

// --- Prepare Static Options ---
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

// --- Define Initial Empty Form Values ---
// Initialize activeContacts with one primary contact object
const initialFormValues: InitialFormValues = {
    first_name: '',
    last_name: '',
    date_of_birth: undefined,
    gender: '',
    nationality: '',
    address_line_1: '',
    address_line_2: '',
    commune: '',
    district: '',
    city: 'Phnom Penh',
    notes: '',
    // Removed primary_contact_type and primary_contact
    activeContacts: [
        // Start with one contact object, marked as primary
        { id: 'primary_0', contact_type: '', contact_value: '', description: '', is_primary: true },
    ],
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
    contactTypes: ContactTypes[];
    onSubmitSuccess: () => void; // Callback on successful creation
}

export function Create({ contactTypes, onSubmitSuccess }: CreateProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors; // Type assertion

    // --- State for separate Date of Birth inputs ---
    const [dobMonth, setDobMonth] = useState<number | null>(null);
    const [dobDay, setDobDay] = useState<string>('');
    const [dobYear, setDobYear] = useState<string>('');
    const [daysInMonth, setDaysInMonth] = useState<number>(31);

    const contactTypeOptions = contactTypes;

    // --- Other existing state ---
    const [nationalityPopoverOpen, setNationalityPopoverOpen] = useState(false);

    // --- Effect to calculate max days in month ---
    useEffect(() => {
        const numDays = getDaysInMonth(dobMonth, dobYear);
        setDaysInMonth(numDays);
        const dayNum = parseInt(dobDay);
        if (!isNaN(dayNum) && dayNum > numDays) {
            setDobDay('');
        }
    }, [dobMonth, dobYear, dobDay]); // Added dobDay dependency

    // --- Effect to update Inertia form data 'date_of_birth' ---
    useEffect(() => {
        const month = dobMonth;
        const day = parseInt(dobDay);
        const year = parseInt(dobYear);

        if (month && !isNaN(day) && day >= 1 && day <= daysInMonth && !isNaN(year) && year >= 1000 && year <= 3000) {
            const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (formattedDate !== data.date_of_birth) {
                setData('date_of_birth', formattedDate);
                if (formErrors.date_of_birth) clearErrors('date_of_birth');
            }
        } else {
            if (data.date_of_birth !== undefined) {
                setData('date_of_birth', undefined);
            }
        }
    }, [dobMonth, dobDay, dobYear, daysInMonth, setData, data.date_of_birth, clearErrors, formErrors.date_of_birth]);

    // --- Generic Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Use assertion for safety, ensure name is a valid key
        const key = name as keyof Omit<InitialFormValues, 'activeContacts'>;
        setData(key, value);
        if (formErrors[key]) {
            clearErrors(key);
        }
    };

    const handleSelectChange = (name: keyof Omit<InitialFormValues, 'activeContacts'>, value: string) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
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
        setDobMonth(value ? parseInt(value) : null);
        if (formErrors.date_of_birth) clearErrors('date_of_birth');
    };
    const handleDobDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDobDay(e.target.value);
        if (formErrors.date_of_birth) clearErrors('date_of_birth');
    };
    const handleDobDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const dayNum = parseInt(e.target.value);
        if (e.target.value !== '' && (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth)) {
            setDobDay('');
        }
    };
    const handleDobYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDobYear(e.target.value);
        if (formErrors.date_of_birth) clearErrors('date_of_birth');
    };
    const handleDobYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const yearNum = parseInt(e.target.value);
        if (e.target.value !== '' && (isNaN(yearNum) || yearNum < 1000 || yearNum > 3000)) {
            setDobYear('');
        }
    };

    // --- Contact Handlers ---
    // UPDATED: Now handles both primary (index 0) and additional contacts
    const handleActiveContactChange = (index: number, field: keyof EnhancedContact, value: string | boolean) => {
        const updatedContacts = data.activeContacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact));
        setData('activeContacts', updatedContacts);

        // Clear specific error for the changed field
        const errorKey = `activeContacts.${index}.${field}` as keyof FormErrors;
        if (formErrors[errorKey]) {
            clearErrors(errorKey);
        }
        // Also clear general array error if user starts fixing things
        if (formErrors.activeContacts) {
            clearErrors('activeContacts');
        }
    };

    const handleAddContact = () => {
        // New contacts are not primary
        const newContact: EnhancedContact = { id: `new_${Date.now()}`, contact_type: '', contact_value: '', description: '', is_primary: false };
        setData('activeContacts', [...data.activeContacts, newContact]);
    };

    const handleRemoveContact = (indexToRemove: number) => {
        // Prevent removing the primary contact (index 0)
        if (indexToRemove === 0) {
            toast.error('Cannot remove the primary contact.');
            return;
        }
        setData(
            'activeContacts',
            data.activeContacts.filter((_, index) => index !== indexToRemove),
        );
        // Clear errors related to the removed index and potentially shift subsequent errors
        // (Inertia might handle error shifting automatically, but manual clearing can be safer)
        clearErrors(); // Simple approach: clear all contact errors on removal
    };

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();
        const url = '/customers/register';

        // Optional: Add frontend validation to ensure primary contact has type/value
        const primaryContact = data.activeContacts[0];
        if (!primaryContact || !primaryContact.contact_type || !primaryContact.contact_value) {
            // Manually set errors or show a toast
            setData('errors', {
                ...errors,
                'activeContacts.0.contact_type': !primaryContact?.contact_type ? 'Primary contact type is required.' : undefined,
                'activeContacts.0.contact_value': !primaryContact?.contact_value ? 'Primary contact value is required.' : undefined,
            });
            toast.error('Please fill in the primary contact type and value.');
            return; // Stop submission
        }

        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                reset(); // Resets form to initialFormValues
                // Reset local DoB state
                setDobMonth(null);
                setDobDay('');
                setDobYear('');
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors); // Log errors
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        // Improved error message formatting
                        const fieldNameParts = field.split('.');
                        let userFriendlyFieldName = fieldNameParts
                            .map((part) => {
                                if (part === 'activeContacts') return 'Contacts';
                                if (/^\d+$/.test(part)) return `Item ${parseInt(part) + 1}`; // 1-based index
                                return part.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
                            })
                            .join(' - ');

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error('Failed to create customer. An unknown error occurred.');
                }
            },
        });
    };

    // --- Get Primary Contact for easier access in JSX ---
    // Ensure activeContacts always has at least the primary contact structure
    const primaryContact = data.activeContacts[0] || { contact_type: '', contact_value: '', is_primary: true };
    // Get potential errors for the primary contact (index 0)
    const primaryContactTypeError = formErrors['activeContacts.0.contact_type'];
    const primaryContactValueError = formErrors['activeContacts.0.contact_value'];

    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Information --- */}
                <FormSection title="Create New Customer" description="Enter the basic information for the new customer.">
                    {/* Fields: First Name, Last Name, DoB, Gender, Nationality */}
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
                    {/* Date of Birth Field (No changes needed here) */}
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
                                    disabled={!dobMonth}
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
                        <Select onValueChange={(value) => handleSelectChange('gender', value)} value={data.gender}>
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
                            <DialogContent className="max-h-[var(--dialog-content-available-height,90vh)] w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search nationality..." />
                                    <CommandList>
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

                {/* --- Contact Information (REVISED) --- */}
                <FormSection title="Contact Information" description="Add the customer's contact details. The first contact is primary.">
                    {/* --- MODIFIED Primary Contact Section --- */}
                    <h4 className="text-base font-semibold">Primary Contact</h4>
                    <div className="space-y-4">
                        {/* Use index 0 for primary contact */}
                        <FormField label="Type" htmlFor="primary_contact_type_0" error={primaryContactTypeError} required>
                            <Select
                                value={primaryContact.contact_type}
                                // Use handleActiveContactChange with index 0
                                onValueChange={(value) => handleActiveContactChange(0, 'contact_type', value)}
                            >
                                <SelectTrigger id="primary_contact_type_0" className={cn(primaryContactTypeError && 'border-red-500')}>
                                    <SelectValue placeholder="Select primary type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contactTypeOptions.map((option) => (
                                        <SelectItem key={option.name} value={option.name}>
                                            {option.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Contact" htmlFor="primary_contact_value_0" error={primaryContactValueError} required>
                            <Input
                                id="primary_contact_value_0"
                                // Use index 0 for primary contact value
                                value={primaryContact.contact_value}
                                // Use handleActiveContactChange with index 0
                                onChange={(e) => handleActiveContactChange(0, 'contact_value', e.target.value)}
                                className={cn(primaryContactValueError && 'border-red-500')}
                                placeholder="e.g., john.doe@example.com or +123456789"
                            />
                        </FormField>
                        {/* Optional: Add description for primary contact if needed */}
                        <FormField label="Description" htmlFor="primary_contact_description_0">
                            <Input
                                id="primary_contact_description_0"
                                value={primaryContact.description || ''}
                                onChange={(e) => handleActiveContactChange(0, 'description', e.target.value)}
                                placeholder="Description (Optional)"
                            />
                        </FormField>
                    </div>
                    {/* --- End of MODIFIED Primary Contact Section --- */}

                    {/* Additional Contacts */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold">Additional Contacts</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                                Add Contact
                            </Button>
                        </div>
                        {/* Render contacts starting from index 1 (index 0 is primary) */}
                        {data.activeContacts.length > 1 ? (
                            data.activeContacts.slice(1).map((contact, index) => {
                                const actualIndex = index + 1; // Adjust index because we sliced
                                const typeErrorKey = `activeContacts.${actualIndex}.contact_type` as keyof FormErrors;
                                const valueErrorKey = `activeContacts.${actualIndex}.contact_value` as keyof FormErrors;
                                const descErrorKey = `activeContacts.${actualIndex}.description` as keyof FormErrors; // Added for description
                                return (
                                    <div
                                        key={contact.id || actualIndex} // Use temporary ID or index
                                        className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-center gap-2 rounded-md border p-3 transition-colors sm:flex-nowrap sm:space-x-2"
                                    >
                                        <div className="flex w-full flex-col gap-2">
                                            <div className="flex w-full gap-2">
                                                {/* Contact Type */}
                                                <div className="w-full flex-shrink-0 sm:w-auto sm:min-w-[150px] sm:flex-1">
                                                    <Label htmlFor={`contact_type_${actualIndex}`} className="sr-only">
                                                        Type
                                                    </Label>
                                                    <Select
                                                        value={contact.contact_type}
                                                        onValueChange={(value) => handleActiveContactChange(actualIndex, 'contact_type', value)}
                                                    >
                                                        <SelectTrigger
                                                            id={`contact_type_${actualIndex}`}
                                                            className={cn('h-9 w-full', formErrors[typeErrorKey] && 'border-red-500')}
                                                        >
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {contactTypeOptions.map((option) => (
                                                                <SelectItem key={option.name} value={option.name}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {formErrors[typeErrorKey] && (
                                                        <p className="mt-1 text-xs text-red-500">{formErrors[typeErrorKey]}</p>
                                                    )}
                                                </div>
                                                {/* Contact Value */}
                                                <div className="w-full flex-auto sm:min-w-0">
                                                    <Label htmlFor={`contact_value_${actualIndex}`} className="sr-only">
                                                        Value
                                                    </Label>
                                                    <Input
                                                        id={`contact_value_${actualIndex}`}
                                                        value={contact.contact_value}
                                                        onChange={(e) => handleActiveContactChange(actualIndex, 'contact_value', e.target.value)}
                                                        placeholder="Value"
                                                        className={cn('h-9 w-full', formErrors[valueErrorKey] && 'border-red-500')}
                                                    />
                                                    {formErrors[valueErrorKey] && (
                                                        <p className="mt-1 text-xs text-red-500">{formErrors[valueErrorKey]}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Contact Description */}
                                            <div className="w-full flex-1 sm:min-w-0">
                                                <Label htmlFor={`contact_description_${actualIndex}`} className="sr-only">
                                                    Description
                                                </Label>
                                                <Input
                                                    id={`contact_description_${actualIndex}`}
                                                    value={contact.description || ''}
                                                    onChange={(e) => handleActiveContactChange(actualIndex, 'description', e.target.value)}
                                                    placeholder="Description (Optional)"
                                                    className={cn('h-9 w-full', formErrors[descErrorKey] && 'border-red-500')} // Added error check
                                                />
                                                {formErrors[descErrorKey] && <p className="mt-1 text-xs text-red-500">{formErrors[descErrorKey]}</p>}
                                            </div>
                                        </div>
                                        {/* Remove Button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 flex-shrink-0"
                                            onClick={() => handleRemoveContact(actualIndex)}
                                            aria-label={`Remove contact ${actualIndex + 1}`}
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
                        {/* Display general array error */}
                        {formErrors.activeContacts && typeof formErrors.activeContacts === 'string' && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.activeContacts}</p>
                        )}
                    </div>
                </FormSection>

                {/* --- Address Information (No changes needed here) --- */}
                <FormSection title="Address Information" description="Enter the customer's address details.">
                    <FormField label="Address Line 1" htmlFor="address_line_1" error={formErrors.address_line_1}>
                        <Input
                            id="address_line_1"
                            name="address_line_1"
                            value={data.address_line_1}
                            onChange={handleInputChange}
                            autoComplete="address-line1"
                            className={cn(formErrors.address_line_1 && 'border-red-500')}
                        />
                    </FormField>
                    <FormField label="Address Line 2" htmlFor="address_line_2" error={formErrors.address_line_2}>
                        <Input
                            id="address_line_2"
                            name="address_line_2"
                            value={data.address_line_2}
                            onChange={handleInputChange}
                            autoComplete="address-line2"
                            className={cn(formErrors.address_line_2 && 'border-red-500')}
                        />
                    </FormField>
                    <FormField label="Commune" htmlFor="commune" error={formErrors.commune}>
                        <Input
                            id="commune"
                            name="commune"
                            value={data.commune}
                            onChange={handleInputChange}
                            autoComplete="address-level3"
                            className={cn(formErrors.commune && 'border-red-500')}
                        />
                    </FormField>
                    <FormField label="District" htmlFor="district" error={formErrors.district}>
                        <Input
                            id="district"
                            name="district"
                            value={data.district}
                            onChange={handleInputChange}
                            autoComplete="address-level2"
                            className={cn(formErrors.district && 'border-red-500')}
                        />
                    </FormField>
                    <FormField label="City" htmlFor="city" error={formErrors.city}>
                        <Input
                            id="city"
                            name="city"
                            value={data.city}
                            onChange={handleInputChange}
                            autoComplete="address-level1"
                            className={cn(formErrors.city && 'border-red-500')}
                        />
                    </FormField>
                </FormSection>

                {/* --- Additional Notes (No changes needed here) --- */}
                <FormSection title="Additional Notes" description="Add any relevant notes about the customer.">
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="notes"
                            name="notes"
                            value={data.notes}
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

                {/* --- Form Actions --- */}
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
                                reset(); // Reset Inertia form to initial values (incl. primary contact structure)
                                setDobMonth(null);
                                setDobDay('');
                                setDobYear(''); // Reset local DoB state
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create Customer'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
