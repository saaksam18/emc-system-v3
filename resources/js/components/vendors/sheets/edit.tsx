import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Vendor } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

// Define the shape of the form data.
type FormValues = Omit<Vendor, 'id' | 'created_at' | 'updated_at'>;

// Define the shape for potential errors.
type FormErrors = Partial<Record<keyof FormValues, string>>;

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
interface EditProps {
    vendor: Vendor;
    onSubmitSuccess: () => void;
}

// Main Edit Component
export function Edit({ vendor, onSubmitSuccess }: EditProps) {
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<FormValues>({
        name: vendor.name === 'N/A' ? '' : vendor.name || '',
        email: vendor.email === 'N/A' ? '' : vendor.email || '',
        phone: vendor.phone === 'N/A' ? '' : vendor.phone || '',
        address: vendor.address === 'N/A' ? '' : vendor.address || '',
    });
    const formErrors = errors as FormErrors;

    useEffect(() => {
        setData({
            name: vendor.name === 'N/A' ? '' : vendor.name || '',
            email: vendor.email === 'N/A' ? '' : vendor.email || '',
            phone: vendor.phone === 'N/A' ? '' : vendor.phone || '',
            address: vendor.address === 'N/A' ? '' : vendor.address || '',
        });
    }, [vendor]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as (HTMLInputElement | HTMLTextAreaElement) & { name: keyof FormValues };
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const url = `/vendors/${vendor.id}/update`; // URL for updating vendors

        const handleError = (errs: Record<string, string>) => {
            console.error('Update error:', errs);
            if (errs && Object.keys(errs).length > 0) {
                Object.entries(errs).forEach(([, msg]) => {
                    if (msg) toast.error(msg);
                });
            } else {
                toast.error('Failed to update vendor. Please check the form.');
            }
        };

        const handleSuccess = () => {
            onSubmitSuccess();
        };

        put(url, {
            onSuccess: handleSuccess,
            onError: handleError,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const title = 'Edit Vendor';
    const description = "Update the vendor's details. Click save when you're done.";

    return (
        <div className="px-1 py-4 md:px-4">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField label="Name" htmlFor="edit-name" error={formErrors.name} required>
                            <Input
                                id="edit-name"
                                name="name"
                                value={data.name}
                                onChange={handleInputChange}
                                autoFocus
                                autoComplete="off"
                                className={cn(formErrors.name && 'border-red-500')}
                            />
                        </FormField>

                        <FormField label="Email" htmlFor="edit-email">
                            <Input id="edit-email" name="email" type="email" value={data.email} onChange={handleInputChange} />
                        </FormField>

                        <FormField label="Phone" htmlFor="edit-phone">
                            <Input id="edit-phone" name="phone" value={data.phone} onChange={handleInputChange} />
                        </FormField>

                        <FormField label="Address" htmlFor="edit-address" labelClassName="pt-2">
                            <Textarea
                                id="edit-address"
                                name="address"
                                value={data.address}
                                onChange={handleInputChange}
                                className="col-span-3"
                                rows={4}
                                placeholder="Enter vendor address..."
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
                        {processing ? 'Saving...' : 'Save Changes'}
                    </Button>
                </SheetFooter>
            </form>
        </div>
    );
}

export default Edit;
