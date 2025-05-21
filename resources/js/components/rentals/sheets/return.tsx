import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// Assuming VehicleStatusType has { id: string | number; status_name: string; ... }
// Assuming RentalsType includes fields like: id, vehicle_id, user_id, vehicle_status_id, start_date, end_date, actual_start_date, actual_end_date, total_cost, notes etc.
import { RentalsType, User, VehicleStatusType } from '@/types'; // Make sure RentalsType is correctly imported and defined
import { useForm } from '@inertiajs/react';
import { differenceInDays, format } from 'date-fns'; // Import differenceInDays
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Helper Functions ---
/**
 * Formats a Date object or string into 'yyyy-MM-dd' format for input fields.
 * Returns an empty string for null, undefined, or invalid dates.
 * @param date - The date to format.
 * @returns The formatted date string or an empty string.
 */
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        // Check if the date object is valid
        if (!d || isNaN(d.getTime())) {
            console.warn('Invalid date value encountered in formatDateForInput:', date);
            return '';
        }
        return format(d, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

/**
 * Calculates the difference in days between two date strings (ignoring time).
 * Returns null if either date is invalid or missing.
 * @param originalEndDateStr - The original end date string ('yyyy-MM-dd').
 * @param actualEndDateStr - The actual end date string ('yyyy-MM-dd').
 * @returns The difference in days (positive if late, negative if early, 0 if on time) or null.
 */
const calculatePeriodDifference = (originalEndDateStr: string | null | undefined, actualEndDateStr: string | null | undefined): number | null => {
    if (!originalEndDateStr || !actualEndDateStr) {
        return null;
    }
    try {
        // Append T00:00:00 to ensure dates are treated as local start-of-day
        const originalEndDate = new Date(originalEndDateStr + 'T00:00:00');
        const actualEndDate = new Date(actualEndDateStr + 'T00:00:00');

        // Validate date objects
        if (isNaN(originalEndDate.getTime()) || isNaN(actualEndDate.getTime())) {
            console.warn('Invalid date for period calculation:', { originalEndDateStr, actualEndDateStr });
            return null;
        }
        // Calculate the difference in days
        const diffDays = differenceInDays(actualEndDate, originalEndDate);
        return diffDays;
    } catch (error) {
        console.error('Error calculating period difference:', error);
        return null;
    }
};

/**
 * Formats the difference in days into a user-friendly string.
 * @param diffDays - The difference in days (number, string, null, or undefined).
 * @returns A formatted string like "On time", "X days late", "X days early", or "N/A".
 */
const formatPeriodDifference = (diffDays: number | string | null | undefined): string => {
    const numDays = Number(diffDays); // Convert to number for reliable checks
    if (diffDays === null || diffDays === undefined || isNaN(numDays)) {
        return 'N/A'; // Return 'N/A' for null, undefined, or NaN
    }
    if (numDays === 0) return 'On time';
    if (numDays > 0) return `${numDays} day${numDays > 1 ? 's' : ''} late`;
    // If negative (early return)
    const absDays = Math.abs(numDays);
    return `${absDays} day${absDays > 1 ? 's' : ''} early`;
};

// --- Form Data and Error Types ---
// Defines the structure of the form data managed by useForm
type ReturnFormValues = {
    id: number | string | null; // Rental ID
    vehicle_id: number | string | null; // Vehicle ID associated with the rental
    status_name: string; // Display name for the selected vehicle status
    status_id: number | string | null; // ID of the selected vehicle status
    user_name: string; // Display name for the selected user
    user_id: number | string | null; // ID of the user processing the return
    start_date: string; // Original start date ('yyyy-MM-dd')
    end_date: string; // Original end date ('yyyy-MM-dd')
    actual_end_date: string; // Actual return date ('yyyy-MM-dd')
    period_difference: number | string | null; // Calculated difference in days (stored as number/null internally)
    total_cost: string; // Final cost/refund amount (stored as string to handle input)
    notes: string; // Notes related to the return
    vehicle_no?: string; // Vehicle number (optional, for display)
};
// Defines the structure for form validation errors
type FormErrors = Partial<Record<keyof ReturnFormValues, string>>;

// --- Initial Empty Form Values ---
// Default values for the form when no rental is selected or after reset
const initialFormValues: ReturnFormValues = {
    id: null,
    vehicle_id: null,
    status_name: '',
    status_id: null,
    user_name: '',
    user_id: null,
    start_date: '',
    end_date: '',
    actual_end_date: formatDateForInput(new Date()), // Default actual return date to today
    period_difference: null, // Calculated field
    total_cost: '0', // Default cost to '0'
    notes: '',
    vehicle_no: '',
};

// --- Reusable Form Section Component ---
interface FormSectionProps {
    title: string;
    description: string;
    children: React.ReactNode;
}
/**
 * Renders a styled card section for grouping form elements.
 */
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
    error?: string; // Optional error message for the field
    required?: boolean; // Indicates if the field is mandatory
    children: React.ReactNode; // The input element(s) for the field
    className?: string; // Optional additional CSS classes for the container div
    labelClassName?: string; // Optional additional CSS classes for the label
    contentClassName?: string; // Optional additional CSS classes for the content div
    readOnly?: boolean; // Indicates if the field is read-only
}
/**
 * Renders a label, input container, and optional error message for a form field.
 * Uses a grid layout for responsiveness.
 */
const FormField: React.FC<FormFieldProps> = ({
    label,
    htmlFor,
    error,
    required,
    children,
    className,
    labelClassName,
    contentClassName,
    readOnly,
}) => (
    <div className={cn('grid grid-cols-1 items-start gap-4 md:grid-cols-4 md:items-center', className)}>
        {/* Label for the form field */}
        <Label
            htmlFor={htmlFor}
            className={cn(
                'text-left md:text-right', // Align label text
                labelClassName,
                readOnly && 'text-muted-foreground', // Style read-only labels
            )}
        >
            {label}
            {required && <span className="text-destructive ml-1">*</span>} {/* Add asterisk for required fields */}
        </Label>
        {/* Container for the input element(s) */}
        <div className={cn('col-span-1 md:col-span-3', contentClassName)}>
            {children}
            {/* Display error message if present */}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Main Return Component ---
interface ReturnProps {
    selectedRow: RentalsType | null; // The selected rental data, or null if none selected
    vehicleStatuses: VehicleStatusType[] | null; // List of available vehicle statuses
    users: User[] | null; // List of available users
    onSubmitSuccess: () => void; // Callback function to execute on successful submission
}

/**
 * Component for handling the vehicle return process form.
 */
export function Return({ selectedRow, users, vehicleStatuses, onSubmitSuccess }: ReturnProps) {
    // Inertia form hook for managing form state, submission, and errors
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<ReturnFormValues>(initialFormValues);
    const formErrors = errors as FormErrors; // Type cast Inertia errors

    // State variables for controlling dialog visibility
    const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [actualEndDateDialogOpen, setActualEndDateDialogOpen] = useState(false);

    // --- Filtered & Validated Lists ---
    // Memoized list of valid vehicle statuses (ensure they have id and name)
    const validVehicleStatuses = useMemo(
        () =>
            Array.isArray(vehicleStatuses)
                ? vehicleStatuses.filter(
                      (vs): vs is VehicleStatusType & { id: string | number; status_name: string } =>
                          !!vs && vs.id != null && typeof vs.status_name === 'string' && vs.status_name !== '',
                  )
                : [],
        [vehicleStatuses], // Recalculate only when vehicleStatuses changes
    );
    // Memoized list of valid users (ensure they have id and name)
    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && u.id != null && typeof u.name === 'string' && u.name !== '') : []),
        [users], // Recalculate only when users changes
    );

    // --- Effects ---

    // EFFECT: Populate form when selectedRow changes
    useEffect(() => {
        if (selectedRow) {
            // Prepare data to populate the form based on the selected rental
            const populatedData: Partial<ReturnFormValues> = {
                id: selectedRow.id,
                vehicle_id: selectedRow.vehicle_id,
                // Reset fields that need user selection on return
                status_name: '',
                status_id: null,
                user_name: '',
                user_id: null,
                // Format dates for input fields
                start_date: formatDateForInput(selectedRow.actual_start_date || selectedRow.start_date),
                end_date: formatDateForInput(selectedRow.end_date),
                // Preserve actual_end_date if it was already set for the *same* selected row, otherwise default to today
                actual_end_date: data.id === selectedRow.id && data.actual_end_date ? data.actual_end_date : formatDateForInput(new Date()),
                total_cost: '0', // Reset cost on selection change, user must input final cost/refund
                notes: selectedRow.notes || '', // Pre-fill notes if they exist
                vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || 'N/A', // Display vehicle number
            };
            // Use setData with a function to ensure updates are based on the latest state
            setData((currentData) => ({ ...currentData, ...populatedData }));
            clearErrors(); // Clear any previous validation errors
        } else {
            // If no row is selected (e.g., deselection), reset the form
            reset(); // Reset form to initial values defined in initialFormValues
            // Explicitly set default values again after reset if needed, especially for calculated/dynamic defaults
            setData('actual_end_date', formatDateForInput(new Date()));
            setData('total_cost', '0');
        }
        // Dependencies: Effect runs when selectedRow, reset, setData, or clearErrors change
    }, [selectedRow, reset, setData, clearErrors]);

    // EFFECT: Calculate Period Difference when relevant dates change
    useEffect(() => {
        // Calculate the difference based on current form data
        const calculatedDiff = calculatePeriodDifference(data.end_date, data.actual_end_date);

        // Only update the state if the calculated difference is actually different
        // from the currently stored value to prevent unnecessary re-renders.
        if (calculatedDiff !== data.period_difference) {
            setData('period_difference', calculatedDiff);
        }

        // Add a check for invalid date range: return date cannot be before the start date.
        // Use T00:00:00 to ensure comparison is based on the start of the day.
        if (data.actual_end_date && data.start_date && new Date(data.actual_end_date + 'T00:00:00') < new Date(data.start_date + 'T00:00:00')) {
            // Show a warning toast if the return date is invalid.
            toast.warning('Return date cannot be before the original start date.');
            // Note: This doesn't prevent submission directly but warns the user.
            // Further validation could be added in handleSubmit if needed.
        }
        // Dependencies: Effect runs when end_date, actual_end_date, start_date, or the period_difference itself changes.
        // Including data.period_difference ensures consistency if external factors could change it.
    }, [data.end_date, data.actual_end_date, data.start_date, data.period_difference, setData]);

    // --- Handlers ---

    /**
     * Handles changes for standard input (text, textarea) fields.
     * Includes specific logic for the 'total_cost' field to allow only valid decimal numbers.
     * @param e - The React change event object.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // List of field names managed by this handler
        const manageableKeys: Array<keyof Pick<ReturnFormValues, 'notes' | 'total_cost'>> = ['notes', 'total_cost'];

        if (manageableKeys.includes(name as any)) {
            const key = name as keyof Pick<ReturnFormValues, 'notes' | 'total_cost'>;
            let processedValue = value;

            // Specific processing for 'total_cost'
            if (key === 'total_cost') {
                // 1. Remove any characters that are not digits or a decimal point
                processedValue = value.replace(/[^0-9.]/g, '');
                // 2. Ensure only one decimal point exists
                const parts = processedValue.split('.');
                if (parts.length > 2) {
                    processedValue = parts[0] + '.' + parts.slice(1).join(''); // Keep first part + '.' + rest joined
                }
                // 3. Prevent leading zeros unless it's '0.' or just '0'
                if (processedValue.length > 1 && processedValue.startsWith('0') && !processedValue.startsWith('0.')) {
                    processedValue = processedValue.substring(1); // Remove leading zero
                }
                // 4. Default to '0' if the field becomes empty after processing (e.g., user deletes everything)
                if (processedValue === '') {
                    processedValue = '0';
                }
            }

            // Update the form state using setData
            setData(key, processedValue);
            // Clear the specific error message for this field if it exists
            if (formErrors[key]) {
                clearErrors(key);
            }
        } else {
            // Warn if the handler is triggered by an unexpected field name
            console.warn(`Input change handler received unexpected name: ${name}`);
        }
    };

    /**
     * Handles selection changes in Combobox components (Vehicle Status, User).
     * Updates both the display name (e.g., status_name) and the corresponding ID (e.g., status_id).
     * @param name - The name of the field being changed ('status_name' or 'user_name').
     * @param value - The selected display value (e.g., "Available", "John Doe").
     */
    const handleComboboxChange = (name: 'status_name' | 'user_name', value: string) => {
        if (name === 'status_name') {
            // Find the selected status object from the valid list
            const selectedStatus = validVehicleStatuses.find((vs) => vs.status_name === value);
            // Update both status_name and status_id in the form data
            setData((prevData) => ({
                ...prevData,
                status_name: value,
                status_id: selectedStatus?.id ?? null, // Use null if not found
            }));
            // Clear potential errors related to status selection
            if (formErrors.status_name) clearErrors('status_name');
            if (formErrors.status_id) clearErrors('status_id');
        } else if (name === 'user_name') {
            // Find the selected user object from the valid list
            const selectedUser = validUsers.find((u) => u.name === value);
            // Update both user_name and user_id in the form data
            setData((prevData) => ({
                ...prevData,
                user_name: value,
                user_id: selectedUser?.id ?? null, // Use null if not found
            }));
            // Clear potential errors related to user selection
            if (formErrors.user_name) clearErrors('user_name');
            if (formErrors.user_id) clearErrors('user_id');
        }
    };

    /**
     * Handles date selection changes from the Calendar component.
     * @param field - The name of the date field being changed ('actual_end_date').
     * @param date - The selected Date object, or undefined if cleared.
     */
    const handleDateChange = (field: 'actual_end_date', date: Date | undefined) => {
        // Format the selected date to 'yyyy-MM-dd' or empty string
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
        // Update the form state
        setData(field, formattedDate);
        // Clear any error associated with this date field
        if (formErrors[field]) {
            clearErrors(field);
        }
        // Close the date picker dialog after selection
        setActualEndDateDialogOpen(false);

        // Re-check date validity immediately after change
        if (data.start_date && formattedDate && new Date(formattedDate + 'T00:00:00') < new Date(data.start_date + 'T00:00:00')) {
            toast.warning('Return date cannot be before the original start date.');
        }
    };

    // --- Form Submission ---
    /**
     * Handles the form submission event.
     * Performs validation, constructs the payload, and sends a PUT request.
     * @param e - The React form event object.
     */
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault(); // Prevent default browser form submission
        // Ensure a rental is selected
        if (!selectedRow || !data.id) {
            toast.error('No rental selected for return.');
            return;
        }
        clearErrors(); // Clear previous validation errors before new submission

        // Construct the API endpoint URL
        const url = `/rentals/${data.id}/return`;
        // Convert period difference and cost to numbers for validation checks
        const periodDiffNum = Number(data.period_difference);
        const costNum = Number(data.total_cost); // data.total_cost is already a string

        // --- Pre-submission Validation ---
        // *** UPDATED VALIDATION RULE ***
        // Rule: If the return is 7 or more days early (period difference <= -7), the final cost cannot be zero.
        // This usually implies a refund or adjustment needs to be entered.
        if (data.period_difference !== null && !isNaN(periodDiffNum) && periodDiffNum <= -7) {
            if (isNaN(costNum) || costNum === 0) {
                toast.error('Final Cost cannot be zero for returns 7 or more days early. Please enter the refund amount or adjustment.');
                // Optionally, focus the cost input for better UX:
                // document.getElementById('total_cost')?.focus();
                return; // Stop the submission
            }
        }
        // Rule: Return date cannot be before start date (double-check before submission)
        if (data.actual_end_date && data.start_date && new Date(data.actual_end_date + 'T00:00:00') < new Date(data.start_date + 'T00:00:00')) {
            toast.error('Return date cannot be before the original start date.');
            return; // Stop the submission
        }

        // --- Prepare Payload ---
        // Determine the cost value to send to the backend.
        // If the return is early (negative period difference) and cost is non-zero, negate the cost string.
        // Note: The validation above only *requires* non-zero cost if <= -7 days early.
        // We still negate the cost for *any* early return (periodDiffNum < 0) if a cost is entered.
        let costToSend = data.total_cost; // Default to the string value from the form
        if (data.period_difference !== null && !isNaN(periodDiffNum) && periodDiffNum < 0 && !isNaN(costNum) && costNum !== 0) {
            // Prepend '-' to the cost string for early returns with non-zero cost.
            costToSend = '-' + data.total_cost;
        }

        // Format the period difference (number) into a user-friendly string for the backend/display.
        const formattedPeriodDifference = formatPeriodDifference(data.period_difference);

        // Construct the final data payload for the PUT request.
        const submissionData = {
            actual_end_date: data.actual_end_date, // 'yyyy-MM-dd' string
            vehicle_status_id: data.status_id, // ID number/string or null
            user_id: data.user_id, // ID number/string or null
            notes: data.notes, // String
            period_difference: formattedPeriodDifference, // Formatted string (e.g., "2 days early")
            total_cost: costToSend, // Final cost/refund as a string (potentially negated)
        };

        // --- Perform PUT Request using Inertia ---
        put(url, {
            data: submissionData, // Payload defined above
            preserveScroll: true, // Maintain scroll position on validation errors
            onSuccess: () => {
                // Actions on successful submission
                reset(); // Reset form fields to initial values
                // Explicitly set default values again after reset
                setData('actual_end_date', formatDateForInput(new Date()));
                setData('total_cost', '0');
                onSubmitSuccess(); // Trigger the callback provided by the parent component
            },
            onError: (receivedErrors) => {
                // Actions on submission error (e.g., validation failure from backend)
                const currentErrors = receivedErrors as FormErrors; // Cast errors
                console.error('Submission Errors:', currentErrors);
                // Display specific error messages using toast notifications
                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        // Make field names more user-friendly for display
                        let userFriendlyFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                        // Specific overrides for better readability
                        if (field === 'vehicle_status_id') userFriendlyFieldName = 'Vehicle Status';
                        if (field === 'user_id') userFriendlyFieldName = 'Incharge By';
                        if (field === 'actual_end_date') userFriendlyFieldName = 'Actual Return Date';
                        if (field === 'period_difference') userFriendlyFieldName = 'Period Difference';
                        if (field === 'total_cost') userFriendlyFieldName = 'Final Cost';
                        // Show toast for each error message
                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    // Show a generic error message if no specific field errors are received
                    toast.error('Failed to process return. An unknown error occurred.');
                }
            },
        });
    };

    // --- Helper: Parse Date String ---
    /**
     * Safely parses a date string ('yyyy-MM-dd') into a Date object.
     * Appends 'T00:00:00' to mitigate timezone issues during parsing.
     * Returns undefined if the string is empty or invalid.
     * @param dateStr - The date string to parse.
     * @returns A Date object or undefined.
     */
    const parseDateString = (dateStr: string | null | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
            // Append time to ensure consistency across timezones when creating the Date object
            const date = new Date(dateStr + 'T00:00:00');
            // Check if the resulting date is valid
            return isNaN(date.getTime()) ? undefined : date;
        } catch {
            // Catch potential errors during Date construction (though less likely with the format)
            return undefined;
        }
    };

    // --- JSX ---
    return (
        <div className="px-4">
            {/* Display a summary card for the selected rental */}
            {selectedRow && (
                <Card className="bg-muted/30 mb-4">
                    <CardHeader>
                        <CardTitle>Returning Rental</CardTitle>
                        <CardDescription>
                            {/* Display key details of the rental being returned */}
                            Vehicle: {data.vehicle_no || 'Loading...'} | Original Start:{' '}
                            {data.start_date ? format(parseDateString(data.start_date)!, 'PPP') : 'N/A'} | Original End:{' '}
                            {data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : 'N/A'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Form element with onSubmit handler */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Return Details Section --- */}
                <FormSection title="Return Details" description="Specify the return date, condition, final cost, and responsible user.">
                    {/* Original Start Date (Read Only) */}
                    <FormField label="Original Start Date" htmlFor="start_date_display" readOnly>
                        <Input
                            id="start_date_display"
                            value={data.start_date ? format(parseDateString(data.start_date)!, 'PPP') : 'N/A'} // Format for display
                            readOnly
                            disabled // Visually and functionally disable
                            className="bg-muted/50 cursor-not-allowed" // Style as disabled
                        />
                    </FormField>

                    {/* Original End Date (Read Only) */}
                    <FormField label="Original End Date" htmlFor="end_date_display" readOnly>
                        <Input
                            id="end_date_display"
                            value={data.end_date ? format(parseDateString(data.end_date)!, 'PPP') : 'N/A'} // Format for display
                            readOnly
                            disabled // Visually and functionally disable
                            className="bg-muted/50 cursor-not-allowed" // Style as disabled
                        />
                    </FormField>

                    {/* Actual Return Date (Date Picker) */}
                    <FormField label="Actual Return Date" htmlFor="actual_end_date" error={formErrors.actual_end_date} required>
                        <Dialog open={actualEndDateDialogOpen} onOpenChange={setActualEndDateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="actual_end_date" // Match label htmlFor
                                    className={cn(
                                        'w-full justify-start text-left font-normal', // Base styling
                                        !data.actual_end_date && 'text-muted-foreground', // Style placeholder text
                                        formErrors.actual_end_date && 'border-red-500', // Highlight border on error
                                    )}
                                    disabled={processing || !data.start_date} // Disable if submitting or if start date isn't loaded yet
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" /> {/* Calendar icon */}
                                    {/* Display selected date formatted, or placeholder text */}
                                    {data.actual_end_date ? format(parseDateString(data.actual_end_date)!, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto py-6">
                                {/* Calendar component for date selection */}
                                <Calendar
                                    mode="single" // Allow selecting only one date
                                    selected={parseDateString(data.actual_end_date)} // Currently selected date
                                    onSelect={(date) => handleDateChange('actual_end_date', date)} // Handler for date selection
                                    // Disable dates before the original start date to prevent invalid input
                                    disabled={(date) => (data.start_date ? date < new Date(data.start_date + 'T00:00:00') : false)}
                                    initialFocus // Automatically focus the calendar when opened
                                />
                            </DialogContent>
                        </Dialog>
                    </FormField>

                    {/* Period Difference (Read Only, Calculated) */}
                    <FormField label="Return Difference" htmlFor="period-difference-display" error={formErrors.period_difference} readOnly>
                        <Input
                            id="period-difference-display"
                            name="period-difference-display" // Name attribute for potential form handling (though read-only)
                            value={formatPeriodDifference(data.period_difference)} // Display the formatted difference string
                            readOnly
                            disabled // Visually and functionally disable
                            placeholder="Calculated difference"
                            className={cn(
                                'bg-muted/50 cursor-not-allowed', // Style as disabled
                                formErrors.period_difference && 'border-red-500', // Highlight border on error (unlikely but possible)
                            )}
                            aria-label="Calculated difference from original end date"
                        />
                    </FormField>

                    {/* Final Cost (Editable Number Input) */}
                    <FormField label="Final Cost ($)" htmlFor="total_cost" error={formErrors.total_cost} required>
                        <Input
                            id="total_cost" // Match label htmlFor
                            name="total_cost" // Name corresponds to form data key
                            type="text" // Use text to allow custom input handling (decimals)
                            inputMode="decimal" // Hint for mobile keyboards to show decimal input
                            value={data.total_cost} // Controlled component value
                            onChange={handleInputChange} // Handler for input changes
                            placeholder="Enter final cost (e.g., adjustments, penalties)"
                            className={cn(formErrors.total_cost && 'border-red-500')} // Highlight border on error
                            disabled={processing} // Disable while form is submitting
                        />
                    </FormField>

                    {/* Vehicle Status After Return (Combobox) */}
                    <FormField label="Vehicle Status" htmlFor="return-status_name" error={formErrors.status_name || formErrors.status_id} required>
                        <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox" // ARIA role for accessibility
                                    aria-expanded={vehicleStatusDialogOpen} // ARIA state
                                    aria-label="Select vehicle status after return"
                                    id="return-status_name" // Match label htmlFor
                                    className={cn(
                                        'w-full justify-between', // Base styling
                                        !data.status_name && 'text-muted-foreground', // Style placeholder text
                                        (formErrors.status_name || formErrors.status_id) && 'border-red-500', // Highlight border on error
                                    )}
                                    disabled={processing || validVehicleStatuses.length === 0} // Disable if submitting or no statuses available
                                >
                                    {/* Display selected status name or placeholder */}
                                    {data.status_name ? data.status_name : 'Select status...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> {/* Dropdown indicator icon */}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                {/* Command component for searchable list */}
                                <Command>
                                    <CommandInput placeholder="Search status..." /> {/* Search input */}
                                    <CommandList>
                                        <CommandEmpty>No status found.</CommandEmpty> {/* Message when no results */}
                                        <CommandGroup>
                                            {/* Map through valid statuses to create list items */}
                                            {validVehicleStatuses.map((status) => (
                                                <CommandItem
                                                    key={status.id}
                                                    value={status.status_name} // Value used for search/selection
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('status_name', currentValue); // Update form state
                                                        setVehicleStatusDialogOpen(false); // Close dialog on select
                                                    }}
                                                >
                                                    {/* Checkmark icon for selected item */}
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.status_name === status.status_name ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {status.status_name} {/* Display status name */}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {/* Show message if no statuses are loaded */}
                        {validVehicleStatuses.length === 0 && !processing && (
                            <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available.</p>
                        )}
                    </FormField>

                    {/* User Processing Return (Combobox) */}
                    <FormField label="Incharge By" htmlFor="return-user_name" error={formErrors.user_name || formErrors.user_id} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    aria-label="Select user processing return"
                                    id="return-user_name" // Match label htmlFor
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground', // Style placeholder
                                        (formErrors.user_name || formErrors.user_id) && 'border-red-500', // Highlight on error
                                    )}
                                    disabled={processing || validUsers.length === 0} // Disable if submitting or no users available
                                >
                                    {/* Display selected user name or placeholder */}
                                    {data.user_name ? data.user_name : 'Select user...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> {/* Dropdown indicator */}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                {/* Command component for searchable list */}
                                <Command>
                                    <CommandInput placeholder="Search user..." /> {/* Search input */}
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty> {/* Message when no results */}
                                        <CommandGroup>
                                            {/* Map through valid users to create list items */}
                                            {validUsers.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name} // Value used for search/selection
                                                    onSelect={(currentValue) => {
                                                        handleComboboxChange('user_name', currentValue); // Update form state
                                                        setUserDialogOpen(false); // Close dialog on select
                                                    }}
                                                >
                                                    {/* Checkmark icon for selected item */}
                                                    <Check
                                                        className={cn('mr-2 h-4 w-4', data.user_name === user.name ? 'opacity-100' : 'opacity-0')}
                                                    />
                                                    {user.name} {/* Display user name */}
                                                    {/* Optionally display user email for clarity */}
                                                    {user.email && <span className="text-muted-foreground ml-2 text-xs">({user.email})</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {/* Show message if no users are loaded */}
                        {validUsers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No users available.</p>}
                    </FormField>
                </FormSection>

                {/* --- Additional Notes Section --- */}
                <FormSection title="Return Notes" description="Add any notes specific to this return (e.g., vehicle condition, issues).">
                    <FormField label="Notes" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        {/* Textarea for multiline notes */}
                        <textarea
                            id="notes" // Match label htmlFor
                            name="notes" // Corresponds to form data key
                            value={data.notes || ''} // Ensure value is controlled, default to empty string
                            onChange={handleInputChange} // Handler for changes
                            rows={4} // Default height
                            className={cn(
                                // Base textarea styling from shadcn/ui conventions
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500', // Highlight border on error
                                processing && 'disabled:opacity-70', // Reduce opacity when submitting
                            )}
                            placeholder="Enter any return-specific notes here..."
                            disabled={processing} // Disable while submitting
                        />
                    </FormField>
                </FormSection>

                {/* --- Form Actions Section (within SheetFooter for layout/styling) --- */}
                <SheetFooter>
                    {/* Flex container for buttons, responsive layout */}
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {/* Cancel Button (closes the sheet/modal) */}
                        <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={processing}>
                                Cancel
                            </Button>
                        </SheetClose>
                        {/* Submit Button */}
                        <Button type="submit" disabled={processing || !selectedRow} className="w-full sm:w-auto">
                            {/* Change button text based on processing state */}
                            {processing ? 'Processing Return...' : 'Confirm Return'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
