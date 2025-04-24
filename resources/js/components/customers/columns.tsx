'use client';

import { Button } from '@/components/ui/button';
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
import { Customers } from '@/types';
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Info, MoreHorizontal, Trash2, UserRoundPen } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

export interface TableMeta {
    createCustomer: (customer: Customers) => void; // Function to show details sheet
    editCustomer: (customer: Customers) => void; // Renamed for clarity
    showDetails: (customer: Customers) => void; // Function to show details sheet
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
}

// --- Column Definitions (No functional changes needed here for moving the filter) ---
export const columns: ColumnDef<Customers, TableMeta>[] = [
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
        accessorKey: 'full_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.full_name || 'N/A',
    },
    {
        accessorKey: 'gender',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Gender <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.gender || 'N/A',
    },
    {
        accessorKey: 'nationality',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Nationality <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.nationality || 'N/A',
    },
    // Year Column
    {
        accessorKey: 'date_of_birth',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Date of Birth <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.date_of_birth || 'N/A',
    },
    {
        // Combine Phone and Contact Count
        id: 'primary_contact_and_count', // Give a unique ID
        accessorKey: 'primary_contact_type', // Still allows sorting by primary_contact_type if needed
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Primary Contact <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const type = row.original.primary_contact_type;
            const contact = row.original.primary_contact;
            const count = row.original.active_contacts_count;
            return (
                // Use flex to position phone and badge
                <div className="flex items-center space-x-2">
                    <span className="font-bold">{type}:</span>
                    <span>{contact}</span>
                    {/* Conditionally render badge only if count > 0 */}
                    {count > 0 && <Badge variant="secondary">Total: {count}</Badge>}
                </div>
            );
        },
    },
    // Daily Rental Price Column
    {
        accessorKey: 'address',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Address
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => row.original.address || 'N/A',
    },
    {
        accessorKey: 'passport_number',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Passport Number <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.passport_number || 'N/A',
    },
    {
        accessorKey: 'passport_expiry',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Passport Expiry <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.passport_expiry || 'N/A',
    },
    {
        accessorKey: 'notes',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Note
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
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
            // Get the specific customer data for this row
            const customer = row.original;
            // State for the delete confirmation dialog
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
            // State to control the dropdown menu visibility
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
            } = useForm({ password: '' });

            // --- Handle Delete Submission ---
            const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                clearDeleteErrors('password'); // Clear previous password errors
                // Show loading toast
                const toastId = toast.loading(`Deleting customer ${customer.full_name || customer.id}...`);
                // Call the destroy route (ensure 'customers.destroy' matches your route name)
                destroy(route('customers.destroy', customer.id), {
                    // Use customer.id
                    preserveScroll: true, // Keep scroll position
                    preserveState: true, // Keep component state if possible
                    data: { password: deleteData.password }, // Send password
                    onSuccess: () => {
                        // Show success toast on successful deletion
                        toast.success(`Customer ${customer.full_name || customer.id} deleted successfully.`, { id: toastId });
                        closeDeleteModal(); // Close the dialog
                    },
                    onError: (errorResponse) => {
                        // Log error and show error toast
                        console.error('Deletion error:', errorResponse);
                        if (errorResponse.password) {
                            // Specific password error
                            toast.error(errorResponse.password, { id: toastId });
                            passwordInput.current?.focus(); // Focus the password input
                        } else {
                            // Generic error
                            toast.error(`Failed to delete customer ${customer.full_name || customer.id}. Please try again.`, { id: toastId });
                        }
                    },
                });
            };

            // --- Close Delete Modal ---
            const closeDeleteModal = () => {
                setIsDeleteDialogOpen(false); // Close the dialog
                resetDeleteForm('password'); // Reset the password field
                clearDeleteErrors(); // Clear any validation errors
            };

            // --- Reset Form on Dialog Close ---
            // Effect to reset the delete form when the dialog closes
            useEffect(() => {
                if (!isDeleteDialogOpen) {
                    resetDeleteForm('password');
                    clearDeleteErrors();
                }
            }, [isDeleteDialogOpen, resetDeleteForm, clearDeleteErrors]);

            // --- Handle Details Click ---
            const handleDetailsClick = () => {
                setIsDropdownOpen(false); // Close the dropdown
                // Access meta from table options, ensuring it exists and has showDetails
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.showDetails) {
                    meta.showDetails(customer); // Call the function passed from parent
                } else {
                    // Warn if the function is missing
                    console.warn('showDetails function not found in table meta options.');
                    toast.error('Could not show details.');
                }
            };

            // --- Handle Edit Click ---
            const handleEditClick = () => {
                setIsDropdownOpen(false); // Close the dropdown
                // Access meta from table options, ensuring it exists and has editCustomer
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.editCustomer) {
                    meta.editCustomer(customer); // Call the function passed from parent
                } else {
                    // Warn if the function is missing
                    console.warn('editCustomer function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            return (
                // Delete Confirmation Dialog
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    {/* Actions Dropdown Menu */}
                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            {/* Button to open the dropdown */}
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:cursor-pointer">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {/* Details Action Item */}
                            <DropdownMenuItem onSelect={handleDetailsClick} className="cursor-pointer">
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                            </DropdownMenuItem>
                            {/* Edit Action Item */}
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <UserRoundPen className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            {/* Delete Action Item (Triggers Dialog) */}
                            <DialogTrigger asChild>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        // Prevent default selection behavior which might close dropdown prematurely
                                        e.preventDefault();
                                        // Manually close dropdown before opening dialog
                                        setIsDropdownOpen(false);
                                        // Dialog opening is handled by DialogTrigger
                                    }}
                                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Delete Dialog Content */}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Delete Customer: {customer.full_name || customer.id}</DialogTitle>
                            <DialogDescription>
                                Are you sure? This action cannot be undone. Enter your administrator password to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Delete Form */}
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${customer.id}`}>Administrator Password</Label>
                                <Input
                                    id={`delete-password-${customer.id}`} // Unique ID for accessibility
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={deleteData.password}
                                    onChange={(e) => setDeleteData('password', e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password" // Help password managers
                                    className={deleteErrors.password ? 'border-red-500' : ''} // Highlight if error
                                    disabled={processingDelete} // Disable while deleting
                                />
                                <InputError message={deleteErrors.password} />
                            </div>
                            <DialogFooter className="gap-2 pt-4 sm:gap-1">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={closeDeleteModal}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" variant="destructive" disabled={processingDelete || !deleteData.password}>
                                    {processingDelete ? 'Deleting...' : 'Delete Customer'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
