import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Vendor } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';

// Define the shape of the form data.
type InitialFormValues = Omit<Vendor, 'id' | 'created_at' | 'updated_at'> & {
    notes: string;
};

// Define the shape for potential errors.
type FormErrors = Partial<Record<keyof InitialFormValues, string>>;

const initialFormValues: InitialFormValues = {
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
};

// Reusable Form Field Component
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

// Component Props
interface CreateProps {
    onSubmitSuccess: () => void;
}

// Main Create Component
export function Create({ onSubmitSuccess }: CreateProps) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<InitialFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as (HTMLInputElement | HTMLTextAreaElement) & { name: keyof InitialFormValues };
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const url = '/vendors/register'; // URL for creating vendors

        const handleError = (errs: Record<string, string>) => {
            console.error('Create error:', errs);
            if (errs && Object.keys(errs).length > 0) {
                Object.entries(errs).forEach(([, msg]) => {
                    if (msg) toast.error(msg);
                });
            } else {
                toast.error('Failed to create vendor. Please check the form.');
            }
        };

        const handleSuccess = () => {
            onSubmitSuccess();
        };

        post(url, {
            onSuccess: handleSuccess,
            onError: handleError,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const title = 'Create New Vendor';
    const description = "Fill in the details for the new vendor. Click save when you're done.";

    return (
        <div className="px-1 py-4 md:px-4">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField label="Name" htmlFor="create-name" error={formErrors.name} required>
                            <Input
                                id="create-name"
                                name="name"
                                value={data.name}
                                onChange={handleInputChange}
                                autoFocus
                                autoComplete="off"
                                className={cn(formErrors.name && 'border-red-500')}
                            />
                        </FormField>

                        <FormField label="Email" htmlFor="create-email" error={formErrors.email}>
                            <Input
                                id="create-email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={handleInputChange}
                                className={cn(formErrors.email && 'border-red-500')}
                            />
                        </FormField>

                        <FormField label="Phone" htmlFor="create-phone" error={formErrors.phone}>
                            <Input
                                id="create-phone"
                                name="phone"
                                value={data.phone}
                                onChange={handleInputChange}
                                className={cn(formErrors.phone && 'border-red-500')}
                            />
                        </FormField>

                        <FormField label="Address" htmlFor="create-address" error={formErrors.address} labelClassName="pt-2">
                            <Textarea
                                id="create-address"
                                name="address"
                                value={data.address}
                                onChange={handleInputChange}
                                className={cn('col-span-3', formErrors.address && 'border-red-500')}
                                rows={4}
                                placeholder="Enter vendor address..."
                            />
                        </FormField>
                        <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                            <Textarea
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
                    </CardContent>
                </Card>
                <SheetFooter className="mt-6 border-t pt-4">
                    <SheetClose asChild>
                        <Button type="button" variant="outline" disabled={processing}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Saving...' : 'Save Vendor'}
                    </Button>
                </SheetFooter>
            </form>
        </div>
    );
}

export default Create;
