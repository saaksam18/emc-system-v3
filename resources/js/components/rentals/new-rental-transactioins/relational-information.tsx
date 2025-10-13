import { FormField } from '@/components/form/FormField';
import CustomerDetailsCard from './customer-details-card';

import { SearchableCombobox } from '@/components/form/SearchableCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Customers, Vehicle } from '@/types';
import { FormErrors, InitialFormValues, LookupItem } from '@/types/transaction-types';
import { InertiaFormProps } from '@inertiajs/react';
import { BadgeDollarSign, BikeIcon, CalendarClock, CalendarIcon, CheckCircle } from 'lucide-react';
import React, { useMemo } from 'react';

// Define the shape of the props
interface RelationalInformationProps {
    // State/Data
    data: InitialFormValues;
    formErrors: FormErrors;
    selectedCustomerData: Customers | null;
    selectedVehicleData: Vehicle | undefined;
    customers: { id: number; name: string }[];
    vehicleStatuses: { id: number; name: string }[];
    users: { id: number; name: string }[];
    processing: boolean;

    // Handlers
    setData: InertiaFormProps<InitialFormValues>['setData'];
    handleComboboxChange: (field: keyof InitialFormValues, value: string, id: number | null) => void;

    // UI State & Handlers
    customerDialogOpen: boolean;
    setCustomerDialogOpen: (open: boolean) => void;
    setOpen: (open: boolean) => void; // Dummy/external dialog control
    onCreateClick: () => void; // Handler for creating new customer
}

// --- Reusable Entity Combobox ---
interface EntityComboboxProps<T extends { id: number; name: string }> {
    items: T[] | null;
    value: string;
    onChange: (value: string, id: number | null) => void;
    processing: boolean;
    error?: string;
    entityName: string;
}
function EntityCombobox<T extends { id: number; name: string }>({ items, value, onChange, processing, error, entityName }: EntityComboboxProps<T>) {
    const options = useMemo(
        () =>
            Array.isArray(items)
                ? items
                      .filter((item): item is T => !!item && !!item.id && typeof item.name === 'string' && item.name !== '')
                      .map((item) => ({ value: item.name, label: item.name }))
                : [],
        [items],
    );

    const handleSelect = (selectedName: string) => {
        // Find the corresponding item/ID
        const selectedItem = items?.find((item) => item.name === selectedName);
        const selectedId = selectedItem?.id ?? null;

        // Call the new onChange with both name and ID
        onChange(selectedName, selectedId);
    };

    return (
        <>
            <SearchableCombobox
                options={options}
                value={value}
                onChange={handleSelect}
                placeholder={`Select ${entityName}...`}
                searchPlaceholder={`Search ${entityName}...`}
                emptyMessage={`No ${entityName} found.`}
                disabled={processing || options.length === 0}
                error={!!error}
            />
            {options.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No {entityName}s available.</p>}
        </>
    );
}

function isValidDate(date: Date | undefined) {
    if (!date) {
        return false;
    }
    return !isNaN(date.getTime());
}
function formatDate(date: Date | undefined) {
    if (!date) {
        return '';
    }
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}
function calculateRentalPeriod(startDateString: string, endDateString: string): number | null {
    // 1. Convert the formatted date string back to a Date object.
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    // 2. Validate the dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return null;
    }

    // Ensure end date is not before start date (optional, but good practice)
    if (endDate.getTime() < startDate.getTime()) {
        return 0;
    }

    // 3. Calculate the difference in milliseconds
    const timeDifference = endDate.getTime() - startDate.getTime();
    const days = Math.round(timeDifference / (1000 * 60 * 60 * 24));
    return days;
}

const useLookupName = <T extends LookupItem>(collection: T[] | undefined, lookupId: number | string | null | undefined): string => {
    return useMemo(() => {
        // 1. Validate collection and ID
        if (!Array.isArray(collection) || lookupId === undefined || lookupId === null) {
            return '';
        }

        // 2. Safely convert ID
        const numericId = Number(lookupId);
        if (isNaN(numericId)) {
            return '';
        }

        // 3. Find the item and return the name
        const item = collection.find((c) => c.id === numericId);
        return item?.name ?? '';
    }, [collection, lookupId]);
};

function RelationalInformation({
    data,
    setData,
    formErrors,
    selectedCustomerData,
    selectedVehicleData,
    customers,
    vehicleStatuses,
    users,
    processing,
    handleComboboxChange,
    handleInputChange,
}: RelationalInformationProps) {
    const [openStartDate, setOpenStartDate] = React.useState(false);
    const [openEndDate, setOpenEndDate] = React.useState(false);
    const [openComingDate, setOpenComingDate] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
    const [startMonth, setStartMonth] = React.useState<Date | undefined>(startDate);
    const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
    const [endMonth, setEndMonth] = React.useState<Date | undefined>(endDate);
    const [comingDate, setComingDate] = React.useState<Date | undefined>(new Date());
    const [comingMonth, setComingMonth] = React.useState<Date | undefined>(endDate);

    // Calculate the customer name string for the combobox to display
    const selectedCustomerName = useLookupName(customers, data.customer_id);
    const selectedStatusName = useLookupName(vehicleStatuses, data.status_id);
    const selectedInchargerName = useLookupName(users, data.user_id);

    // --- Add useMemo for calculation ---
    const rentalPeriodDays = useMemo(() => {
        return calculateRentalPeriod(data.actual_start_date, data.end_date);
    }, [data.actual_start_date, data.end_date]);

    // Format the output
    const periodDisplay = useMemo(() => {
        if (rentalPeriodDays === null) {
            return 'Enter start and end dates';
        }
        if (rentalPeriodDays === 0) {
            return 'Same day or invalid period';
        }
        return `${rentalPeriodDays}`;
    }, [rentalPeriodDays]);

    React.useEffect(() => {
        // Determine the value you want to store (e.g., the display string)
        const valueToStore = periodDisplay;

        // Only update if the calculated value is different from the current form state
        // to prevent unnecessary re-renders.
        if (data.period !== valueToStore) {
            setData('period', valueToStore);
        }

        // Dependencies: Recalculate and update whenever the dates change
    }, [periodDisplay, setData, data.period]);
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 rounded-xl">
                {/* 1. Vehicle Identification Header */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center">
                            <BikeIcon className="mr-3 h-6 w-6 text-green-600" />
                            {selectedVehicleData ? (
                                <div>
                                    <p className="text-xl font-bold text-gray-900">
                                        {selectedVehicleData.make || 'Unknown Make'} {selectedVehicleData.model || 'Unknown Model'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Vehicle No: <span className="font-mono font-semibold">{selectedVehicleData.vehicle_no || 'NO-0000'}</span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xl font-bold text-gray-500">Select a Vehicle</p>
                            )}
                        </div>
                        {selectedVehicleData && (
                            <Badge className={`${selectedVehicleData.color} px-4 py-1.5 text-xs font-bold text-white shadow-md`}>
                                {selectedVehicleData.current_status_name || 'Status Unknown'}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* 2. Transaction Details & Relational Selection */}
                <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-md md:grid-cols-2">
                    <div className="mb-2 border-b pb-4 md:col-span-2">
                        <h4 className="flex items-center text-lg font-semibold text-gray-800">
                            <CheckCircle className="mr-2 h-5 w-5 text-indigo-500" />
                            Relationship & Status
                        </h4>
                        <p className="text-sm text-gray-500">Define the relationship and new state for this transaction.</p>
                    </div>
                    {/* Customer Combobox */}
                    <FormField label="Customer" htmlFor="customer_id" error={formErrors.customer_id} required>
                        {/* Customer Combobox */}
                        <EntityCombobox
                            items={customers}
                            value={selectedCustomerName}
                            onChange={(name, id) => handleComboboxChange('customer_id', name, id)}
                            processing={processing}
                            error={formErrors.customer_id}
                            entityName="customer"
                        />
                    </FormField>
                    {/* Vehicle Status Combobox */}
                    <FormField label="New Vehicle Status" htmlFor="status_id" error={formErrors.status_id} required>
                        <EntityCombobox
                            items={vehicleStatuses}
                            value={selectedStatusName}
                            onChange={(name, id) => handleComboboxChange('status_id', name, id)}
                            processing={processing}
                            error={formErrors.status_id}
                            entityName="status"
                        />
                    </FormField>
                </div>

                {/* 3. Transaction Timeline (Dates & Period) */}
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-md md:grid-cols-2">
                    <div className="mb-2 border-b pb-4 md:col-span-4">
                        <h4 className="flex items-center text-lg font-semibold text-gray-800">
                            <CalendarClock className="mr-2 h-5 w-5 text-amber-500" />
                            Timeline & Duration
                        </h4>
                        <p className="text-sm text-gray-500">Set the period for the transaction (e.g., rental, service duration).</p>
                    </div>
                    {/* Start Date */}
                    <div className="mb-4 space-y-4 md:col-span-1">
                        <FormField label="Start Date" htmlFor="actual_start_date" error={formErrors.actual_start_date} required>
                            <div className="relative flex gap-2">
                                <Input
                                    id="date"
                                    value={data.actual_start_date}
                                    placeholder={data.actual_start_date || 'Select a date'}
                                    className="bg-background pr-10"
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        setData('actual_start_date', e.target.value);
                                        if (isValidDate(date)) {
                                            setStartDate(date);
                                            setStartMonth(date);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setOpenStartDate(true);
                                        }
                                    }}
                                />
                                <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                                    <PopoverTrigger asChild>
                                        <Button id="date-picker" variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                                            <CalendarIcon className="size-3.5" />
                                            <span className="sr-only">Select date</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            captionLayout="dropdown"
                                            month={startMonth}
                                            onMonthChange={setStartMonth}
                                            onSelect={(date) => {
                                                setStartDate(date);
                                                setData('actual_start_date', formatDate(date));
                                                setOpenStartDate(false);
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </FormField>
                        {/* Return Date */}
                        <FormField label="Return Date" htmlFor="end_date" error={formErrors.end_date} required>
                            <div className="relative flex gap-2">
                                <Input
                                    id="date"
                                    value={data.end_date}
                                    placeholder={data.end_date || 'Select a date'}
                                    className="bg-background pr-10"
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        setData('end_date', e.target.value);
                                        if (isValidDate(date)) {
                                            setEndDate(date);
                                            setEndMonth(date);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setOpenEndDate(true);
                                        }
                                    }}
                                />
                                <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                                    <PopoverTrigger asChild>
                                        <Button id="date-picker" variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                                            <CalendarIcon className="size-3.5" />
                                            <span className="sr-only">Select date</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            captionLayout="dropdown"
                                            month={endMonth}
                                            onMonthChange={setEndMonth}
                                            onSelect={(date) => {
                                                setEndDate(date);
                                                setData('end_date', formatDate(date));
                                                setOpenEndDate(false);
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </FormField>
                    </div>
                    {/* Period */}
                    <div className="space-y-4 md:col-span-1">
                        <FormField label="Period" htmlFor="period" error={formErrors.period} required>
                            <div className="border-input rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-sm">{periodDisplay}</div>
                        </FormField>
                        {/* Coming Date */}
                        <FormField label="Coming Date" htmlFor="coming_date" error={formErrors.coming_date}>
                            <div className="relative flex gap-2">
                                <Input
                                    id="date"
                                    value={data.coming_date}
                                    placeholder={data.coming_date || 'Select a date'}
                                    className="bg-background pr-10"
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        setData('coming_date', e.target.value);
                                        if (isValidDate(date)) {
                                            setComingDate(date);
                                            setComingMonth(date);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setOpenComingDate(true);
                                        }
                                    }}
                                />
                                <Popover open={openComingDate} onOpenChange={setOpenComingDate}>
                                    <PopoverTrigger asChild>
                                        <Button id="date-picker" variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                                            <CalendarIcon className="size-3.5" />
                                            <span className="sr-only">Select date</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                                        <Calendar
                                            mode="single"
                                            selected={comingDate}
                                            captionLayout="dropdown"
                                            month={comingMonth}
                                            onMonthChange={setComingMonth}
                                            onSelect={(date) => {
                                                setComingDate(date);
                                                setData('coming_date', formatDate(date));
                                                setOpenComingDate(false);
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </FormField>
                    </div>
                </div>

                {/* 4. Pricing and Additional Information */}
                <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-md md:grid-cols-1">
                    <div className="mb-2 border-b pb-4 md:col-span-2">
                        <h4 className="flex items-center text-lg font-semibold text-gray-800">
                            <BadgeDollarSign className="mr-2 h-5 w-5 text-red-500" />
                            Pricing and Additional Information
                        </h4>
                        <p className="text-sm text-gray-500">Define the relationship and new state for this transaction.</p>
                    </div>
                    <div className="w-full space-y-4">
                        {/* Remark */}
                        <FormField label="Remark" htmlFor="notes" error={formErrors.notes}>
                            {/* Price */}
                            <Textarea
                                name="notes" // REQUIRED: The name MUST match the data key!
                                id="notes"
                                placeholder="etc..."
                                value={data.notes}
                                onChange={handleInputChange}
                            />
                        </FormField>
                        {/* Incharger Combobox */}
                        <FormField label="Staff Incharge" htmlFor="user_id" error={formErrors.user_id} required>
                            <EntityCombobox
                                items={users}
                                value={selectedInchargerName}
                                onChange={(name, id) => handleComboboxChange('user_id', name, id)}
                                processing={processing}
                                error={formErrors.user_id}
                                entityName="staff"
                            />
                        </FormField>
                    </div>
                </div>
            </div>
            <div>
                <CustomerDetailsCard selectedCustomerData={selectedCustomerData} />
            </div>
        </div>
    );
}

export default RelationalInformation;
