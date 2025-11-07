import { EntityCombobox } from '@/components/form/entity-combobox';
import { FormField } from '@/components/form/FormField';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Customers, Vehicle } from '@/types';
import { FormErrors, InitialFormValues, useLookupName } from '@/types/transaction-types';
import { InertiaFormProps } from '@inertiajs/react';
import { CalendarClock, CalendarIcon, CheckCircle, NotepadText, PlusCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { DateRange } from 'react-day-picker';

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
    clearErrors: (fields?: keyof InitialFormValues | (keyof InitialFormValues)[]) => void;
    handleComboboxChange: (field: keyof InitialFormValues, value: string, id: number | null) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

    // UI State & Handlers
    customerDialogOpen: boolean;
    setCustomerDialogOpen: (open: boolean) => void;
    setOpen: (open: boolean) => void; // Dummy/external dialog control
    onCreateClick: () => void; // Handler for creating new customer
}

// --- Reusable Entity Combobox ---

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

function RelationalInformation({
    data,
    setData,
    formErrors,
    clearErrors,
    customers,
    vehicleStatuses,
    users,
    processing,
    handleComboboxChange,
    handleInputChange,
    onCreateClick,
}: RelationalInformationProps) {
    const [openComingDate, setOpenComingDate] = React.useState(false);
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [comingDate, setComingDate] = React.useState<Date | undefined>(new Date());
    const [comingMonth, setComingMonth] = React.useState<Date | undefined>(new Date());

    // Calculate the customer name string for the combobox to display
    const selectedCustomerName = useLookupName(customers, data.customer_id);
    const selectedStatusName = useLookupName(vehicleStatuses, data.status_id);
    const selectedInchargerName = useLookupName(users, data.incharger_id);

    // --- Add useMemo for calculation ---
    const rentalPeriodDays = useMemo(() => {
        return calculateRentalPeriod(data.actual_start_date, data.end_date);
    }, [data.actual_start_date, data.end_date]);

    // This useEffect updates the period input when the dates are changed manually
    React.useEffect(() => {
        const periodString = rentalPeriodDays !== null && rentalPeriodDays > 0 ? String(rentalPeriodDays) : '';
        if (data.period !== periodString) {
            setData('period', periodString);
        }
    }, [rentalPeriodDays]);

    const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const periodValue = e.target.value;
        setData('period', periodValue);

        const periodDays = parseInt(periodValue, 10);

        if (!isNaN(periodDays) && periodDays > 0 && data.actual_start_date) {
            const startDate = new Date(data.actual_start_date);
            if (isValidDate(startDate)) {
                const newEndDate = new Date(startDate);
                newEndDate.setDate(startDate.getDate() + periodDays);

                const formattedEndDate = formatDate(newEndDate);

                if (data.end_date !== formattedEndDate) {
                    setDate({ from: startDate, to: newEndDate });
                    setData('end_date', formattedEndDate);
                    clearErrors('end_date');
                }
            }
        }
    };

    return (
        <div className="space-y-4 rounded-xl">
            {/* 2. Transaction Details & Relational Selection */}
            <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-md lg:grid-cols-2">
                <div className="mb-2 border-b pb-4 lg:col-span-2">
                    <h4 className="flex items-center text-lg font-semibold text-gray-800">
                        <CheckCircle className="mr-2 h-5 w-5 text-indigo-500" />
                        Relationship & Status
                    </h4>
                    <p className="text-sm text-gray-500">Define the relationship and new state for this transaction.</p>
                </div>
                {/* Customer Combobox */}
                <FormField label="Customer" htmlFor="customer_id" error={formErrors.customer_id} required>
                    <div className="flex w-full flex-col items-center gap-1 md:flex-row">
                        <Button type="button" className="w-full md:w-auto" onClick={onCreateClick}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                        {/* Customer Combobox */}
                        <div className="w-full">
                            <EntityCombobox
                                items={customers}
                                value={selectedCustomerName}
                                onChange={(name, id) => handleComboboxChange('customer_id', name, id)}
                                processing={processing}
                                error={formErrors.customer_id}
                                entityName="customer"
                            />
                        </div>
                    </div>
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
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
                <div className="col-span-full mb-2 border-b pb-4">
                    <h4 className="flex items-center text-lg font-semibold text-gray-800">
                        <CalendarClock className="mr-2 h-5 w-5 text-amber-500" />
                        Timeline & Duration
                    </h4>
                    <p className="text-sm text-gray-500">Set the period for the transaction (e.g., rental, service duration).</p>
                </div>
                {/* Date Range Picker */}
                <div className="mb-4 space-y-4">
                    <FormField label="Select Rental Dates" htmlFor="date_range" error={formErrors.actual_start_date || formErrors.end_date} required>
                        <div className="relative flex flex-col items-center gap-4">
                            <div className="flex w-full justify-around rounded-full bg-gray-100 p-2">
                                <div className="text-start">
                                    <Badge variant="default" className="rounded-full bg-green-200 text-green-500">
                                        Start Date
                                    </Badge>
                                    <p className="text-center text-lg font-semibold text-gray-800">{data.actual_start_date || 'Not set'}</p>
                                </div>
                                <div className="text-start">
                                    <Badge
                                        variant="default"
                                        className={`rounded-full ${data.end_date ? 'bg-green-200 text-green-500' : 'bg-red-200 text-red-500'} `}
                                    >
                                        Return Date
                                    </Badge>
                                    <p className="text-lg font-semibold text-gray-800">{data.end_date || 'Not set'}</p>
                                </div>
                                <div className="text-center">
                                    <Badge
                                        variant="default"
                                        className={`rounded-full ${data.end_date ? 'bg-green-200 text-green-500' : 'bg-red-200 text-red-500'} `}
                                    >
                                        Period
                                    </Badge>
                                    <p className="text-lg font-semibold text-gray-800">
                                        {data.period ? data.period : '0'} {data.period > 1 ? 'Days' : 'Day'}
                                    </p>
                                </div>
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(range) => {
                                    setDate(range);
                                    if (range?.from) {
                                        setData('actual_start_date', formatDate(range.from));
                                        clearErrors('actual_start_date');
                                    }
                                    if (range?.to) {
                                        setData('end_date', formatDate(range.to));
                                        clearErrors('end_date');
                                    }
                                }}
                                numberOfMonths={2}
                                disabled={[{ dayOfWeek: [0, 6] }]}
                            />
                        </div>
                    </FormField>
                </div>
                {/* Period */}
                <div className="space-y-4">
                    <FormField label="Period (days)" htmlFor="period" error={formErrors.period} required>
                        <Input
                            type="number"
                            id="period"
                            name="period"
                            value={data.period || ''}
                            onChange={handlePeriodChange}
                            placeholder="e.g. 30"
                        />
                    </FormField>
                    {/* Coming Date */}
                    <FormField label="Coming Date (Optional)" htmlFor="coming_date" error={formErrors.coming_date}>
                        <div className="relative flex gap-2">
                            <Input
                                id="date"
                                value={data.coming_date}
                                placeholder={data.coming_date || 'Select a date'}
                                className="bg-background pr-10"
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    setData('coming_date', e.target.value);
                                    clearErrors('coming_date');
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
                                            clearErrors('coming_date');
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
                <div className="col-span-full mb-2 border-b pb-4">
                    <h4 className="flex items-center text-lg font-semibold text-gray-800">
                        <NotepadText className="mr-2 h-5 w-5 text-red-500" />
                        Additional Information
                    </h4>
                    <p className="text-sm text-gray-500">Define the relationship and new state for this transaction.</p>
                </div>
                <div className="w-full space-y-4">
                    {/* Helmet Rental */}
                    <FormField label="Helmet Amount" htmlFor="helmet_amount" error={formErrors.helmet_amount} required>
                        <Input type="text" id="helmet_amount" name="helmet_amount" value={data.helmet_amount} onChange={handleInputChange} />
                    </FormField>
                    {/* Know shop by??? */}
                    <FormField label="How do customer know our shop? (Optional)" htmlFor="how_know_shop" error={formErrors.how_know_shop}>
                        <Input type="text" id="how_know_shop" name="how_know_shop" value={data.how_know_shop} onChange={handleInputChange} />
                    </FormField>
                    {/* Occupation */}
                    <FormField label="Occupation in Cambodia (Optional)" htmlFor="occupations" error={formErrors.occupations}>
                        <Input type="text" id="occupations" name="occupations" value={data.occupations} onChange={handleInputChange} />
                    </FormField>
                    {/* Remark */}
                    <FormField label="Remark (Optional)" htmlFor="notes" error={formErrors.notes}>
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
                    <FormField label="Staff Incharge" htmlFor="incharger_id" error={formErrors.incharger_id} required>
                        <EntityCombobox
                            items={users}
                            value={selectedInchargerName}
                            onChange={(name, id) => handleComboboxChange('incharger_id', name, id)}
                            processing={processing}
                            error={formErrors.incharger_id}
                            entityName="staff"
                        />
                    </FormField>
                </div>
            </div>
        </div>
    );
}

export default RelationalInformation;
