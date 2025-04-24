import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Removed unused imports: Command, Dialog, Select, countries, Check, ChevronsUpDown, Trash2
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ContactTypes } from '@/types'; // Assuming ContactTypes type is defined
import { useForm } from '@inertiajs/react';
// Removed unused import: Lucide icons that were previously removed
import React, { ChangeEvent, FormEventHandler } from 'react'; // Added ChangeEvent
import { toast } from 'sonner';
// Removed unused import: useState, useEffect, Customers, Contacts

// --- Type Definitions ---
// Use the imported ContactTypes directly if it matches the required structure
type InitialFormValues = ContactTypes;

// --- Define Initial Empty Form Values ---
// Initialize activeContacts with one primary contact object
const initialFormValues: InitialFormValues = {
    name: '',
    description: '',
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
            {required && <span className="text-red-500">*</span>} {/* Added asterisk styling */}
        </Label>
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Main Create Component ---
interface CreateProps {
    onSubmitSuccess: () => void; // Callback on successful creation
}

export function Create({ onSubmitSuccess }: CreateProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>(initialFormValues);

    /**
     * Handles input changes and updates the form state.
     * @param e - The change event from the input element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Added TextAreaElement for description if needed
        const { name, value } = e.target;
        setData(name as keyof InitialFormValues, value); // Use keyof for type safety
    };

    /**
     * Handles the form submission.
     * Prevents default submission, sends data using Inertia's post method,
     * and handles success/error scenarios.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault(); // Prevent default browser form submission
        // Assuming '/contact-types' is the endpoint to create a new contact type.
        // Adjust the URL as needed.

        post('/customers/settings/contact-type/register', {
            onSuccess: () => {
                reset(); // Reset form fields
                clearErrors(); // Clear any existing errors
                onSubmitSuccess(); // Call the success callback provided by the parent
            },
            onError: (errorResponse) => {
                console.error('Error creating contact type:', errorResponse);
                toast.error('Failed to create contact type. Please check errors.');
                // Errors are automatically populated into the `errors` object by useForm
            },
            preserveState: true, // Keep component state on validation errors
        });
    };

    return (
        <div className="px-4">
            {/* --- Form Submission Handler --- */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Information --- */}
                {/* Updated title and description to be more generic or specific to ContactTypes */}
                <FormSection title="Basic Information" description="Enter the basic infomations.">
                    {/* --- Name Field --- */}
                    <FormField label="Name" htmlFor="name" error={errors.name} required>
                        <Input
                            id="name"
                            name="name" // Corrected name attribute
                            value={data.name}
                            onChange={handleInputChange}
                            autoFocus
                            autoComplete="off"
                            className={cn(errors.name && 'border-red-500')} // Use errors object
                        />
                    </FormField>

                    {/* --- Description Field --- */}
                    <FormField label="Description" htmlFor="description" error={errors.description}>
                        {/* Consider using Textarea for longer descriptions */}
                        <Input
                            id="description"
                            name="description" // Corrected name attribute
                            value={data.description}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(errors.description && 'border-red-500')} // Use errors object
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
                            onClick={() => {
                                reset();
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset
                        </Button>
                        {/* --- Submit Button --- */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create'} {/* Updated button text */}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component if it's the main export of the file
export default Create;
