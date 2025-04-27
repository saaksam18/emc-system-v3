'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'; // Import Command components
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // Assuming cn utility is here
import { RentalsType, VehicleStatusType } from '@/types'; // Assuming types are defined here
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Check, ChevronsUpDown, Info, MoreHorizontal, Trash2, UserRoundPen } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

// Helper component for displaying input errors
const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

// Define the structure for metadata passed to the table
export interface TableMeta {
    create: (rental: RentalsType) => void;
    edit: (rental: RentalsType) => void;
    show: (rental: RentalsType) => void;
    vehicleStatuses: VehicleStatusType[] | null; // Ensure this is passed
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
}

// --- Column Definitions ---
export const columns: ColumnDef<RentalsType, TableMeta>[] = [
    // ... other column definitions remain the same ...
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                ID <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('id')}</div>,
    },
    {
        accessorKey: 'vehicle_no',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Vehicle No <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.vehicle_no || 'N/A',
    },
    {
        accessorKey: 'full_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.full_name || 'N/A',
    },
    {
        id: 'primary_contact_and_count',
        accessorKey: 'primary_contact_type',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Primary Contact <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const type = row.original.primary_contact_type;
            const contact = row.original.primary_contact;
            const count = row.original.active_contact_count;
            return (
                <div className="flex items-center space-x-2">
                    <span className="font-bold">{type}:</span>
                    <span>{contact}</span>
                    {count > 0 && <Badge variant="secondary">Total: {count}</Badge>}
                </div>
            );
        },
    },
    {
        id: 'primary_deposit_and_count',
        accessorKey: 'primary_deposit_type',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Primary Deposit <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const type = row.original.primary_deposit_type;
            const deposit = row.original.primary_deposit;
            const count = row.original.active_deposits_count;
            return (
                <div className="flex items-center space-x-2">
                    <span className="font-bold">{type}:</span>
                    <span>{deposit}</span>
                    {count > 0 && <Badge variant="secondary">Total: {count}</Badge>}
                </div>
            );
        },
    },
    {
        accessorKey: 'status_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Status <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const status = row.original.status_name;
            return (
                <div className="flex items-center space-x-2">
                    <Badge variant="default">{status}</Badge>
                </div>
            );
        },
    },
    {
        accessorKey: 'start_date',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Start Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const startDate = new Date(row.original.start_date);
                return startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
                return 'N/A';
            }
        },
    },
    {
        accessorKey: 'end_date',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                End Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const endDate = new Date(row.original.end_date);
                return endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
                return 'N/A';
            }
        },
    },
    {
        accessorKey: 'total_cost',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Price <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('total_cost'));
            const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'notes',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Note <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.notes || 'N/A',
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Registered <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const createdAt = new Date(row.original.created_at);
                return createdAt.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            } catch (e) {
                return row.original.created_at;
            }
        },
    },
    {
        accessorKey: 'incharger_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Incharger <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.incharger_name || 'N/A',
    },
    {
        accessorKey: 'user_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Inputer <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.user_name || 'N/A',
    },
    // --- Updated Actions Column ---
    {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row, table }) => {
            const rental = row.original;
            const meta = table.options.meta as TableMeta | undefined; // Access meta

            // --- FIX: Ensure vehicleStatuses is always an array ---
            // Check if meta.vehicleStatuses exists and is an array, otherwise default to empty array
            const vehicleStatuses = meta?.vehicleStatuses && Array.isArray(meta.vehicleStatuses) ? meta.vehicleStatuses : [];
            // --- End FIX ---

            // State for the delete confirmation dialog
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
            // State to control the dropdown menu visibility
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            // State for the vehicle status combobox dialog
            const [vehicleStatusDialogOpen, setVehicleStatusDialogOpen] = useState(false);

            // Ref for the password input in the delete dialog
            const passwordInput = React.useRef<HTMLInputElement>(null);

            // Inertia form hook for handling the delete operation
            const {
                data: deleteData,
                setData: setDeleteData,
                delete: destroy,
                processing: processingDelete,
                errors: deleteErrors,
                reset: resetDeleteForm,
                clearErrors: clearDeleteErrors,
            } = useForm({
                password: '',
                status_name: '', // Add status_name to the form data
                // You might need to add status_id if your backend requires it
                // status_id: null,
            });

            // Filter for valid vehicle statuses (now guaranteed that vehicleStatuses is an array)
            // Line 268 from the original error report
            const validVehicleStatuses = vehicleStatuses.filter((status) => status && status.id && status.status_name);

            // --- Handle Delete Submission ---
            const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                clearDeleteErrors(); // Clear previous errors

                // Find the selected status object to potentially get the ID
                const selectedStatus = validVehicleStatuses.find(
                    (status) => status.status_name.toLowerCase() === deleteData.status_name.toLowerCase(),
                );

                // Show loading toast
                const toastId = toast.loading(`Returning rental contract for ${rental.full_name || rental.id}...`);

                // Prepare data to send
                const submissionData: { password: string; status_name: string; status_id?: number } = {
                    password: deleteData.password,
                    status_name: deleteData.status_name,
                };
                // Include status_id if found and needed by backend
                if (selectedStatus) {
                    // submissionData.status_id = selectedStatus.id; // Uncomment if backend needs status_id
                }

                // Call the destroy route
                destroy(route('rentals.destroy', rental.id), {
                    preserveScroll: true,
                    preserveState: true,
                    data: submissionData, // Send password and status_name (and potentially status_id)
                    onSuccess: () => {
                        toast.success(`Rental contract for ${rental.full_name || rental.id} returned successfully.`, { id: toastId });
                        closeDeleteModal();
                    },
                    onError: (errorResponse) => {
                        console.error('Return rental contract error:', errorResponse);
                        // Handle specific errors (password, status_name, etc.)
                        if (errorResponse.password) {
                            toast.error(errorResponse.password, { id: toastId });
                            passwordInput.current?.focus();
                        } else if (errorResponse.status_name) {
                            toast.error(errorResponse.status_name, { id: toastId });
                            // Potentially focus the status combobox trigger if possible/needed
                        } else {
                            // Construct a more informative generic error message
                            const message =
                                errorResponse.message || `Failed to return rental contract for ${rental.full_name || rental.id}. Please try again.`;
                            toast.error(message, { id: toastId });
                        }
                    },
                });
            };

            // --- Close Delete Modal ---
            const closeDeleteModal = () => {
                setIsDeleteDialogOpen(false);
                resetDeleteForm(); // Reset the entire form (password and status_name)
                clearDeleteErrors();
            };

            // --- Reset Form on Dialog Close ---
            useEffect(() => {
                if (!isDeleteDialogOpen) {
                    resetDeleteForm();
                    clearDeleteErrors();
                }
            }, [isDeleteDialogOpen, resetDeleteForm, clearDeleteErrors]);

            // --- Handle Details Click ---
            const handleDetailsClick = () => {
                setIsDropdownOpen(false);
                if (meta?.show) {
                    meta.show(rental);
                } else {
                    console.warn('show function not found in table meta options.');
                    toast.error('Could not show details.');
                }
            };

            // --- Handle Edit Click ---
            const handleEditClick = () => {
                setIsDropdownOpen(false);
                if (meta?.edit) {
                    meta.edit(rental);
                } else {
                    console.warn('edit function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            // --- Handle Combobox Change ---
            // Updates the form state when a status is selected from the combobox
            const handleStatusSelect = (currentValue: string) => {
                // currentValue from CommandItem is already lowercased
                const selectedStatusNameLower = currentValue === deleteData.status_name.toLowerCase() ? '' : currentValue;

                // Find the full status object based on the selected name (case-insensitive comparison)
                const selectedStatus = validVehicleStatuses.find((status) => status.status_name.toLowerCase() === selectedStatusNameLower);

                setDeleteData((prevData) => ({
                    ...prevData,
                    // Store the actual name with original casing if found, otherwise empty string
                    status_name: selectedStatus ? selectedStatus.status_name : '',
                    // status_id: selectedStatus ? selectedStatus.id : null, // Store ID if needed
                }));
                setVehicleStatusDialogOpen(false); // Close the combobox dialog
            };

            return (
                // Delete Confirmation Dialog Wrapper
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    {/* Actions Dropdown Menu */}
                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:cursor-pointer">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleDetailsClick} className="cursor-pointer">
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <UserRoundPen className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            {/* Return Action Item (Triggers Delete Dialog) */}
                            <DialogTrigger asChild>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setIsDropdownOpen(false);
                                        // Dialog opening is handled by DialogTrigger
                                    }}
                                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Return</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Delete Dialog Content */}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            {/* Updated Title */}
                            <DialogTitle>Return Rental Contract for {rental.full_name || rental.id}</DialogTitle>
                            <DialogDescription>
                                Select the vehicle's return status and enter your administrator password to confirm. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Delete Form */}
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            {/* Vehicle Status Combobox */}
                            <div className="grid gap-2">
                                <Label htmlFor={`return-status-${rental.id}`}>
                                    Vehicle Status <span className="text-red-500">*</span>
                                </Label>
                                <Dialog open={vehicleStatusDialogOpen} onOpenChange={setVehicleStatusDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={vehicleStatusDialogOpen}
                                            aria-label="Select vehicle return status"
                                            id={`return-status-${rental.id}`}
                                            className={cn(
                                                'w-full justify-between',
                                                !deleteData.status_name && 'text-muted-foreground', // Style if no status selected
                                                deleteErrors.status_name && 'border-red-500', // Highlight if error
                                            )}
                                            disabled={processingDelete || validVehicleStatuses.length === 0}
                                        >
                                            {deleteData.status_name
                                                ? validVehicleStatuses.find(
                                                      // Find based on stored name (case-insensitive comparison)
                                                      (status) => status.status_name.toLowerCase() === deleteData.status_name.toLowerCase(),
                                                  )?.status_name // Display the actual name
                                                : 'Select status...'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[80vh] w-[--radix-Dialog-trigger-width] overflow-y-auto p-0">
                                        <Command>
                                            <CommandInput placeholder="Search status..." />
                                            <CommandList>
                                                <CommandEmpty>No status found.</CommandEmpty>
                                                <CommandGroup>
                                                    {validVehicleStatuses.map((status) => (
                                                        <CommandItem
                                                            key={status.id} // Use unique ID for key
                                                            // Value used for searching/filtering (lowercase)
                                                            value={status.status_name.toLowerCase()}
                                                            onSelect={handleStatusSelect} // Use the updated handler
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    // Check against the status_name stored in form state (case-insensitive)
                                                                    deleteData.status_name.toLowerCase() === status.status_name.toLowerCase()
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )}
                                                            />
                                                            {status.status_name} {/* Display the status name */}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </DialogContent>
                                </Dialog>
                                {validVehicleStatuses.length === 0 && !processingDelete && (
                                    <p className="text-muted-foreground mt-1 text-sm">No vehicle statuses available.</p>
                                )}
                                {/* Display status_name error */}
                                <InputError message={deleteErrors.status_name} />
                            </div>

                            {/* Administrator Password Input */}
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${rental.id}`}>
                                    Administrator Password <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id={`delete-password-${rental.id}`}
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={deleteData.password}
                                    onChange={(e) => setDeleteData('password', e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                    className={deleteErrors.password ? 'border-red-500' : ''}
                                    disabled={processingDelete}
                                />
                                <InputError message={deleteErrors.password} />
                            </div>

                            {/* Dialog Footer with Actions */}
                            <DialogFooter className="gap-2 pt-4 sm:gap-1">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={closeDeleteModal}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    // Disable if processing, no password, or no status selected
                                    disabled={processingDelete || !deleteData.password || !deleteData.status_name}
                                >
                                    {processingDelete ? 'Returning...' : 'Confirm Return'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
