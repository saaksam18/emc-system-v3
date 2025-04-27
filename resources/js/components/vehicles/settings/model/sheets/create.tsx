import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VehicleMakerType, VehicleModelType } from '@/types'; // Assuming VehicleMakerType is defined
import { useForm } from '@inertiajs/react';
import React, { ChangeEvent, FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

// Define the shape of the form data, including the new vehicle_maker_id
interface VehicleModelFormData {
    name: string;
    maker_id: string;
}

// Initial values for the form
const initialFormValues: VehicleModelType = {
    name: '',
    maker_id: '',
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
            {/* Display error message if present */}
            {error && (
                <p id={`${htmlFor}-error`} className="mt-1 text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    </div>
);

// --- Main Create Component ---
interface CreateProps {
    // Expect an array of vehicle makers for the dropdown
    vehicleMakers: VehicleMakerType[] | null;
    onSubmitSuccess: () => void; // Callback on successful creation
}

// Renamed component slightly to reflect creating a Model
export function CreateVehicleModel({ vehicleMakers, onSubmitSuccess }: CreateProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<VehicleModelType>(initialFormValues);

    /**
     * Handles input changes for standard text inputs and textareas.
     * @param e - The change event from the input/textarea element.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof VehicleModelFormData, value);
    };

    /**
     * Handles value changes for the Select component.
     * @param value - The selected value (should be the maker's ID).
     */
    const handleSelectChange = (value: string) => {
        setData('maker_id', value);
        // Clear potential error for this field when a selection is made
        if (errors.maker_id) {
            clearErrors('maker_id');
        }
    };

    /**
     * Handles the form submission.
     * Prevents default submission, sends data using Inertia's post method,
     * and handles success/error scenarios.
     * @param e - The form event.
     */
    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        // Endpoint suggests creating a model, which belongs to a maker
        post('/vehicles/settings/models/store', {
            onSuccess: () => {
                reset(); // Reset form fields
                clearErrors(); // Clear any validation errors
                onSubmitSuccess(); // Call the success callback
            },
            onError: (errorResponse) => {
                console.error('Error creating vehicle model:', errorResponse);
                toast.error('Failed to create vehicle model. Please check errors.'); // Error notification
            },
            preserveState: true, // Preserve component state on validation errors
        });
    };

    // Effect to clear errors when the component unmounts
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
                <FormSection title="Vehicle Model Information" description="Enter the details for the new vehicle model.">
                    {/* --- Vehicle Maker Selection Field --- */}
                    <FormField label="Maker" htmlFor="maker_id" error={errors.maker_id} required>
                        <Select
                            value={data.maker_id}
                            onValueChange={handleSelectChange} // Use specific handler for Select
                            name="maker_id" // Important for form context, though value is handled by onValueChange
                        >
                            <SelectTrigger
                                id="maker_id"
                                className={cn(errors.maker_id && 'border-red-500')}
                                aria-invalid={!!errors.maker_id}
                                aria-describedby={errors.maker_id ? 'maker_id-error' : undefined}
                            >
                                <SelectValue placeholder="Select a vehicle maker" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* Map over the vehicleMakers array to create options */}
                                {vehicleMakers?.map((maker) => (
                                    <SelectItem key={maker.id} value={String(maker.id)}>
                                        {' '}
                                        {/* Ensure value is string */}
                                        {maker.name}
                                    </SelectItem>
                                ))}
                                {/* Add a message if no makers are available */}
                                {vehicleMakers?.length === 0 && (
                                    <div className="text-muted-foreground p-4 text-center text-sm">No vehicle makers found.</div>
                                )}
                            </SelectContent>
                        </Select>
                        {/* Error message is now handled within FormField */}
                    </FormField>

                    {/* --- Name Field --- */}
                    <FormField label="Model Name" htmlFor="name" error={errors.name} required>
                        <Input
                            id="name"
                            name="name"
                            value={data.name}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={cn(errors.name && 'border-red-500')}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                        />
                        {/* Error message is now handled within FormField */}
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
                                reset();
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset
                        </Button>
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            {processing ? 'Creating...' : 'Create Vehicle Model'} {/* Updated button text */}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}

// Export the component as default
export default CreateVehicleModel;
