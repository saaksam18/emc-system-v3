import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Vehicle, VehicleClass, VehicleMakerType, VehicleModelType, VehicleStatusType, type User } from '@/types'; // Import your Vehicle type and assume User type
import { useForm } from '@inertiajs/react'; // Use Inertia's useForm
import { FormEventHandler, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

// --- Component Props Interface ---
interface SheetLayoutProps {
    mode: 'create' | 'edit';
    initialData: Vehicle | null;
    users: User[] | null | undefined; // Array of User objects for selection
    vehicle_class: VehicleClass[] | null | undefined; // Array of strings for vehicle classes
    vehicle_models: VehicleModelType[];
    vehicle_makers: VehicleMakerType[];
    vehicle_status: VehicleStatusType[];
    onSubmitSuccess: () => void;
}

export function SheetForm({
    mode,
    onSubmitSuccess,
    users,
    vehicle_class,
    initialData,
    vehicle_status,
    vehicle_models,
    vehicle_makers,
}: SheetLayoutProps) {
    // --- Calculate Initial Form Values with useMemo ---
    const initialFormValues: Vehicle = useMemo(() => {
        const values = {
            vehicle_no: mode === 'edit' && initialData ? initialData.vehicle_no : '',
            make: mode === 'edit' && initialData ? initialData.make : '',
            model: mode === 'edit' && initialData ? initialData.model : '',
            year: mode === 'edit' && initialData ? initialData.year : '',
            license_plate: mode === 'edit' && initialData ? initialData.license_plate : '',
            vin: mode === 'edit' && initialData ? initialData.vin : '',
            color: mode === 'edit' && initialData ? initialData.color : '',
            engine_cc: mode === 'edit' && initialData ? initialData.engine_cc : '',

            vehicle_class: mode === 'edit' && initialData ? initialData.vehicle_class_id : '',
            compensation_price: mode === 'edit' && initialData ? initialData.compensation_price : '',
            purchase_price: mode === 'edit' && initialData ? initialData.purchase_price : '',
            daily_rental_price: mode === 'edit' && initialData ? initialData.daily_rental_price : '',
            weekly_rental_price: mode === 'edit' && initialData ? initialData.weekly_rental_price : '',
            monthly_rental_price: mode === 'edit' && initialData ? initialData.monthly_rental_price : '',
            current_status_id: mode === 'edit' && initialData ? initialData.current_status_id : '',
            current_location: mode === 'edit' && initialData ? initialData.current_location : '',
            notes: mode === 'edit' && initialData ? initialData.notes : '',
        };
        return values;
    }, [mode, initialData]);
    // --- Inertia Form Hook ---
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<Vehicle>(initialFormValues);

    // --- Effect to Reset Form on Prop Changes ---
    useEffect(() => {
        clearErrors();
        reset(initialFormValues);
    }, [mode, initialData, reset, clearErrors, initialFormValues]); // Dependencies

    // --- Process Vehicle Classes ---
    const validVehicleClass = useMemo<string[]>(() => {
        if (!Array.isArray(vehicle_class)) {
            return [];
        }
        return vehicle_class.map((vClass) => vClass?.name).filter((name): name is string => typeof name === 'string' && name !== '');
    }, [vehicle_class]);

    // --- Process Vehicle Makers ---
    const validVehicleMakers = useMemo<VehicleMakerType[]>(() => {
        return Array.isArray(vehicle_makers)
            ? vehicle_makers.filter((vMaker) => vMaker && typeof vMaker.name === 'string' && vMaker.name !== '')
            : [];
    }, [vehicle_makers]);

    const validVehicleStatus = useMemo<string[]>(() => {
        if (!Array.isArray(vehicle_status)) {
            return [];
        }
        return vehicle_status
            .map((vStatus) => vStatus?.status_name)
            .filter((status_name): status_name is string => typeof status_name === 'string' && status_name !== '');
    }, [vehicle_status]);

    // --- Filter Models Based on Selected Make ---
    const availableModels = useMemo<VehicleModelType[]>(() => {
        // Ensure vehicle_models is an array before proceeding
        const modelsArray = Array.isArray(vehicle_models) ? vehicle_models : [];

        if (!data.make || !validVehicleMakers.length || !modelsArray.length) {
            // console.log("Condition not met (no make, makers, or models), returning []");
            return [];
        }

        // Find the selected maker object by name to get its ID
        const selectedMaker = validVehicleMakers.find((maker) => maker.name === data.make);
        // console.log("Selected maker object:", selectedMaker);

        if (!selectedMaker) {
            return []; // No matching maker found
        }

        // Filter models whose maker_id matches the selected maker's ID
        // Use the correct property name 'maker_id' from your data
        // Also, handle potential type mismatch (string vs number) for IDs
        const filtered = modelsArray.filter((model): model is VehicleModelType => {
            if (!model || typeof model.maker_id === 'undefined') return false; // Skip invalid model objects
            // Compare IDs, converting to string for safety if types might differ
            return String(model.maker_id) === String(selectedMaker.id);
        });

        // console.log("Filtered models:", filtered);
        return filtered;
    }, [data.make, vehicle_models, validVehicleMakers]); // Depend on validVehicleMakers instead of raw prop

    // --- Handle Make Change ---
    const handleMakeChange = (value: string) => {
        setData((prevData) => ({
            ...prevData,
            make: value,
            model: '', // Reset model when make changes
        }));
    };

    // --- Handle Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault(); // Prevent default form submission
        clearErrors(); // Clear previous inline errors

        const url = mode === 'create' ? '/vehicles/register' : `/vehicles/${initialData?.id}/update`; // Determine endpoint

        // Define the onError callback for both post and put
        const handleError = (formErrors: Record<string, string>) => {
            console.error(`${mode === 'create' ? 'Create' : 'Edit'} error:`, formErrors); // Log errors for debugging
            // Check if there are any validation errors returned
            if (formErrors && Object.keys(formErrors).length > 0) {
                // Iterate through the error messages and display a toast for each
                Object.values(formErrors).forEach((errorMessage) => {
                    if (errorMessage) {
                        // Ensure message exists
                        toast.error(errorMessage); // Display error using toast
                    }
                });
            } else {
                // Generic error if no specific field errors are returned
                toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} vehicle. Please try again.`);
            }
        };

        // Define the onSuccess callback
        const handleSuccess = () => {
            toast.success(`Vehicle successfully ${mode === 'create' ? 'created' : 'updated'}!`); // Success toast
            onSubmitSuccess(); // Call the success callback passed via props (e.g., close sheet)
            // Optionally reset form here if needed after success, though useEffect handles reset on mode/data change
            // reset();
        };

        // Perform POST or PUT request using Inertia
        if (mode === 'create') {
            post(url, {
                onSuccess: handleSuccess,
                onError: handleError, // Use the shared error handler
            });
        } else if (initialData?.id) {
            // Ensure ID exists for PUT request
            put(url, {
                onSuccess: handleSuccess,
                onError: handleError, // Use the shared error handler
            });
        } else {
            // Handle case where edit mode is active but ID is missing
            console.error('Cannot submit edit form: Missing vehicle ID in initialData');
            toast.error('Cannot update vehicle: Missing ID.'); // Inform user
        }
    };

    // --- Suggested Locations ---
    const suggestedLocations = ['With Customer', 'Front Garage', 'Rear Garage', 'Workshop'];

    // --- Dynamic Header Content ---
    const title = mode === 'create' ? 'Create New Vehicle' : `Edit Vehicle No. (${initialFormValues.vehicle_no || 'N/A'})`;
    const description =
        mode === 'create'
            ? "Fill in the details for the new vehicle. Click save when you're done."
            : "Update the vehicle details. Click save when you're done.";

    // --- Constant for "None" User ---
    const NONE_USER_VALUE = 'none';

    /* console.log('initialData', initialData);
    console.log('validVehicleStatus', validVehicleStatus);
    console.log('data', data); */
    return (
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit}>
                <div className="grid gap-4 p-4">
                    {/* Vehicle No */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-vehicle_no`} className="text-right">
                            Vehicle No*
                        </Label>
                        <Input
                            id={`${mode}-vehicle_no`}
                            value={data.vehicle_no} // Bind directly
                            onChange={(e) => setData('vehicle_no', e.target.value)}
                            autoFocus={mode === 'create'}
                            autoComplete="vehicle_no"
                            className={`col-span-3 ${errors.vehicle_no ? 'border-red-500' : ''}`}
                        />
                        {errors.vehicle_no && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vehicle_no}</p>}
                    </div>

                    {/* Make (Select Dropdown) */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-make`} className="text-right">
                            Make*
                        </Label>
                        <Select
                            required
                            name="make"
                            value={data.make || ''} // Ensure value is controlled
                            onValueChange={handleMakeChange} // Use the new handler
                            disabled={processing || validVehicleMakers.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-make`}
                                className={`col-span-3 ${errors.make ? 'border-red-500' : ''}`}
                                aria-label="Select maker"
                            >
                                <SelectValue placeholder="Select maker" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Maker</SelectLabel>
                                    {validVehicleMakers.map((vMaker) => (
                                        // Use maker name as value, assuming it's unique and matches data.make
                                        <SelectItem key={vMaker.id} value={vMaker.name}>
                                            {vMaker.name.charAt(0).toUpperCase() + vMaker.name.slice(1)}
                                        </SelectItem>
                                    ))}
                                    {validVehicleMakers.length === 0 && (
                                        <SelectItem value="no-makers" disabled>
                                            No makers available
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.make && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.make}</p>}
                    </div>

                    {/* Model (Dependent Select Dropdown) */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-model`} className="text-right">
                            Model*
                        </Label>
                        <Select
                            required
                            name="model"
                            value={data.model || ''} // Ensure value is controlled
                            onValueChange={(value) => setData('model', value)}
                            // Disable if processing, no make selected, or no models available for the selected make
                            disabled={processing || !data.make || availableModels.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-model`}
                                className={`col-span-3 ${errors.model ? 'border-red-500' : ''}`}
                                aria-label="Select model"
                            >
                                <SelectValue placeholder={!data.make ? 'Select make first' : 'Select model'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Model</SelectLabel>
                                    {availableModels.map((vModel) => (
                                        // Use model name as value, assuming it's unique for the make
                                        <SelectItem key={vModel.id} value={vModel.name}>
                                            {vModel.name.charAt(0).toUpperCase() + vModel.name.slice(1)}
                                        </SelectItem>
                                    ))}
                                    {/* Show disabled item if make is selected but no models exist */}
                                    {data.make && availableModels.length === 0 && (
                                        <SelectItem value="no-models" disabled>
                                            No models found for {data.make}
                                        </SelectItem>
                                    )}
                                    {/* Optional: Handle case where make isn't selected yet (covered by disabled state) */}
                                    {/* {!data.make && (
                                        <SelectItem value="select-make" disabled>
                                            Select make first
                                        </SelectItem>
                                    )} */}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.model && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.model}</p>}
                    </div>

                    {/* Year */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right">
                            Year*
                        </Label>
                        <Input
                            id="year"
                            type="number"
                            value={data.year} // Bind directly (Input handles number/string)
                            onChange={(e) => setData('year', e.target.value)}
                            className={`col-span-3 ${errors.year ? 'border-red-500' : ''}`}
                            min="1900"
                            max={new Date().getFullYear() + 1}
                        />
                        {errors.year && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.year}</p>}
                    </div>

                    {/* License Plate */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="license_plate" className="text-right">
                            License Plate*
                        </Label>
                        <Input
                            id="license_plate"
                            value={data.license_plate} // Bind directly
                            onChange={(e) => setData('license_plate', e.target.value)}
                            className={`col-span-3 ${errors.license_plate ? 'border-red-500' : ''}`}
                        />
                        {errors.license_plate && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.license_plate}</p>}
                    </div>

                    {/* VIN */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vin" className="text-right">
                            VIN
                        </Label>
                        <Input
                            id="vin"
                            value={data.vin} // Bind directly
                            onChange={(e) => setData('vin', e.target.value || '')} // Keep setting empty string if cleared
                            className={`col-span-3 ${errors.vin ? 'border-red-500' : ''}`}
                        />
                        {errors.vin && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vin}</p>}
                    </div>

                    {/* Color */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">
                            Color
                        </Label>
                        <Input
                            id="color"
                            value={data.color} // Bind directly
                            onChange={(e) => setData('color', e.target.value || '')}
                            className={`col-span-3 ${errors.color ? 'border-red-500' : ''}`}
                        />
                        {errors.color && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.color}</p>}
                    </div>

                    {/* Engine CC */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="engine_cc" className="text-right">
                            Engine CC
                        </Label>
                        <Input
                            id="engine_cc"
                            type="number"
                            value={data.engine_cc} // Bind directly
                            onChange={(e) => setData('engine_cc', e.target.value)}
                            className={`col-span-3 ${errors.engine_cc ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.engine_cc && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.engine_cc}</p>}
                    </div>

                    {/* Vehicle Class (Select Dropdown) */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vehicle_class" className="text-right">
                            Class
                        </Label>
                        <Select
                            required
                            name="vehicle_class"
                            value={data.vehicle_class} // Handle null for Select value
                            onValueChange={(value) => setData('vehicle_class', value)} // Set null if placeholder selected
                            disabled={processing || validVehicleClass.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-vehicle_class`}
                                className={`col-span-3 ${errors.vehicle_class ? 'border-red-500' : ''}`}
                                aria-label="Select Class"
                            >
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Class</SelectLabel>
                                    {validVehicleClass.map((vClass) => (
                                        <SelectItem key={vClass} value={vClass}>
                                            {vClass.charAt(0).toUpperCase() + vClass.slice(1)}
                                        </SelectItem>
                                    ))}
                                    {validVehicleClass.length === 0 && (
                                        <SelectItem value="no-classes" disabled>
                                            No classes available
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.vehicle_class && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vehicle_class}</p>}
                    </div>

                    {/* Compensation Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="compensation_price" className="text-right">
                            Compensation Price
                        </Label>
                        <Input
                            id="compensation_price"
                            type="number"
                            step="0.01"
                            value={data.compensation_price} // Bind directly
                            onChange={(e) => setData('compensation_price', e.target.value)}
                            className={`col-span-3 ${errors.compensation_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.compensation_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.compensation_price}</p>}
                    </div>

                    {/* Purchase Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="purchase_price" className="text-right">
                            Purchase Price
                        </Label>
                        <Input
                            id="purchase_price"
                            type="number"
                            step="0.01"
                            value={data.purchase_price} // Bind directly
                            onChange={(e) => setData('purchase_price', e.target.value)}
                            className={`col-span-3 ${errors.purchase_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.purchase_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.purchase_price}</p>}
                    </div>

                    {/* Daily Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="daily_rental_price" className="text-right">
                            Daily Price*
                        </Label>
                        <Input
                            id="daily_rental_price"
                            type="number"
                            step="0.01"
                            value={data.daily_rental_price} // Bind directly
                            onChange={(e) => setData('daily_rental_price', e.target.value)}
                            className={`col-span-3 ${errors.daily_rental_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.daily_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.daily_rental_price}</p>}
                    </div>

                    {/* Weekly Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="weekly_rental_price" className="text-right">
                            Weekly Price*
                        </Label>
                        <Input
                            id="weekly_rental_price"
                            type="number"
                            step="0.01"
                            value={data.weekly_rental_price} // Bind directly
                            onChange={(e) => setData('weekly_rental_price', e.target.value)}
                            className={`col-span-3 ${errors.weekly_rental_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.weekly_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.weekly_rental_price}</p>}
                    </div>

                    {/* Monthly Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monthly_rental_price" className="text-right">
                            Monthly Price*
                        </Label>
                        <Input
                            id="monthly_rental_price"
                            type="number"
                            step="0.01"
                            value={data.monthly_rental_price} // Bind directly
                            onChange={(e) => setData('monthly_rental_price', e.target.value)}
                            className={`col-span-3 ${errors.monthly_rental_price ? 'border-red-500' : ''}`}
                            min="0"
                        />
                        {errors.monthly_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.monthly_rental_price}</p>}
                    </div>

                    {/* Current Status (Select Dropdown - Updated) */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-current_status_id`} className="text-right">
                            Status*
                        </Label>
                        <Select
                            required
                            name="current_status_id"
                            // Value should be the string representation of the status ID
                            value={data.current_status_id}
                            // Ensure the value passed to setData matches the type expected (string ID)
                            onValueChange={(value) => setData('current_status_id', value)}
                            disabled={processing || validVehicleStatus.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-current_status_id`}
                                className={`col-span-3 ${errors.current_status_id ? 'border-red-500' : ''}`}
                                aria-label="Select status"
                            >
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Status</SelectLabel>
                                    {/* Map over the processed status array */}
                                    {validVehicleStatus.map((vStatus) => (
                                        // Use status ID as value (converted to string) and status name as display text
                                        <SelectItem key={vStatus} value={vStatus}>
                                            {vStatus.charAt(0).toUpperCase() + vStatus.slice(1)}
                                        </SelectItem>
                                    ))}
                                    {/* Show disabled item if no statuses are available */}
                                    {validVehicleStatus.length === 0 && (
                                        <SelectItem value="no-status" disabled>
                                            No statuses available
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.current_status_id && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.current_status_id}</p>}
                    </div>

                    {/* Current Location */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current_location" className="text-right">
                            Location
                        </Label>
                        <Input
                            id="current_location"
                            value={data.current_location} // Bind directly
                            onChange={(e) => setData('current_location', e.target.value || '')}
                            className={`col-span-3 ${errors.current_location ? 'border-red-500' : ''}`}
                            list="location-suggestions"
                        />
                        <datalist id="location-suggestions">
                            {suggestedLocations.map((loc) => (
                                <option key={loc} value={loc} />
                            ))}
                        </datalist>
                        {errors.current_location && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.current_location}</p>}
                        <p className="text-muted-foreground col-span-3 col-start-2 text-xs">
                            Type or select a location (e.g., With Customer, Front Garage).
                        </p>
                    </div>

                    {/* Notes */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="notes" className="pt-2 text-right">
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            value={data.notes} // Bind directly
                            onChange={(e) => setData('notes', e.target.value || '')}
                            className={`col-span-3 ${errors.notes ? 'border-red-500' : ''}`}
                            rows={3}
                        />
                        {errors.notes && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.notes}</p>}
                    </div>
                </div>
                {/* Footer */}
                <SheetFooter className="mt-4 border-t p-4">
                    <SheetClose asChild>
                        <Button type="button" variant="outline" disabled={processing}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Saving...' : 'Save changes'}
                    </Button>
                </SheetFooter>
            </form>
        </SheetContent>
    );
}
