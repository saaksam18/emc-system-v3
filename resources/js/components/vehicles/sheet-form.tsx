import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
// Removed unused User type import
import { Vehicle, VehicleClass, VehicleMakerType, VehicleModelType, VehicleStatusType } from '@/types';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
// Removed unused useRef import
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';

// --- Component Props Interface ---
interface SheetLayoutProps {
    mode: 'create' | 'edit';
    initialData: Vehicle | null;
    // Removed unused 'users' prop
    vehicle_class: VehicleClass[] | null | undefined;
    vehicle_models: VehicleModelType[];
    vehicle_makers: VehicleMakerType[];
    vehicle_status: VehicleStatusType[];
    onSubmitSuccess: () => void;
}

// --- Helper Function to Format Date String ---
const formatToYyyyMmDd = (dateString: string | null | undefined): string | undefined => {
    if (!dateString) return undefined;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string received for formatting:', dateString);
            return undefined;
        }
        return format(date, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error parsing/formatting date:', dateString, error);
        return undefined;
    }
};

export function SheetForm({
    mode,
    onSubmitSuccess,
    // Removed unused 'users' prop from destructuring
    vehicle_class,
    initialData,
    vehicle_status,
    vehicle_models,
    vehicle_makers,
}: SheetLayoutProps) {
    // Removed unused sheetContentRef

    // --- Calculate Initial Form Values (Raw) ---
    const initialFormValues = useMemo(() => {
        // This calculation remains the same
        return {
            vehicle_no: mode === 'edit' && initialData ? initialData.vehicle_no : '',
            make: mode === 'edit' && initialData ? initialData.make : '',
            model: mode === 'edit' && initialData ? initialData.model : '',
            year: mode === 'edit' && initialData ? initialData.year : '',
            license_plate: mode === 'edit' && initialData ? initialData.license_plate : '',
            vin: mode === 'edit' && initialData ? initialData.vin : '',
            color: mode === 'edit' && initialData ? initialData.color : '',
            engine_cc: mode === 'edit' && initialData ? initialData.engine_cc : '',
            vehicle_class_id: mode === 'edit' && initialData ? initialData.vehicle_class_id : '',
            compensation_price: mode === 'edit' && initialData ? initialData.compensation_price : '',
            purchase_price: mode === 'edit' && initialData ? initialData.purchase_price : '',
            purchase_date: mode === 'edit' && initialData ? initialData.purchase_date : undefined,
            daily_rental_price: mode === 'edit' && initialData ? initialData.daily_rental_price : '',
            weekly_rental_price: mode === 'edit' && initialData ? initialData.weekly_rental_price : '',
            monthly_rental_price: mode === 'edit' && initialData ? initialData.monthly_rental_price : '',
            current_status_id: mode === 'edit' && initialData ? initialData.current_status_id : '',
            current_location: mode === 'edit' && initialData ? initialData.current_location : '',
            notes: mode === 'edit' && initialData ? initialData.notes : '',
        };
    }, [mode, initialData]);

    // --- Format Initial Date for Form and Picker State ---
    const initialFormattedDateString = formatToYyyyMmDd(initialFormValues.purchase_date);
    const initialDateObject = initialFormattedDateString ? new Date(initialFormattedDateString + 'T00:00:00') : undefined;

    // --- Inertia Form Hook ---
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<Vehicle>({
        ...initialFormValues,
        purchase_date: initialFormattedDateString || '',
    });

    // --- State for Date Picker ---
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(initialDateObject);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // --- Effect to Reset Form and Date Picker on Prop Changes ---
    useEffect(() => {
        clearErrors();
        const rawDateString = mode === 'edit' && initialData ? initialData.purchase_date : undefined;
        const formattedDateString = formatToYyyyMmDd(rawDateString);
        const dateObject = formattedDateString ? new Date(formattedDateString + 'T00:00:00') : undefined;

        reset({
            ...initialFormValues,
            purchase_date: formattedDateString || '',
        });
        setPurchaseDate(dateObject);
        setIsDialogOpen(false);
    }, [mode, initialData, reset, clearErrors, initialFormValues]);

    // --- Process Vehicle Classes ---
    const validVehicleClass = useMemo<VehicleClass[]>(() => {
        return Array.isArray(vehicle_class)
            ? vehicle_class.filter((vClass): vClass is VehicleClass => vClass && typeof vClass.name === 'string' && vClass.name !== '')
            : [];
    }, [vehicle_class]);

    // --- Process Vehicle Makers ---
    const validVehicleMakers = useMemo<VehicleMakerType[]>(() => {
        return Array.isArray(vehicle_makers)
            ? vehicle_makers.filter((vMaker) => vMaker && typeof vMaker.name === 'string' && vMaker.name !== '')
            : [];
    }, [vehicle_makers]);

    // --- Process Vehicle Status ---
    const validVehicleStatus = useMemo<VehicleStatusType[]>(() => {
        return Array.isArray(vehicle_status)
            ? vehicle_status.filter(
                  (vStatus): vStatus is VehicleStatusType => vStatus && typeof vStatus.status_name === 'string' && vStatus.status_name !== '',
              )
            : [];
    }, [vehicle_status]);

    // --- Filter Models Based on Selected Make ---
    const availableModels = useMemo<VehicleModelType[]>(() => {
        const modelsArray = Array.isArray(vehicle_models) ? vehicle_models : [];
        if (!data.make || !validVehicleMakers.length || !modelsArray.length) {
            return [];
        }
        const selectedMaker = validVehicleMakers.find((maker) => maker.name === data.make);
        if (!selectedMaker) {
            return [];
        }
        return modelsArray.filter((model): model is VehicleModelType => {
            if (!model || typeof model.maker_id === 'undefined') return false;
            return String(model.maker_id) === String(selectedMaker.id);
        });
    }, [data.make, vehicle_models, validVehicleMakers]);

    // --- Handle Make Change ---
    const handleMakeChange = (value: string) => {
        setData((prevData) => ({
            ...prevData,
            make: value,
            model: '',
        }));
    };

    // --- Handle Date Select ---
    const handleDateSelect = (selectedDate: Date | undefined) => {
        const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
        setPurchaseDate(selectedDate);
        setData('purchase_date', formattedDate);
        setIsDialogOpen(false);
    };

    // --- Handle Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const url = mode === 'create' ? '/vehicles/register' : `/vehicles/${initialData?.id}/update`;

        const handleError = (formErrors: Record<string, string>) => {
            console.error(`${mode === 'create' ? 'Create' : 'Edit'} error:`, formErrors);
            if (formErrors && Object.keys(formErrors).length > 0) {
                Object.entries(formErrors).forEach(([field, errorMessage]) => {
                    if (errorMessage) {
                        toast.error(`${field}: ${errorMessage}`);
                    }
                });
            } else {
                toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} vehicle. Please check the details and try again.`);
            }
        };

        const handleSuccess = () => {
            onSubmitSuccess();
        };

        if (mode === 'create') {
            post(url, { onSuccess: handleSuccess, onError: handleError });
        } else if (initialData?.id) {
            put(url, { onSuccess: handleSuccess, onError: handleError });
        } else {
            console.error('Cannot submit edit form: Missing vehicle ID in initialData');
            toast.error('Cannot update vehicle: Missing ID.');
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

    return (
        // Removed unused ref from SheetContent
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
                            value={data.vehicle_no}
                            onChange={(e) => setData('vehicle_no', e.target.value)}
                            autoFocus={mode === 'create'}
                            autoComplete="off"
                            className={cn('col-span-3', errors.vehicle_no && 'border-red-500')}
                        />
                        {errors.vehicle_no && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vehicle_no}</p>}
                    </div>

                    {/* Make */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-make`} className="text-right">
                            Make*
                        </Label>
                        <Select
                            required
                            name="make"
                            value={data.make || ''}
                            onValueChange={handleMakeChange}
                            disabled={processing || validVehicleMakers.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-make`}
                                className={cn('col-span-3', errors.make && 'border-red-500')}
                                aria-label="Select maker"
                            >
                                <SelectValue placeholder="Select maker" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Maker</SelectLabel>
                                    {validVehicleMakers.map((vMaker) => (
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

                    {/* Model */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-model`} className="text-right">
                            Model*
                        </Label>
                        <Select
                            required
                            name="model"
                            value={data.model || ''}
                            onValueChange={(value) => setData('model', value)}
                            disabled={processing || !data.make || availableModels.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-model`}
                                className={cn('col-span-3', errors.model && 'border-red-500')}
                                aria-label="Select model"
                            >
                                <SelectValue placeholder={!data.make ? 'Select make first' : 'Select model'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Model</SelectLabel>
                                    {availableModels.map((vModel) => (
                                        <SelectItem key={vModel.id} value={vModel.name}>
                                            {vModel.name.charAt(0).toUpperCase() + vModel.name.slice(1)}
                                        </SelectItem>
                                    ))}
                                    {data.make && availableModels.length === 0 && (
                                        <SelectItem value="no-models" disabled>
                                            No models found for {data.make}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {errors.model && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.model}</p>}
                    </div>

                    {/* Year */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-year`} className="text-right">
                            Year*
                        </Label>
                        <Input
                            id={`${mode}-year`}
                            type="number"
                            value={data.year}
                            onChange={(e) => setData('year', e.target.value)}
                            className={cn('col-span-3', errors.year && 'border-red-500')}
                            min="1900"
                            max={new Date().getFullYear() + 1}
                        />
                        {errors.year && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.year}</p>}
                    </div>

                    {/* License Plate */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-license_plate`} className="text-right">
                            License Plate*
                        </Label>
                        <Input
                            id={`${mode}-license_plate`}
                            value={data.license_plate}
                            onChange={(e) => setData('license_plate', e.target.value)}
                            className={cn('col-span-3', errors.license_plate && 'border-red-500')}
                        />
                        {errors.license_plate && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.license_plate}</p>}
                    </div>

                    {/* VIN */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-vin`} className="text-right">
                            VIN
                        </Label>
                        <Input
                            id={`${mode}-vin`}
                            value={data.vin ?? ''}
                            onChange={(e) => setData('vin', e.target.value)}
                            className={cn('col-span-3', errors.vin && 'border-red-500')}
                        />
                        {errors.vin && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vin}</p>}
                    </div>

                    {/* Color */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-color`} className="text-right">
                            Color
                        </Label>
                        <Input
                            id={`${mode}-color`}
                            value={data.color ?? ''}
                            onChange={(e) => setData('color', e.target.value)}
                            className={cn('col-span-3', errors.color && 'border-red-500')}
                        />
                        {errors.color && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.color}</p>}
                    </div>

                    {/* Engine CC */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-engine_cc`} className="text-right">
                            Engine CC
                        </Label>
                        <Input
                            id={`${mode}-engine_cc`}
                            type="number"
                            value={data.engine_cc ?? ''}
                            onChange={(e) => setData('engine_cc', e.target.value)}
                            className={cn('col-span-3', errors.engine_cc && 'border-red-500')}
                            min="0"
                        />
                        {errors.engine_cc && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.engine_cc}</p>}
                    </div>

                    {/* Vehicle Class */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-vehicle_class_id`} className="text-right">
                            Class* {data.vehicle_class_id}
                        </Label>
                        <Select
                            required
                            name="vehicle_class_id"
                            value={data.vehicle_class_id || ''}
                            onValueChange={(value) => setData('vehicle_class_id', value)}
                            disabled={processing || validVehicleClass.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-vehicle_class_id`}
                                className={cn('col-span-3', errors.vehicle_class_id && 'border-red-500')}
                                aria-label="Select Class"
                            >
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Class</SelectLabel>
                                    {validVehicleClass.map((vClass) => (
                                        <SelectItem key={vClass.id} value={vClass.name}>
                                            {vClass.name.charAt(0).toUpperCase() + vClass.name.slice(1)}
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
                        {errors.vehicle_class_id && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vehicle_class_id}</p>}
                    </div>

                    {/* Compensation Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-compensation_price`} className="text-right">
                            Compensation Price
                        </Label>
                        <Input
                            id={`${mode}-compensation_price`}
                            type="number"
                            step="0.01"
                            value={data.compensation_price ?? ''}
                            onChange={(e) => setData('compensation_price', e.target.value)}
                            className={cn('col-span-3', errors.compensation_price && 'border-red-500')}
                            min="0"
                        />
                        {errors.compensation_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.compensation_price}</p>}
                    </div>

                    {/* Purchase Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-purchase_price`} className="text-right">
                            Purchase Price
                        </Label>
                        <Input
                            id={`${mode}-purchase_price`}
                            type="number"
                            step="0.01"
                            value={data.purchase_price ?? ''}
                            onChange={(e) => setData('purchase_price', e.target.value)}
                            className={cn('col-span-3', errors.purchase_price && 'border-red-500')}
                            min="0"
                        />
                        {errors.purchase_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.purchase_price}</p>}
                    </div>

                    {/* Purchase Date */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-purchase_date_trigger`} className="text-right">
                            Purchase Date
                        </Label>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    id={`${mode}-purchase_date_trigger`}
                                    variant={'outline'}
                                    type="button"
                                    className={cn(
                                        'col-span-3 w-full justify-start text-left font-normal',
                                        !purchaseDate && 'text-muted-foreground',
                                        errors.purchase_date ? 'border-red-500' : '',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {purchaseDate ? format(purchaseDate, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto">
                                <Calendar mode="single" selected={purchaseDate} onSelect={handleDateSelect} initialFocus />
                            </DialogContent>
                        </Dialog>
                        {errors.purchase_date && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.purchase_date}</p>}
                    </div>

                    {/* Daily Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-daily_rental_price`} className="text-right">
                            Daily Price*
                        </Label>
                        <Input
                            id={`${mode}-daily_rental_price`}
                            type="number"
                            step="0.01"
                            required
                            value={data.daily_rental_price}
                            onChange={(e) => setData('daily_rental_price', e.target.value)}
                            className={cn('col-span-3', errors.daily_rental_price && 'border-red-500')}
                            min="0"
                        />
                        {errors.daily_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.daily_rental_price}</p>}
                    </div>

                    {/* Weekly Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-weekly_rental_price`} className="text-right">
                            Weekly Price*
                        </Label>
                        <Input
                            id={`${mode}-weekly_rental_price`}
                            type="number"
                            step="0.01"
                            required
                            value={data.weekly_rental_price}
                            onChange={(e) => setData('weekly_rental_price', e.target.value)}
                            className={cn('col-span-3', errors.weekly_rental_price && 'border-red-500')}
                            min="0"
                        />
                        {errors.weekly_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.weekly_rental_price}</p>}
                    </div>

                    {/* Monthly Rental Price */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-monthly_rental_price`} className="text-right">
                            Monthly Price*
                        </Label>
                        <Input
                            id={`${mode}-monthly_rental_price`}
                            type="number"
                            step="0.01"
                            required
                            value={data.monthly_rental_price}
                            onChange={(e) => setData('monthly_rental_price', e.target.value)}
                            className={cn('col-span-3', errors.monthly_rental_price && 'border-red-500')}
                            min="0"
                        />
                        {errors.monthly_rental_price && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.monthly_rental_price}</p>}
                    </div>

                    {/* Current Status */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`${mode}-current_status_id`} className="text-right">
                            Status*
                        </Label>
                        <Select
                            required
                            name="current_status_id"
                            value={data.current_status_id || ''}
                            onValueChange={(value) => setData('current_status_id', value)}
                            disabled={processing || validVehicleStatus.length === 0}
                        >
                            <SelectTrigger
                                id={`${mode}-current_status_id`}
                                className={cn('col-span-3', errors.current_status_id && 'border-red-500')}
                                aria-label="Select status"
                            >
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Vehicle Status</SelectLabel>
                                    {validVehicleStatus.map((vStatus) => (
                                        <SelectItem key={vStatus.id} value={vStatus.status_name}>
                                            {vStatus.status_name.charAt(0).toUpperCase() + vStatus.status_name.slice(1)}
                                        </SelectItem>
                                    ))}
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
                        <Label htmlFor={`${mode}-current_location`} className="text-right">
                            Location
                        </Label>
                        <Input
                            id={`${mode}-current_location`}
                            value={data.current_location ?? ''}
                            onChange={(e) => setData('current_location', e.target.value)}
                            className={cn('col-span-3', errors.current_location && 'border-red-500')}
                            list={`${mode}-location-suggestions`}
                        />
                        <datalist id={`${mode}-location-suggestions`}>
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
                        <Label htmlFor={`${mode}-notes`} className="pt-2 text-right">
                            Notes
                        </Label>
                        <Textarea
                            id={`${mode}-notes`}
                            value={data.notes ?? ''}
                            onChange={(e) => setData('notes', e.target.value)}
                            className={cn('col-span-3', errors.notes && 'border-red-500')}
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
