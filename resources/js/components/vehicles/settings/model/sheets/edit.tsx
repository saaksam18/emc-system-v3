import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VehicleMakerType, VehicleModelType } from '@/types'; // Assuming vehicleMakerType includes 'id'
import { useForm } from '@inertiajs/react';
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

// Define the expected structure for the form data, including the 'id'
// Omit 'id' from initial values but include it in the type definition for useForm
type vehicleModelFormData = Omit<VehicleModelType, 'id'> & {
    maker_id: string; // Ensure maker_id is always a string in the form data type
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
    vehicleMakers: VehicleMakerType[] | null;
    vehicleModel: VehicleModelType | null; // Prop to receive the existing data
    onSubmitSuccess: () => void; // Callback on successful update
}

export function Edit({ vehicleMakers, vehicleModel, onSubmitSuccess }: EditProps) {
    // Initialize the form with data from the vehicleModel prop
    // *FIX: Ensure maker_id is initialized as a string*
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<vehicleModelFormData>({
        maker_id: vehicleModel?.maker_id ? String(vehicleModel.maker_id) : '', // Convert to string
        name: vehicleModel?.name || '',
    });

    // Effect to update the form state if the vehicleModel prop changes
    useEffect(() => {
        // *FIX: Ensure maker_id is set as a string*
        setData({
            name: vehicleModel?.name || '',
            maker_id: vehicleModel?.maker_id ? String(vehicleModel.maker_id) : '', // Convert to string
        });
        clearErrors();
    }, [vehicleModel, setData, clearErrors]); // Dependencies remain the same

    /**
     * Handles input changes for standard text inputs and textareas.
     * @param e - The change event from the input/textarea element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Ensure the correct type is inferred for setData
        setData(name as keyof Omit<vehicleModelFormData, 'maker_id'>, value);
    };

    /**
     * Handles changes in the Select component.
     * The value received from onValueChange is already a string.
     * @param value - The selected string value.
     */
    const handleSelectChange = (value: string) => {
        setData('maker_id', value); // Value is already a string
        if (errors.maker_id) {
            clearErrors('maker_id');
        }
    };

    /**
     * Handles the form submission for updating the vehicle model.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        // The `put` request sends the data object.
        // Ensure your backend expects maker_id potentially as a string or handle conversion there if needed.
        put(`/vehicles/settings/models/${vehicleModel?.id}/update`, {
            onSuccess: () => {
                clearErrors();
                onSubmitSuccess();
            },
            onError: (errorResponse) => {
                console.error('Error updating vehicle model:', errorResponse);
                // Display specific errors if available, otherwise generic message
                const errorMessages = Object.values(errorResponse).join(' ');
                toast.error(`Failed to update vehicle model: ${errorMessages || 'Please check the details.'}`);
            },
            preserveState: true, // Keep component state on validation errors
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
                <FormSection title="Edit Vehicle Model" description="Modify the details for the vehicle model.">
                    {/* --- Vehicle Maker Selection Field --- */}
                    <FormField label="Maker" htmlFor="maker_id" error={errors.maker_id} required>
                        <Select
                            // Value should be the string ID from the form data
                            value={data.maker_id}
                            onValueChange={handleSelectChange}
                            name="maker_id" // Name attribute is good practice but not strictly needed for controlled Select
                        >
                            <SelectTrigger
                                id="maker_id"
                                className={cn(errors.maker_id && 'border-red-500')}
                                aria-invalid={!!errors.maker_id}
                                aria-describedby={errors.maker_id ? 'maker_id-error' : undefined}
                            >
                                {/* Display selected value or placeholder */}
                                <SelectValue placeholder="Select a vehicle maker" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Option for placeholder/unselected state if needed */}
                                {/* <SelectItem value="">Select a vehicle maker</SelectItem> */}
                                {vehicleMakers?.map((maker) => (
                                    // Key should be unique, value must be string
                                    <SelectItem key={maker.id} value={String(maker.id)}>
                                        {maker.name}
                                    </SelectItem>
                                ))}
                                {(!vehicleMakers || vehicleMakers.length === 0) && (
                                    <div className="text-muted-foreground p-4 text-center text-sm">No vehicle makers found.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </FormField>

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
                        {/* Reset Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                // Reset to the *initial* values provided to useForm
                                // which now correctly converts maker_id to string
                                reset();
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Changes
                        </Button>
                        {/* Submit Button --- */}
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Updating...' : 'Update'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component as default
export default Edit;
