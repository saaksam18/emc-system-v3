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
import { ContactTypes } from '@/types';
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

export interface TableMeta {
    createContactTypes: (contactTypes: ContactTypes) => void; // Function to show details sheet
    editContactTypes: (contactTypes: ContactTypes) => void; // Renamed for clarity
    showDetails: (contactTypes: ContactTypes) => void; // Function to show details sheet
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
}

// --- Column Definitions (No functional changes needed here for moving the filter) ---
export const columns: ColumnDef<ContactTypes, TableMeta>[] = [
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
        accessorKey: 'name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.name || 'N/A',
    },
    {
        accessorKey: 'description',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Description
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => row.original.description || 'N/A',
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
            const contactTypes = row.original;
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
                const toastId = toast.loading(`Deleting contact type ${contactTypes.name || contactTypes.id}...`);
                // Call the destroy route (ensure 'customers.destroy' matches your route name)
                destroy(route('customers.settings.contact-type.destroy', contactTypes.id), {
                    // Use customer.id
                    preserveScroll: true, // Keep scroll position
                    preserveState: true, // Keep component state if possible
                    data: { password: deleteData.password }, // Send password
                    onSuccess: () => {
                        // Show success toast on successful deletion
                        toast.success(`Contact type ${contactTypes.name || contactTypes.id} deleted successfully.`, { id: toastId });
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
                            toast.error(`Failed to delete contact type ${contactTypes.name || contactTypes.id}. Please try again.`, { id: toastId });
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
                    meta.showDetails(contactTypes); // Call the function passed from parent
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
                if (meta?.editContactTypes) {
                    meta.editContactTypes(contactTypes); // Call the function passed from parent
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
                            {/* <DropdownMenuItem onSelect={handleDetailsClick} className="cursor-pointer">
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                            </DropdownMenuItem> */}
                            {/* Edit Action Item */}
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />
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
                            <DialogTitle>Delete Contact Type: {contactTypes.full_name || contactTypes.id}</DialogTitle>
                            <DialogDescription>
                                Are you sure? This action cannot be undone. Enter your administrator password to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Delete Form */}
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${contactTypes.id}`}>Administrator Password</Label>
                                <Input
                                    id={`delete-password-${contactTypes.id}`} // Unique ID for accessibility
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
                                    {processingDelete ? 'Deleting...' : 'Delete Contact Type'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
