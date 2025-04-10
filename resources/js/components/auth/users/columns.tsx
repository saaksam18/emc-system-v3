'use client';

import { Role, User } from '@/types'; // Assuming RoleObject is defined in types
import { useForm } from '@inertiajs/react';
// Import Table type from @tanstack/react-table for meta typing
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Trash2, UserRoundPen } from 'lucide-react';
// Import useState for controlling dropdown state
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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

// Assume InputError component exists
const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

// Define Table Meta Interface
export interface TableMeta {
    editUser: (user: User) => void;
    roles?: Role[] | null | undefined;
}

// Column Definitions
export const columns: ColumnDef<User, TableMeta>[] = [
    // --- Other columns (ID, Name, Email, Roles, Inputer, Registered) remain the same ---
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                ID <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'role_names',
        header: 'Assigned Roles',
        cell: ({ row }) => {
            const roleNames = row.original.role_names ?? [];
            return (
                <div className="flex flex-wrap gap-1">
                    {roleNames.length > 0 ? (
                        roleNames.map((roleName) => (
                            <Badge key={roleName} variant="secondary">
                                {roleName}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground text-xs">No Roles</span>
                    )}
                </div>
            );
        },
        enableSorting: false,
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
                return row.original.created_at; // Fallback
            }
        },
    },
    // --- Actions Column ---
    {
        id: 'actions',
        cell: ({ row, table }) => {
            const user = row.original;
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
            // State to control DropdownMenu open/close
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const passwordInput = React.useRef<HTMLInputElement>(null);

            // Delete Form Hook
            const {
                data: deleteData,
                setData: setDeleteData,
                delete: destroy,
                processing: processingDelete,
                errors: deleteErrors,
                reset: resetDeleteForm,
                clearErrors: clearDeleteErrors,
            } = useForm({ password: '' });

            // Delete Submit Handler (remains the same)
            const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                clearDeleteErrors('password');
                const toastId = toast.loading(`Deleting user ${user.name}...`);
                destroy(route('administrator.users.destroy-admin', user.id), {
                    preserveScroll: true,
                    preserveState: true,
                    data: { password: deleteData.password },
                    onSuccess: () => {
                        toast.success(`User ${user.name} deleted successfully.`, { id: toastId });
                        closeDeleteModal();
                    },
                    onError: (errorResponse) => {
                        console.error('Deletion error:', errorResponse);
                        if (errorResponse.password) {
                            toast.error(errorResponse.password, { id: toastId });
                            passwordInput.current?.focus();
                        } else {
                            toast.error(`Failed to delete user ${user.name}. Please try again.`, { id: toastId });
                        }
                    },
                });
            };

            // Close Delete Modal Handler (remains the same)
            const closeDeleteModal = () => {
                setIsDeleteDialogOpen(false);
                resetDeleteForm('password');
                clearDeleteErrors();
            };

            // Effect to reset delete form when dialog closes (remains the same)
            useEffect(() => {
                if (!isDeleteDialogOpen) {
                    resetDeleteForm('password');
                    clearDeleteErrors();
                }
            }, [isDeleteDialogOpen, resetDeleteForm, clearDeleteErrors]);

            // Function to call when Edit is clicked (remains the same)
            const handleEditClick = () => {
                setIsDropdownOpen(false); // Close dropdown
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.editUser) {
                    meta.editUser(user); // Call parent function to open drawer
                } else {
                    console.warn('editUser function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            return (
                // Delete Dialog
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    {/* Control DropdownMenu state */}
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

                            {/* Edit Item - Calls handleEditClick */}
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <UserRoundPen className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>

                            {/* Delete Dialog Trigger Item */}
                            <DialogTrigger asChild>
                                <DropdownMenuItem
                                    // --- MODIFICATION: Also close dropdown here ---
                                    onSelect={(e) => {
                                        e.preventDefault(); // Keep this for DialogTrigger
                                        setIsDropdownOpen(false); // Explicitly close dropdown
                                    }}
                                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Delete Dialog Content (remains the same) */}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Delete Account: {user.name}</DialogTitle>
                            <DialogDescription>
                                Are you sure? This action cannot be undone. Enter your administrator password to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${user.id}`}>Administrator Password</Label>
                                <Input
                                    id={`delete-password-${user.id}`}
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
                            <DialogFooter className="gap-2 pt-4 sm:gap-1">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={closeDeleteModal}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" variant="destructive" disabled={processingDelete || !deleteData.password}>
                                    {processingDelete ? 'Deleting...' : 'Delete Account'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            );
        },
    },
];
