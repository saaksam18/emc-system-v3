'use client';

import { Permission, Role } from '@/types';
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, FilePenLine, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner'; // Import toast from sonner

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader, // Use DialogHeader for better structure
    DialogTitle,
    DialogTrigger, // Keep DialogTrigger for now, but manage state explicitly
} from '@/components/ui/dialog'; // Make sure path is correct
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
import React, { useEffect, useState } from 'react';

// Helper component for input errors
const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

// Define Table Meta Interface
export interface TableMeta {
    editRole: (role: Role) => void;
    permissions?: Permission[] | null | undefined;
}

export const columns: ColumnDef<Role, TableMeta>[] = [
    {
        accessorKey: 'id',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    ID <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: 'guard_name',
        header: 'Guard Name',
        cell: ({ row }) => {
            // Get the specific value for guard_name from the row's original data
            const guardName = row.original.guard_name;
            // Return the Badge component to render it
            return <Badge variant="secondary">{guardName}</Badge>;
        },
    },
    {
        accessorKey: 'user_name',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Register <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Registered <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            // Format the date for display
            const createdAt = new Date(row.original.created_at);
            const day = createdAt.getDate().toString().padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[createdAt.getMonth()];
            const year = createdAt.getFullYear();
            let hours = createdAt.getHours();
            const minutes = createdAt.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const formattedDateTime = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
            return formattedDateTime;
        },
    },
    {
        id: 'actions',
        cell: ({ row, table }) => {
            const role = row.original;
            // State to control the delete dialog's open/closed status
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
            // --- ADDED: State to explicitly control DropdownMenu open/close ---
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            // Ref for the password input
            const passwordInput = React.useRef<HTMLInputElement>(null);

            // Use Inertia's form helper for delete operation
            const {
                data: deleteData,
                setData: setDeleteData,
                delete: destroy,
                processing: processingDelete,
                errors: deleteErrors,
                reset: resetDeleteForm,
                clearErrors: clearDeleteErrors,
            } = useForm({ password: '' });

            // Function to handle the actual deletion process
            const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                clearDeleteErrors('password');
                const toastId = toast.loading(`Deleting role ${role.name}...`);
                // Call Inertia's delete method
                destroy(route('administrator.roles.destroy-role', role.id), {
                    preserveScroll: true,
                    preserveState: true, // Keep component state on navigation
                    data: { password: deleteData.password }, // Send password data
                    onSuccess: () => {
                        toast.success(`Role ${role.name} deleted successfully.`, { id: toastId });
                        closeDeleteModal(); // Close modal on success
                    },
                    onError: (errorResponse) => {
                        console.error('Deletion error:', errorResponse);
                        if (errorResponse.password) {
                            toast.error(errorResponse.password, { id: toastId });
                            passwordInput.current?.focus(); // Focus password input on error
                        } else {
                            // General error message
                            toast.error(`Failed to delete role ${role.name}. Please try again.`, { id: toastId });
                        }
                    },
                });
            };

            // Function to close the delete modal and reset the form
            const closeDeleteModal = () => {
                setIsDeleteDialogOpen(false); // Close the dialog
                resetDeleteForm('password'); // Reset password field
                clearDeleteErrors(); // Clear any validation errors
            };

            // Effect to reset delete form state when the dialog closes
            useEffect(() => {
                if (!isDeleteDialogOpen) {
                    resetDeleteForm('password');
                    clearDeleteErrors();
                }
            }, [isDeleteDialogOpen, resetDeleteForm, clearDeleteErrors]);

            // Function to handle the Edit action
            const handleEditClick = () => {
                // --- MODIFIED: Explicitly close dropdown ---
                setIsDropdownOpen(false);
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.editRole) {
                    meta.editRole(role); // Call parent function to open drawer/modal for editing
                } else {
                    console.warn('editRole function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            // --- Function to handle Delete item selection ---
            const handleDeleteSelect = (event: Event) => {
                // Prevent default DropdownMenuItem behavior which might close the menu too early
                // before the DialogTrigger activates or state updates.
                // We manually control the dropdown closure.
                event.preventDefault();
                // --- MODIFIED: Explicitly close dropdown ---
                // This ensures the dropdown closes *before* the dialog opens.
                setIsDropdownOpen(false);
                // Open the dialog (state change will trigger DialogTrigger or Dialog open prop)
                setIsDeleteDialogOpen(true);
            };

            return (
                // --- MODIFIED: Control Dialog and DropdownMenu open state ---
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {/* Edit Item: Calls handleEditClick which now closes the dropdown */}
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <FilePenLine className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>

                            {/* Delete Item: Triggers Dialog, explicitly closes dropdown via onSelect */}
                            {/*
                                Note: We keep DialogTrigger here for accessibility and standard pattern,
                                but manage the dropdown closing manually in `handleDeleteSelect`.
                                Alternatively, remove DialogTrigger and manage Dialog open state directly
                                in handleDeleteSelect (setIsDeleteDialogOpen(true)). Both approaches work.
                                Keeping DialogTrigger is often preferred for component library consistency.
                             */}
                            <DialogTrigger asChild>
                                <DropdownMenuItem
                                    onSelect={handleDeleteSelect} // Use the new handler
                                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Dialog Content for Delete Confirmation */}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Delete Role: {role.name}</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this role? This action cannot be undone. All associated data will be permanently lost.
                                Please enter your administrator password to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Form for password confirmation */}
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${role.id}`}>Administrator Password</Label>
                                <Input
                                    id={`delete-password-${role.id}`}
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={deleteData.password}
                                    onChange={(e) => setDeleteData('password', e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                    className={deleteErrors.password ? 'border-red-500' : ''} // Highlight if error
                                    disabled={processingDelete} // Disable while deleting
                                />
                                <InputError message={deleteErrors.password} />
                            </div>
                            <DialogFooter className="gap-2 pt-4 sm:gap-1">
                                {/* Cancel button closes the dialog */}
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={closeDeleteModal}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                {/* Submit button triggers deletion */}
                                <Button type="submit" variant="destructive" disabled={processingDelete || !deleteData.password}>
                                    {processingDelete ? 'Deleting...' : 'Delete Role'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
