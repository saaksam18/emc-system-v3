import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VehicleMakerType } from '@/types'; // Assuming vehicleMakerType includes 'id'
import { useForm } from '@inertiajs/react';
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

// Define the expected structure for the form data, including the 'id'
// Omit 'id' from initial values but include it in the type definition for useForm
type vehicleMakerFormData = Omit<VehicleMakerType, 'id'>;

// --- Reusable Form Section Component (No changes needed) ---
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

// --- Reusable Form Field Component (No changes needed) ---
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
            {error && (
                // Use the htmlFor to link the error message to the input for accessibility
                <p id={`${htmlFor}-error`} className="mt-1 text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    </div>
);

// --- Main Edit Component ---
interface EditProps {
    vehicleMaker: VehicleMakerType | null; // Prop to receive the existing data
    onSubmitSuccess: () => void; // Callback on successful update
}

export function Edit({ vehicleMaker, onSubmitSuccess }: EditProps) {
    // Initialize the form with data from the vehicleMaker prop
    // Ensure is_rentable is treated as a boolean
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<vehicleMakerFormData>({
        name: vehicleMaker?.name || '',
    });

    // Effect to update the form state if the vehicleMaker prop changes
    // This is useful if the same form instance is reused for different items
    useEffect(() => {
        // Use setData to update form fields when the prop changes
        setData({
            name: vehicleMaker?.name || '',
        });
        clearErrors(); // Clear any previous errors when loading new data
        // Add setData to dependency array as per React hooks lint rules (optional but good practice)
    }, [vehicleMaker, setData, clearErrors]);

    /**
     * Handles input changes for standard text inputs and textareas.
     * @param e - The change event from the input/textarea element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof vehicleMakerFormData, value);
    };

    /**
     * Handles the form submission for updating the vehicle status.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        put(`/vehicles/settings/makers/${vehicleMaker?.id}/update`, {
            onSuccess: () => {
                clearErrors();
                onSubmitSuccess();
            },
            onError: (errorResponse) => {
                console.error('Error updating vehicle status:', errorResponse);
                toast.error('Failed to update vehicle status. Please check errors.');
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Cleanup effect to clear errors when the component unmounts
    useEffect(() => {
        return () => {
            clearErrors();
        };
    }, [clearErrors]);
    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="Edit Vehicle Status" description="Modify the details for the vehicle status.">
                    {/* --- Name Field --- */}
                    <FormField label="Name" htmlFor="name" error={errors.name} required>
                        <Input
                            id="name"
                            name="name"
                            value={data.name}
                            onChange={handleInputChange}
                            autoFocus
                            autoComplete="off"
                            className={cn(errors.name && 'border-red-500')}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
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
                        {/* Reset Button - Resets to original loaded values */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                // Reset now correctly resets to the initial values set by useForm
                                // which were derived from the *original* vehicleMaker prop
                                // or the last values set by setData in the useEffect hook if the prop changed.
                                reset();
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Changes
                        </Button>
                        {/* Submit Button --- */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Updating...' : 'Update'} {/* Updated text */}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component as default
export default Edit;
