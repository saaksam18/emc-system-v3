import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// Assuming types are correctly defined and RentalsType includes vehicle status info
import { RentalsType, User, Vehicle, VehicleStatusType } from '@/types'; // Make sure RentalsType has vehicle.status.status_name or similar
import { Link, useForm } from '@inertiajs/react';
import { Bike, Check, ChevronsUpDown } from 'lucide-react';
import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// --- Reusable Components (Unchanged) ---
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
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    </div>
);

// --- Form state structure ---
type ChangeVehicleFormValues = {
    rental_id: number | string;
    customer_name: string; // Readonly original customer
    original_vehicle_no: string; // Readonly original vehicle
    original_vehicle_status_name: string; // SELECTABLE status for the ORIGINAL vehicle
    new_vehicle_no: string; // The NEW vehicle to assign
    new_vehicle_status_name: string; // SELECTABLE Status for the NEW vehicle
    user_name: string; // Incharge user
    notes: string;
};

// --- FormErrors type ---
type FormErrors = Partial<Record<keyof ChangeVehicleFormValues, string>>;

// --- Default values ---
const initialFormValues: ChangeVehicleFormValues = {
    rental_id: '',
    customer_name: '',
    original_vehicle_no: '',
    original_vehicle_status_name: '', // Initialize original status (will be populated)
    new_vehicle_no: '',
    new_vehicle_status_name: '', // Initialize new status
    user_name: '',
    notes: '',
};

// --- Main ChangeVehicle Component ---
interface ChangeVehicleProps {
    availableVehicles: Vehicle[] | null;
    // Assuming the same list of statuses is applicable for both original and new vehicle updates
    vehicleStatuses: VehicleStatusType[] | null;
    selectedRow: RentalsType | null;
    users: User[] | null;
    onSubmitSuccess: () => void;
}

export function ChangeVehicle({ selectedRow, availableVehicles, vehicleStatuses, users, onSubmitSuccess }: ChangeVehicleProps) {
    const { data, setData, put, processing, errors, reset, clearErrors, setError } = useForm<ChangeVehicleFormValues>(initialFormValues);
    const formErrors = errors as FormErrors;

    // State for Dialogs
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
    const [originalVehicleStatusDialogOpen, setOriginalVehicleStatusDialogOpen] = useState(false); // Dialog for original status
    const [newVehicleStatusDialogOpen, setNewVehicleStatusDialogOpen] = useState(false); // Dialog for new status

    // Effect to populate form when selectedRow changes
    useEffect(() => {
        if (selectedRow) {
            // Determine the initial status for the original vehicle

            const populatedData: ChangeVehicleFormValues = {
                rental_id: selectedRow.id ?? '',
                customer_name: selectedRow.customer?.name || selectedRow.full_name || '',
                original_vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || '',
                // *** Set initial value for original vehicle status ***
                original_vehicle_status_name: '',
                new_vehicle_no: '', // Start with no new vehicle selected
                new_vehicle_status_name: '', // Start with no new status selected
                user_name: '', // Start with no user selected
                notes: selectedRow.notes || '',
            };
            setData(populatedData);
            clearErrors();
        } else {
            reset();
            clearErrors();
        }
    }, [selectedRow, setData, reset, clearErrors]);

    // handleInputChange for text area
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'notes') {
            setData(name, value);
            if (formErrors[name]) {
                clearErrors(name);
            }
        }
    };

    // handleComboboxChange for user, new vehicle, and BOTH status fields
    const handleComboboxChange = (
        name: 'user_name' | 'new_vehicle_no' | 'original_vehicle_status_name' | 'new_vehicle_status_name',
        value: string,
    ) => {
        setData(name, value);
        if (formErrors[name]) {
            clearErrors(name);
        }
    };

    // --- Memoized Options (Simplified & Validated) ---
    const validVehicles = useMemo(
        () =>
            Array.isArray(availableVehicles)
                ? availableVehicles.filter((v): v is Vehicle => !!v && !!v.id && typeof v.vehicle_no === 'string' && v.vehicle_no !== '')
                : [],
        [availableVehicles],
    );

    // Use vehicleStatuses prop for BOTH comboboxes (can be adjusted if needed)
    const validVehicleStatusesForSelection = useMemo(
        () =>
            Array.isArray(vehicleStatuses)
                ? vehicleStatuses.filter(
                      (vs): vs is VehicleStatusType & { id: string | number; status_name: string } =>
                          !!vs && !!vs.id && typeof vs.status_name === 'string' && vs.status_name !== '',
                  )
                : [],
        [vehicleStatuses],
    );

    const validUsers = useMemo(
        () => (Array.isArray(users) ? users.filter((u): u is User => !!u && !!u.id && typeof u.name === 'string' && u.name !== '') : []),
        [users],
    );

    // --- Form Submission ---
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        if (!data.rental_id) {
            toast.error('Cannot submit: Rental ID is missing.');
            console.error('Submit blocked: rental_id is missing from form data.', data);
            return;
        }

        const url = `/rentals/${data.rental_id}/update/change-vehicle-contract`;

        // --- Client-Side Validation ---
        let hasValidationError = false;
        const validationErrors: Partial<Record<keyof ChangeVehicleFormValues, string>> = {};

        if (!data.original_vehicle_status_name) {
            // Make original status required if needed
            validationErrors.original_vehicle_status_name = 'Original vehicle status selection is required.';
            hasValidationError = true;
        }
        if (!data.new_vehicle_no) {
            validationErrors.new_vehicle_no = 'New vehicle selection is required.';
            hasValidationError = true;
        }
        if (!data.new_vehicle_status_name) {
            validationErrors.new_vehicle_status_name = 'New vehicle status is required.';
            hasValidationError = true;
        }
        if (!data.user_name) {
            validationErrors.user_name = 'Incharge user is required.';
            hasValidationError = true;
        }

        if (hasValidationError) {
            setError(validationErrors);
            toast.error('Please correct the errors in the form.');
            return;
        }

        // --- Submit Data ---
        put(url, {
            preserveScroll: true,
            onSuccess: () => {
                // Reset form, keeping read-only fields and resetting selections
                if (selectedRow) {
                    setData({
                        ...initialFormValues, // Reset editable fields
                        rental_id: selectedRow.id ?? '',
                        customer_name: selectedRow.customer?.name || selectedRow.full_name || '',
                        original_vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || '',
                        original_vehicle_status_name: '', // Reset original status to initial value
                        new_vehicle_no: '', // Clear selection
                        new_vehicle_status_name: '', // Clear selection
                        user_name: '', // Clear selection
                        notes: selectedRow.notes || '', // Optionally keep notes
                    });
                } else {
                    reset(); // Full reset if no row was selected initially
                }
                onSubmitSuccess();
            },
            onError: (receivedErrors) => {
                const currentErrors = receivedErrors as FormErrors;
                console.error('Submission Errors:', currentErrors);

                if (currentErrors && Object.keys(currentErrors).length > 0) {
                    Object.entries(currentErrors).forEach(([field, errorMessage]) => {
                        let userFriendlyFieldName = field;
                        // Map field names for user-friendly messages
                        if (field === 'original_vehicle_status_name')
                            userFriendlyFieldName = 'Original Vehicle Status'; // Added mapping
                        else if (field === 'new_vehicle_no') userFriendlyFieldName = 'New Vehicle No';
                        else if (field === 'new_vehicle_status_name') userFriendlyFieldName = 'New Vehicle Status';
                        else if (field === 'user_name') userFriendlyFieldName = 'Incharge By';
                        else userFriendlyFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

                        if (errorMessage) {
                            toast.error(`${userFriendlyFieldName}: ${errorMessage}`);
                        }
                    });
                } else {
                    toast.error('Failed to process vehicle change. An unknown error occurred.');
                }
            },
            onFinish: () => {
                // Optional: Cleanup or final actions
            },
        });
    };

    // --- Conditional Rendering ---
    if (!selectedRow && !processing) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">No rental selected for vehicle change.</div>;
    }
    if (processing && data.rental_id !== selectedRow?.id) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Loading rental data...</div>;
    }
    if (!data.rental_id && selectedRow) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">Initializing form...</div>;
    }

    // --- JSX Structure ---
    return (
        <div className="px-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer & Original Vehicle Section (Read-Only Fields) */}
                <FormSection title="Customer & Original Vehicle" description="Details of the current rental agreement.">
                    {/* Customer Name Field */}
                    <FormField label="Customer" htmlFor="customer_name">
                        <Input id="customer_name" name="customer_name" value={data.customer_name} readOnly disabled className="bg-muted/50" />
                    </FormField>
                    {/* Original Vehicle Number Field */}
                    <FormField label="Original Vehicle" htmlFor="original_vehicle_no">
                        <Input
                            id="original_vehicle_no"
                            name="original_vehicle_no"
                            value={data.original_vehicle_no}
                            readOnly
                            disabled
                            className="bg-muted/50"
                        />
                    </FormField>
                    {/* *** Original Vehicle Status Combobox (SELECTABLE) *** */}
                    <FormField
                        label="Original Vehicle Status"
                        htmlFor="change-original_vehicle_status_name"
                        error={formErrors.original_vehicle_status_name}
                        required // Make required if necessary
                    >
                        <Dialog open={originalVehicleStatusDialogOpen} onOpenChange={setOriginalVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={originalVehicleStatusDialogOpen}
                                    aria-label="Select original vehicle status"
                                    id="change-original_vehicle_status_name" // Unique ID
                                    className={cn(
                                        'w-full justify-between',
                                        !data.original_vehicle_status_name && 'text-muted-foreground', // Check data field
                                        formErrors.original_vehicle_status_name && 'border-red-500', // Check error field
                                    )}
                                    disabled={processing || validVehicleStatusesForSelection.length === 0}
                                >
                                    {/* Check data field */}
                                    {data.original_vehicle_status_name ? data.original_vehicle_status_name : 'Select status...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search status..." />
                                    <CommandList>
                                        <CommandEmpty>No status found.</CommandEmpty>
                                        <CommandGroup>
                                            {/* Use shared status list */}
                                            {validVehicleStatusesForSelection.map((status) => (
                                                <CommandItem
                                                    key={`${status.id}-original`} // Ensure unique key if list is reused
                                                    value={status.status_name}
                                                    onSelect={(currentValue) => {
                                                        const selectedStatus = validVehicleStatusesForSelection.find(
                                                            (s) => s.status_name.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        const actualStatusName = selectedStatus ? selectedStatus.status_name : '';
                                                        handleComboboxChange(
                                                            'original_vehicle_status_name', // Update correct field
                                                            // Toggle logic might not be desired here, depends on UX. Simple set:
                                                            // actualStatusName === data.original_vehicle_status_name ? '' : actualStatusName,
                                                            actualStatusName, // Just set the value
                                                        );
                                                        setOriginalVehicleStatusDialogOpen(false); // Close this dialog
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            // Check correct data field
                                                            data.original_vehicle_status_name === status.status_name ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {status.status_name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {validVehicleStatusesForSelection.length === 0 && !processing && (
                            <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available for selection.</p>
                        )}
                    </FormField>
                </FormSection>

                {/* Change Details Section (Editable Fields) */}
                <FormSection title="Change Details" description="Select the new vehicle, update statuses, and assign the user in charge.">
                    {/* New Vehicle Combobox */}
                    <FormField label="New Vehicle No" htmlFor="change-new_vehicle_no" error={formErrors.new_vehicle_no} required>
                        <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleDialogOpen}
                                    aria-label="Select new vehicle"
                                    id="change-new_vehicle_no"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.new_vehicle_no && 'text-muted-foreground',
                                        formErrors.new_vehicle_no && 'border-red-500',
                                    )}
                                    disabled={processing || validVehicles.length === 0}
                                >
                                    {data.new_vehicle_no
                                        ? validVehicles.find((vehicle) => vehicle.vehicle_no === data.new_vehicle_no)?.vehicle_no
                                        : 'Select new vehicle...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-dialog-content-width] overflow-y-auto p-0 sm:w-[--radix-Dialog-trigger-width]">
                                <Command>
                                    <CommandInput placeholder="Search vehicle no..." />
                                    <CommandList>
                                        <CommandEmpty>No vehicle found.</CommandEmpty>
                                        <CommandGroup>
                                            {validVehicles.map((vehicle) => (
                                                <CommandItem
                                                    key={vehicle.id}
                                                    value={vehicle.vehicle_no}
                                                    onSelect={(currentValue) => {
                                                        const selectedVehicle = validVehicles.find(
                                                            (v) => v.vehicle_no.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        const actualVehicleNo = selectedVehicle ? selectedVehicle.vehicle_no : '';
                                                        handleComboboxChange(
                                                            'new_vehicle_no',
                                                            actualVehicleNo === data.new_vehicle_no ? '' : actualVehicleNo,
                                                        );
                                                        setVehicleDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            data.new_vehicle_no === vehicle.vehicle_no ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {vehicle.vehicle_no}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                <Button variant="ghost" asChild className="m-1">
                                    <Link href={'/vehicles'} className="flex w-full shrink-0 items-center justify-center gap-2 text-sm sm:w-auto">
                                        <Bike className="mr-1 h-4 w-4" /> Check Vehicle Stocks
                                    </Link>
                                </Button>
                            </DialogContent>
                        </Dialog>
                        {validVehicles.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No vehicles available.</p>}
                    </FormField>

                    {/* *** New Vehicle Status Combobox (SELECTABLE) *** */}
                    <FormField
                        label="New Vehicle Status"
                        htmlFor="change-new_vehicle_status_name"
                        error={formErrors.new_vehicle_status_name}
                        required
                    >
                        <Dialog open={newVehicleStatusDialogOpen} onOpenChange={setNewVehicleStatusDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={newVehicleStatusDialogOpen}
                                    aria-label="Select new vehicle status"
                                    id="change-new_vehicle_status_name" // Keep this ID
                                    className={cn(
                                        'w-full justify-between',
                                        !data.new_vehicle_status_name && 'text-muted-foreground', // Check data field
                                        formErrors.new_vehicle_status_name && 'border-red-500', // Check error field
                                    )}
                                    disabled={processing || validVehicleStatusesForSelection.length === 0}
                                >
                                    {/* Check data field */}
                                    {data.new_vehicle_status_name ? data.new_vehicle_status_name : 'Select status...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                <Command>
                                    <CommandInput placeholder="Search status..." />
                                    <CommandList>
                                        <CommandEmpty>No status found.</CommandEmpty>
                                        <CommandGroup>
                                            {/* Use shared status list */}
                                            {validVehicleStatusesForSelection.map((status) => (
                                                <CommandItem
                                                    key={`${status.id}-new`} // Ensure unique key
                                                    value={status.status_name}
                                                    onSelect={(currentValue) => {
                                                        const selectedStatus = validVehicleStatusesForSelection.find(
                                                            (s) => s.status_name.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        const actualStatusName = selectedStatus ? selectedStatus.status_name : '';
                                                        handleComboboxChange(
                                                            'new_vehicle_status_name', // Update correct field
                                                            actualStatusName === data.new_vehicle_status_name ? '' : actualStatusName, // Toggle selection
                                                        );
                                                        setNewVehicleStatusDialogOpen(false); // Close this dialog
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            // Check correct data field
                                                            data.new_vehicle_status_name === status.status_name ? 'opacity-100' : 'opacity-0',
                                                        )}
                                                    />
                                                    {status.status_name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {validVehicleStatusesForSelection.length === 0 && !processing && (
                            <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available for selection.</p>
                        )}
                    </FormField>

                    {/* User (Incharge By) Combobox */}
                    <FormField label="Incharge By" htmlFor="change-user_name" error={formErrors.user_name} required>
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userDialogOpen}
                                    aria-label="Select user"
                                    id="change-user_name"
                                    className={cn(
                                        'w-full justify-between',
                                        !data.user_name && 'text-muted-foreground',
                                        formErrors.user_name && 'border-red-500',
                                    )}
                                    disabled={processing || validUsers.length === 0}
                                >
                                    {data.user_name
                                        ? (validUsers.find((user) => user.name === data.user_name)?.name ?? 'Select user...')
                                        : 'Select user...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] w-[--radix-dialog-content-width] overflow-y-auto p-0 sm:w-[--radix-Dialog-trigger-width]">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            {validUsers.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name}
                                                    onSelect={(currentValue) => {
                                                        const selectedUser = validUsers.find(
                                                            (u) => u.name.toLowerCase() === currentValue.toLowerCase(),
                                                        );
                                                        handleComboboxChange('user_name', selectedUser ? selectedUser.name : '');
                                                        setUserDialogOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn('mr-2 h-4 w-4', data.user_name === user.name ? 'opacity-100' : 'opacity-0')}
                                                    />
                                                    {user.name}
                                                    {user.email && <span className="text-muted-foreground ml-2 text-xs">({user.email})</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DialogContent>
                        </Dialog>
                        {validUsers.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No users available.</p>}
                    </FormField>
                </FormSection>

                {/* Additional Notes Section */}
                <FormSection title="Additional Notes" description="Update any relevant notes about this vehicle change.">
                    <FormField label="Notes" htmlFor="change-notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="change-notes"
                            name="notes"
                            value={data.notes || ''}
                            onChange={handleInputChange}
                            rows={4}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500',
                            )}
                            placeholder="Enter any notes specific to this vehicle change..."
                            disabled={processing}
                        />
                    </FormField>
                </FormSection>

                {/* Form Actions Section (Footer) */}
                <SheetFooter>
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={processing}>
                                Cancel
                            </Button>
                        </SheetClose>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (selectedRow) {
                                    const initialOriginalStatus = selectedRow.vehicle?.status?.status_name || '';
                                    setData({
                                        ...initialFormValues,
                                        rental_id: selectedRow.id ?? '',
                                        customer_name: selectedRow.customer?.name || selectedRow.full_name || '',
                                        original_vehicle_no: selectedRow.vehicle?.vehicle_no || selectedRow.vehicle_no || '',
                                        original_vehicle_status_name: initialOriginalStatus, // Reset original status
                                        new_vehicle_no: '',
                                        new_vehicle_status_name: '',
                                        user_name: '',
                                        notes: selectedRow.notes || '',
                                    });
                                } else {
                                    reset();
                                }
                                clearErrors();
                            }}
                            disabled={processing}
                        >
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={processing || !data.rental_id} className="w-full sm:w-auto">
                            {processing ? 'Processing...' : 'Save Change'}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </div>
    );
}
