import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Vehicle, VehicleClass, VehicleMakerType, VehicleModelType, VehicleStatusType } from '@/types';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';

interface SheetLayoutProps {
    mode: 'create' | 'edit';
    initialData: Vehicle | null;
    vehicle_class: VehicleClass[] | null | undefined;
    vehicle_models: VehicleModelType[];
    vehicle_makers: VehicleMakerType[];
    vehicle_status: VehicleStatusType[];
    onSubmitSuccess: () => void;
}

const formatYMD = (dateString: string | null | undefined) => {
    if (!dateString) return;
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? undefined : format(date, 'yyyy-MM-dd');
    } catch {
        return;
    }
};

export function SheetForm({ mode, onSubmitSuccess, vehicle_class, initialData, vehicle_status, vehicle_models, vehicle_makers }: SheetLayoutProps) {
    const initialFormValues = useMemo(
        () => ({
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
        }),
        [mode, initialData],
    );

    const initialFormattedDate = formatYMD(initialFormValues.purchase_date);
    const initialDateObj = initialFormattedDate ? new Date(initialFormattedDate + 'T00:00:00') : undefined;

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<Vehicle>({
        ...initialFormValues,
        purchase_date: initialFormattedDate || '',
    });

    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(initialDateObj);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        clearErrors();
        const formattedDate = formatYMD(mode === 'edit' && initialData ? initialData.purchase_date : undefined);
        const dateObj = formattedDate ? new Date(formattedDate + 'T00:00:00') : undefined;
        reset({ ...initialFormValues, purchase_date: formattedDate || '' });
        setPurchaseDate(dateObj);
        setIsDialogOpen(false);
    }, [mode, initialData, reset, clearErrors, initialFormValues]);

    const validVehicleClass = useMemo(
        () => (Array.isArray(vehicle_class) ? vehicle_class.filter((v) => v && typeof v.name === 'string' && v.name !== '') : []),
        [vehicle_class],
    );

    const validVehicleMakers = useMemo(
        () => (Array.isArray(vehicle_makers) ? vehicle_makers.filter((v) => v && typeof v.name === 'string' && v.name !== '') : []),
        [vehicle_makers],
    );

    const validVehicleStatus = useMemo(
        () => (Array.isArray(vehicle_status) ? vehicle_status.filter((v) => v && typeof v.status_name === 'string' && v.status_name !== '') : []),
        [vehicle_status],
    );

    const availableModels = useMemo(() => {
        const models = Array.isArray(vehicle_models) ? vehicle_models : [];
        if (!data.make || !validVehicleMakers.length || !models.length) return [];
        const selectedMaker = validVehicleMakers.find((m) => m.name === data.make);
        return selectedMaker
            ? models.filter((m): m is VehicleModelType => m && typeof m.maker_id !== 'undefined' && String(m.maker_id) === String(selectedMaker.id))
            : [];
    }, [data.make, vehicle_models, validVehicleMakers]);

    const handleMakeChange = (value: string) => {
        setData((prev) => ({ ...prev, make: value, model: '' }));
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
        setPurchaseDate(selectedDate);
        setData('purchase_date', formattedDate);
        setIsDialogOpen(false);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const url = mode === 'create' ? '/vehicles/register' : `/vehicles/${initialData?.id}/update`;

        const handleError = (errs: Record<string, string>) => {
            console.error(`${mode === 'create' ? 'Create' : 'Edit'} error:`, errs);
            if (errs && Object.keys(errs).length > 0) Object.entries(errs).forEach(([, msg]) => msg && toast.error(msg));
            else toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} vehicle.`);
        };

        const handleSuccess = () => onSubmitSuccess();

        if (mode === 'create') post(url, { onSuccess: handleSuccess, onError: handleError });
        else if (initialData?.id) put(url, { onSuccess: handleSuccess, onError: handleError });
        else toast.error('Cannot update: Missing ID.');
    };

    const suggestedLocations = ['With Customer', 'Front Garage', 'Rear Garage', 'Workshop'];
    const title = mode === 'create' ? 'Create New Vehicle' : `Edit Vehicle No. (${initialFormValues.vehicle_no || 'N/A'})`;
    const description =
        mode === 'create'
            ? "Fill in the details for the new vehicle. Click save when you're done."
            : "Update the vehicle details. Click save when you're done.";

    return (
        <SheetContent className="overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="px-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 p-4">
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
                                        {validVehicleMakers.map((m) => (
                                            <SelectItem key={m.id} value={m.name}>
                                                {m.name.charAt(0).toUpperCase() + m.name.slice(1)}
                                            </SelectItem>
                                        ))}
                                        {validVehicleMakers.length === 0 && (
                                            <SelectItem value="no-makers" disabled>
                                                No makers
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.make && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.make}</p>}
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={`${mode}-model`} className="text-right">
                                Model*
                            </Label>
                            <Select
                                required
                                name="model"
                                value={data.model || ''}
                                onValueChange={(v) => setData('model', v)}
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
                                        {availableModels.map((m) => (
                                            <SelectItem key={m.id} value={m.name}>
                                                {m.name.charAt(0).toUpperCase() + m.name.slice(1)}
                                            </SelectItem>
                                        ))}
                                        {data.make && availableModels.length === 0 && (
                                            <SelectItem value="no-models" disabled>
                                                No models for {data.make}
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.model && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.model}</p>}
                        </div>

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

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={`${mode}-vehicle_class_id`} className="text-right">
                                Class* {data.vehicle_class_id}
                            </Label>
                            <Select
                                required
                                name="vehicle_class_id"
                                value={data.vehicle_class_id || ''}
                                onValueChange={(v) => setData('vehicle_class_id', v)}
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
                                        {validVehicleClass.map((c) => (
                                            <SelectItem key={c.id} value={c.name}>
                                                {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                                            </SelectItem>
                                        ))}
                                        {validVehicleClass.length === 0 && (
                                            <SelectItem value="no-classes" disabled>
                                                No classes
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.vehicle_class_id && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.vehicle_class_id}</p>}
                        </div>

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

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={`${mode}-purchase_date_trigger`} className="text-right">
                                Purchase Date
                            </Label>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        id={`${mode}-purchase_date_trigger`}
                                        variant={'outline'}
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
                            {errors.weekly_rental_price && (
                                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.weekly_rental_price}</p>
                            )}
                        </div>

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
                            {errors.monthly_rental_price && (
                                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.monthly_rental_price}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={`${mode}-current_status_id`} className="text-right">
                                Status*
                            </Label>
                            <Select
                                required
                                name="current_status_id"
                                value={data.current_status_id || ''}
                                onValueChange={(v) => setData('current_status_id', v)}
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
                                        {validVehicleStatus.map((s) => (
                                            <SelectItem key={s.id} value={s.status_name}>
                                                {s.status_name.charAt(0).toUpperCase() + s.status_name.slice(1)}
                                            </SelectItem>
                                        ))}
                                        {validVehicleStatus.length === 0 && (
                                            <SelectItem value="no-status" disabled>
                                                No statuses
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.current_status_id && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.current_status_id}</p>}
                        </div>

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
            </div>
        </SheetContent>
    );
}
