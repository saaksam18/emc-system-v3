import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ContactTypes } from '@/types'; // Assuming ContactTypes type includes an 'id' field
import { useForm } from '@inertiajs/react';
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react'; // Added useEffect

// --- Reusable Form Section Component --- (Assuming this is defined elsewhere or kept)
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

// --- Reusable Form Field Component --- (Assuming this is defined elsewhere or kept)
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
    contactType: ContactTypes | null; // Pass the existing contact type data
    onSubmitSuccess: () => void; // Callback on successful update
}

// Use Omit to exclude 'id' if it's not directly editable but needed for the URL
// Or adjust InitialFormValues if your form structure differs slightly from ContactTypes
type InitialFormValues = Omit<ContactTypes, 'id' | 'created_at' | 'updated_at'>; // Example: Exclude non-editable fields

export function Edit({ contactType, onSubmitSuccess }: EditProps) {
    // Initialize useForm with the existing contactType data
    // Note: The initial values passed here are used by the reset() function later.
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<InitialFormValues>({
        name: contactType?.name || '',
        description: contactType?.description || '',
    });

    // Effect to update the form data if the contactType prop changes
    useEffect(() => {
        // Use setData for each field instead of reset({..})
        setData('name', contactType?.name || '');
        setData('description', contactType?.description || '');
        clearErrors(); // Clear errors when the item changes
        // Add setData to the dependency array as it's used in the effect
    }, [contactType, setData, clearErrors]);

    /**
     * Handles input changes and updates the form state.
     * @param e - The change event from the input element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof InitialFormValues, value);
    };

    /**
     * Handles the form submission for updating.
     * Prevents default submission, sends data using Inertia's put method,
     * and handles success/error scenarios.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault(); // Prevent default browser form submission

        // Construct the URL for the update request using the contactType's ID
        const updateUrl = `/customers/settings/types/${contactType?.id}/update`;
        console.log(updateUrl);
        put(updateUrl, {
            onSuccess: () => {
                clearErrors();
                onSubmitSuccess(); // Call the success callback
            },
            onError: (errorResponse) => {
                console.error('Error updating contact type:', errorResponse);
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <div className="px-4">
            {/* --- Form Submission Handler --- */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Information --- */}
                <FormSection title="Edit Contact Type" description="Update the details for the contact type.">
                    {/* --- Name Field --- */}
                    <FormField label="Name" htmlFor="name" error={errors.name} required>
                        <Input
                            id="name"
                            name="name"
                            value={data.name} // Bind to form state
                            onChange={handleInputChange}
                            autoFocus
                            autoComplete="off"
                            className={cn(errors.name && 'border-red-500')}
                        />
                    </FormField>

                    {/* --- Description Field --- */}
                    <FormField label="Description" htmlFor="description" error={errors.description}>
                        <Input
                            id="description"
                            name="description"
                            value={data.description} // Bind to form state
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(errors.description && 'border-red-500')}
                        />
                    </FormField>
                </FormSection>

                {/* --- Form Actions --- */}
                <SheetFooter>
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {/* --- Cancel Button --- */}
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </SheetClose>
                        {/* --- Reset Button --- */}
                        <Button
                            type="button"
                            variant="outline"
                            // Reset to the initial values the form was loaded with (from useForm init)
                            onClick={() => reset()}
                            disabled={processing}
                        >
                            Reset Changes
                        </Button>
                        {/* --- Submit Button --- */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Saving...' : 'Save Changes'} {/* Updated button text */}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component if it's the main export of the file
export default Edit;
