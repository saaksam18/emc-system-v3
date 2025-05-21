import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VehicleStatusType } from '@/types'; // Assuming VehicleStatusType includes 'id' and 'is_rentable' (potentially boolean or number 0/1)
import { useForm } from '@inertiajs/react';
import type { CheckedState } from '@radix-ui/react-checkbox';
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

// Define the expected structure for the form data
// Ensure is_rentable is treated as boolean within the form state
type VehicleStatusFormData = Omit<VehicleStatusType, 'id' | 'is_rentable'> & {
    is_rentable: boolean;
};

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
                <p id={`${htmlFor}-error`} className="mt-1 text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    </div>
);

// --- Main Edit Component ---
interface EditProps {
    vehicleStatus: VehicleStatusType | null; // Prop to receive the existing data
    onSubmitSuccess: () => void; // Callback on successful update
}

export function Edit({ vehicleStatus, onSubmitSuccess }: EditProps) {
    // Helper function to determine the boolean state for is_rentable
    // Handles boolean true/false and number 1/0 commonly used
    const getIsRentableBoolean = (value: any): boolean => {
        return value === true || value === 1;
    };

    // Initialize the form state
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<VehicleStatusFormData>({
        status_name: vehicleStatus?.status_name || '',
        // Explicitly check for true or 1 for the initial value
        is_rentable: vehicleStatus ? getIsRentableBoolean(vehicleStatus.is_rentable) : false,
        description: vehicleStatus?.description || '',
    });

    // Effect to update the form state if the vehicleStatus prop changes
    useEffect(() => {
        if (vehicleStatus) {
            const isRentableValue = getIsRentableBoolean(vehicleStatus.is_rentable);
            setData({
                status_name: vehicleStatus.status_name || '',
                is_rentable: isRentableValue,
                description: vehicleStatus.description || '',
            });
        } else {
            setData({
                status_name: '',
                is_rentable: false,
                description: '',
            });
        }
        // Clear errors when loading new data or resetting
        clearErrors();
        // Dependencies: trigger effect if prop or setData/clearErrors references change
    }, [vehicleStatus, setData, clearErrors]);

    /**
     * Handles input changes for standard text inputs and textareas.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof VehicleStatusFormData, value);
    };

    /**
     * Handles changes specifically for the checkbox.
     */
    const handleCheckboxChange = (checked: CheckedState) => {
        // checked can be true, false, or 'indeterminate'. We only care about true/false.
        const isChecked = checked === true;
        setData('is_rentable', isChecked);
    };

    /**
     * Handles the form submission for updating the vehicle status.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        if (!vehicleStatus?.id) {
            toast.error('Cannot update: Vehicle Status ID is missing.');
            console.error('Missing vehicleStatus.id for update');
            return; // Prevent submission if ID is missing
        }
        // PUT request to the update endpoint
        put(route('vehicles.settings.status.update', { id: vehicleStatus.id }), {
            // Ensure route generation is correct
            onSuccess: () => {
                toast.success('Vehicle status updated successfully!');
                onSubmitSuccess(); // Call the success callback (e.g., close sheet)
                // No need to clearErrors here, onSuccess implies no errors
            },
            onError: (errorResponse) => {
                console.error('Error updating vehicle status:', errorResponse);
                // Errors are automatically populated into the `errors` object by Inertia
                toast.error('Failed to update vehicle status. Please review errors.');
            },
            // preserveState: true, // Keep state unless redirecting
            preserveScroll: true, // Keep scroll position
        });
    };

    // Cleanup effect (optional but good practice)
    useEffect(() => {
        return () => {
            // Clear errors when the component unmounts
            // clearErrors(); // Might be redundant if errors are cleared elsewhere appropriately
        };
    }, [clearErrors]);

    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="Edit Vehicle Status" description="Modify the details for the vehicle status.">
                    {/* --- Name Field --- */}
                    <FormField label="Name" htmlFor="status_name" error={errors.status_name} required>
                        <Input
                            id="status_name"
                            name="status_name"
                            value={data.status_name}
                            onChange={handleInputChange}
                            autoFocus
                            autoComplete="off"
                            className={cn(errors.status_name && 'border-red-500')}
                            aria-invalid={!!errors.status_name}
                            aria-describedby={errors.status_name ? 'status_name-error' : undefined}
                        />
                    </FormField>

                    {/* --- Description Field --- */}
                    <FormField label="Description" htmlFor="description" error={errors.description}>
                        <Input // Consider using <Textarea rows={3} /> if description can be long
                            id="description"
                            name="description"
                            value={data.description ?? ''} // Ensure value is not null/undefined for input
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(errors.description && 'border-red-500')}
                            aria-invalid={!!errors.description}
                            aria-describedby={errors.description ? 'description-error' : undefined}
                        />
                    </FormField>

                    {/* --- Rentable Field (Checkbox) --- */}
                    <FormField
                        label="Rentable"
                        htmlFor="is_rentable"
                        error={errors.is_rentable} // Error message for the boolean field
                        contentClassName="flex items-center pt-1"
                        // `required` attribute isn't standard for checkbox groups,
                        // rely on backend validation and error display.
                    >
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_rentable"
                                name="is_rentable"
                                checked={data.is_rentable} // Bind checked state to form data
                                onCheckedChange={handleCheckboxChange} // Update form data on change
                                className={cn(errors.is_rentable && 'border-red-500')} // Style if error
                                aria-invalid={!!errors.is_rentable}
                                aria-describedby={errors.is_rentable ? 'is_rentable-error' : undefined}
                            />
                            {/* Optional: Add a label right next to the checkbox if needed */}
                            {/* <label htmlFor="is_rentable" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"> */}
                            {/* Mark as rentable */}
                            {/* </label> */}
                        </div>
                        {/* Error message is now handled by the FormField component */}
                    </FormField>
                </FormSection>

                <SheetFooter>
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {/* Cancel Button */}
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
                                // reset() reverts to the initial values passed to useForm
                                reset();
                                clearErrors(); // Clear any validation errors shown
                                toast.info('Changes reset to original values.');
                            }}
                            disabled={processing}
                        >
                            Reset Changes
                        </Button>

                        {/* Submit Button */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Updating...' : 'Update Status'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component as default
export default Edit;
