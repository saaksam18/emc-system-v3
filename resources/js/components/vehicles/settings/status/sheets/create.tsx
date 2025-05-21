import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox component
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VehicleStatusType } from '@/types'; // Assuming VehicleClass type is defined/updated
import { useForm } from '@inertiajs/react';
import type { CheckedState } from '@radix-ui/react-checkbox'; // Import CheckedState type
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react'; // Added useEffect
import { toast } from 'sonner';

const initialFormValues: Omit<VehicleStatusType, 'id'> & { is_rentable: boolean } = {
    status_name: '',
    is_rentable: false,
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
        {/* Label for the field */}
        <Label htmlFor={htmlFor} className={cn('text-left md:text-right', labelClassName)}>
            {label}
            {required && <span className="text-red-500">*</span>} {/* Show asterisk if required */}
        </Label>
        {/* Content/Input area for the field */}
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {/* Note: Error display is handled within the main component for better accessibility linking */}
        </div>
    </div>
);

// --- Main Create Component ---
interface CreateProps {
    onSubmitSuccess: () => void; // Callback on successful creation
}

export function Create({ onSubmitSuccess }: CreateProps) {
    // Note: Ensure your VehicleClass type definition uses boolean for is_rentable
    // If the backend expects 'yes'/'no' or 1/0, you might need to transform the value before posting.
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<typeof initialFormValues>(initialFormValues);

    /**
     * Handles input changes for standard text inputs and textareas.
     * @param e - The change event from the input/textarea element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Use keyof typeof initialFormValues for better type safety if possible
        setData(name as keyof typeof initialFormValues, value);
    };

    /**
     * Handles changes specifically for the checkbox, accepting CheckedState.
     * Updates the form state based on the checkbox's checked status.
     * Treats 'indeterminate' state as false for the form data.
     * @param checked - The new checked state (true, false, or "indeterminate").
     */
    const handleCheckboxChange = (checked: CheckedState) => {
        // Convert CheckedState to boolean for form data.
        // Treat 'indeterminate' as false. Change if different logic is needed.
        const isChecked = checked === true;
        setData('is_rentable', isChecked);
    };

    /**
     * Handles the form submission.
     * Prevents default submission, sends data using Inertia's post method,
     * and handles success/error scenarios.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        post('/vehicles/settings/status/store', {
            onSuccess: () => {
                reset();
                clearErrors();
                onSubmitSuccess();
            },
            onError: (errorResponse) => {
                console.error('Error creating vehicle status:', errorResponse);
                toast.error('Failed to create vehicle status. Please check errors.');
            },
            preserveState: true,
        });
    };

    useEffect(() => {
        return () => {
            clearErrors();
        };
    }, [clearErrors]);
    return (
        <div className="px-4">
            {/* --- Form Submission Handler --- */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Information Section --- */}
                <FormSection title="Basic Information" description="Enter the basic details for the vehicle status.">
                    {/* --- Name Field --- */}
                    <FormField label="Name" htmlFor="status_name" error={errors.status_name} required>
                        {/* Input field for the name */}
                        <Input
                            id="status_name"
                            name="status_name"
                            value={data.status_name}
                            onChange={handleInputChange}
                            autoFocus // Focus this field on load
                            autoComplete="off"
                            className={cn(errors.status_name && 'border-red-500')} // Highlight if error
                            aria-invalid={!!errors.status_name} // Accessibility: indicate invalid field
                            aria-describedby={errors.status_name ? 'name-error' : undefined} // Accessibility: link error message
                        />
                        {/* Accessibility: Error message linked to input */}
                        {errors.status_name && (
                            <p id="name-error" className="mt-1 text-sm text-red-500">
                                {errors.status_name}
                            </p>
                        )}
                    </FormField>

                    {/* --- Description Field --- */}
                    <FormField label="Description" htmlFor="description" error={errors.description}>
                        {/* Input field for description (Consider Textarea for longer text) */}
                        <Input // Or use <Textarea rows={3} />
                            id="description"
                            name="description"
                            value={data.description}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(errors.description && 'border-red-500')} // Highlight if error
                            aria-invalid={!!errors.description} // Accessibility
                            aria-describedby={errors.description ? 'description-error' : undefined} // Accessibility
                        />
                        {/* Accessibility: Error message linked to input */}
                        {errors.description && (
                            <p id="description-error" className="mt-1 text-sm text-red-500">
                                {errors.description}
                            </p>
                        )}
                    </FormField>

                    {/* --- Rentable Field (Checkbox) --- */}
                    <FormField
                        label="Rentable"
                        htmlFor="is_rentable" // Match the Checkbox id
                        error={errors.is_rentable} // Pass error state (used for styling/aria)
                        // No 'required' visual cue needed for checkbox, rely on backend validation
                        contentClassName="flex items-center pt-1" // Align checkbox vertically with label, add padding top
                        required
                    >
                        {/* Container for the checkbox and optional label */}
                        <div className="flex items-center space-x-2">
                            {/* Checkbox component */}
                            <Checkbox
                                id="is_rentable"
                                name="is_rentable"
                                checked={data.is_rentable} // Bind checked state (boolean)
                                onCheckedChange={handleCheckboxChange} // Use updated handler
                                className={cn(errors.is_rentable && 'border-red-500')} // Highlight if error
                                aria-invalid={!!errors.is_rentable} // Accessibility
                                aria-describedby={errors.is_rentable ? 'rentable-error' : undefined} // Accessibility
                            />
                            {/* Optional: Add a label next to the checkbox for clarity */}
                            {/* <label htmlFor="is_rentable" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                 Mark as rentable
                             </label> */}
                        </div>
                        {/* Error message specifically for the checkbox field, displayed below */}
                        {errors.is_rentable && (
                            <p id="rentable-error" className="mt-1 text-sm text-red-500">
                                {errors.is_rentable}
                            </p>
                        )}
                    </FormField>
                </FormSection>

                {/* --- Form Actions --- */}
                <SheetFooter>
                    {/* Container for action buttons */}
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {/* --- Cancel Button (Closes Sheet) --- */}
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
                                reset(); // Reset form to initial values
                                clearErrors(); // Clear validation errors
                            }}
                            disabled={processing} // Disable while submitting
                        >
                            Reset
                        </Button>
                        {/* --- Submit Button --- */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create Vehicle Class'} {/* Dynamic button text */}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component as default
export default Create;
