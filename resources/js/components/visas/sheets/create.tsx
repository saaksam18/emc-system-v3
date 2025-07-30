import { FormField } from '@/components/form/FormField';
import { FormSection } from '@/components/form/FormSection';
import { SearchableCombobox } from '@/components/form/SearchableCombobox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Customers, User } from '@/types';
import { useForm } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// --- Define Initial Empty Form Values ---
interface InitialFormValues {
    customer_name: string;
    passport_number: string;
    visa_type: string;
    expiration_date: string; // Store as string (ISO format) for form and send to backend
    incharger_name: string;
    notes: string;
}

// --- Form Errors Interface ---
interface FormErrors {
    customer_name?: string;
    passport_number?: string;
    visa_type?: string;
    expiration_date?: string;
    incharger_name?: string;
    notes?: string;
}

// --- Date Utility Functions ---
const now = () => new Date().toISOString();

const parseDateString = (dateString: string | null | undefined): Date | undefined => {
    if (!dateString) return undefined;
    try {
        const date = parseISO(dateString);
        return isValid(date) ? date : undefined;
    } catch (e) {
        return undefined;
    }
};

// --- Reusable Entity Combobox ---
interface EntityComboboxProps<T extends { id: number; name: string }> {
    items: T[] | null;
    value: string;
    onChange: (value: string) => void;
    processing: boolean;
    error?: string;
    entityName: string;
}

function EntityCombobox<T extends { id: number; name: string }>({ items, value, onChange, processing, error, entityName }: EntityComboboxProps<T>) {
    const options = useMemo(
        () =>
            Array.isArray(items)
                ? items
                      .filter((item): item is T => !!item && !!item.id && typeof item.name === 'string' && item.name !== '')
                      .map((item) => ({ value: item.name, label: item.name }))
                : [],
        [items],
    );

    return (
        <>
            <SearchableCombobox
                options={options}
                value={value}
                onChange={onChange}
                placeholder={`Select ${entityName}...`}
                searchPlaceholder={`Search ${entityName}...`}
                emptyMessage={`No ${entityName} found.`}
                disabled={processing || options.length === 0}
                error={!!error}
            />
            {options.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No {entityName}s available.</p>}
        </>
    );
}

// --- Main Create Component ---
interface CreateProps {
    customers: Customers[] | null;
    users: User[] | null;
    onSubmitSuccess: () => void; // Callback on successful creation
}

export function Create({ customers, users, onSubmitSuccess }: CreateProps) {
    const initialFormValues: InitialFormValues = {
        customer_name: '',
        passport_number: '',
        visa_type: '',
        expiration_date: now(),
        incharger_name: '',
        notes: '',
    };

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    const [expirationDateDialogOpen, setExpirationDateDialogOpen] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const key = name as keyof InitialFormValues;
        setData(key, value);
        if (formErrors[key]) {
            clearErrors(key);
        }
    };

    const handleComboboxChange = (name: keyof InitialFormValues, value: string) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    const handleDateChange = (name: keyof InitialFormValues, date: Date | undefined) => {
        setData(name, date ? date.toISOString() : '');
        if (formErrors[name]) {
            clearErrors(name);
        }
        setExpirationDateDialogOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(data);
        post(route('visa.register.store'), {
            onSuccess: () => {
                reset();
                onSubmitSuccess();
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
            },
        });
    };

    const suggestedVisaType = ['EB', 'ER', 'EG', 'EP', 'ES'];

    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="Select Customer" description="Select saved customer from database.">
                    <FormField label="Customer" htmlFor="customer_name" error={formErrors.customer_name} required>
                        <EntityCombobox
                            items={customers}
                            value={data.customer_name}
                            onChange={(value) => handleComboboxChange('customer_name', value)}
                            processing={processing}
                            error={formErrors.customer_name}
                            entityName="customer"
                        />
                    </FormField>
                </FormSection>

                <FormSection title="Passport and Visa Information" description="Enter the customer's passport and visa details.">
                    <FormField label="Passport Number" htmlFor="passport_number" error={formErrors.passport_number}>
                        <Input
                            id="passport_number"
                            name="passport_number"
                            value={data.passport_number}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(formErrors.passport_number && 'border-red-500')}
                        />
                    </FormField>
                    <FormField label="Visa Type" htmlFor="visa_type" error={formErrors.visa_type} required>
                        <Input
                            id="visa_type"
                            name="visa_type"
                            value={data.visa_type ?? ''}
                            onChange={handleInputChange}
                            className={cn(formErrors.visa_type && 'border-red-500')}
                            list="visa-type-suggestions"
                            placeholder="e.g., EB"
                        />
                        <datalist id="visa-type-suggestions">
                            {suggestedVisaType.map((vtype) => (
                                <option key={vtype} value={vtype} />
                            ))}
                        </datalist>
                        <p className="text-muted-foreground mt-1 text-xs">Type or select a visa type (e.g., EB, ER).</p>
                    </FormField>

                    <FormField label="Expiration Date" htmlFor="expiration_date" error={formErrors.expiration_date} required>
                        <Dialog open={expirationDateDialogOpen} onOpenChange={setExpirationDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="expiration_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.expiration_date && 'text-muted-foreground',
                                        formErrors.expiration_date && 'border-red-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.expiration_date && isValid(parseDateString(data.expiration_date)) ? (
                                        format(parseDateString(data.expiration_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.expiration_date)}
                                    onSelect={(date) => handleDateChange('expiration_date', date)}
                                    captionLayout="dropdown"
                                    fromYear={new Date().getFullYear()}
                                    toYear={new Date().getFullYear() + 20}
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>
                </FormSection>

                <FormSection title="Additional Notes" description="Add any relevant notes about the customer.">
                    <FormField label="Incharge By" htmlFor="incharger_name" error={formErrors.incharger_name} required>
                        <EntityCombobox
                            items={users}
                            value={data.incharger_name}
                            onChange={(value) => handleComboboxChange('incharger_name', value)}
                            processing={processing}
                            error={formErrors.incharger_name}
                            entityName="user"
                        />
                    </FormField>
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <Textarea
                            id="notes"
                            name="notes"
                            value={data.notes}
                            onChange={handleInputChange}
                            rows={4}
                            className={cn(formErrors.notes && 'border-red-500')}
                            placeholder="Enter any additional notes here..."
                        />
                    </FormField>
                </FormSection>

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
                                reset();
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create Visa Customer'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
