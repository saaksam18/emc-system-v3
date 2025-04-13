'use client';

import { Role, User } from '@/types'; // Assuming RoleObject is defined in types
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Trash2, UserRoundPen } from 'lucide-react';
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

// --- Define Table Meta Interface (Updated) ---
// Added globalFilter and onGlobalFilterChange for parent-controlled filtering
export interface TableMeta {
    editUser: (user: User) => void;
    roles?: Role[] | null | undefined;
    globalFilter?: string; // State for the global filter value
    onGlobalFilterChange?: (value: string) => void; // Function to update the filter value
}

// --- Column Definitions (No functional changes needed here for moving the filter) ---
export const columns: ColumnDef<User, TableMeta>[] = [
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                ID <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        enableGlobalFilter: false, // Explicitly disable global filtering for ID
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
        // Consider enableGlobalFilter: false if searching role names isn't desired
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
        // Consider enableGlobalFilter: false if searching dates isn't desired
    },
    {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        enableGlobalFilter: false, // Keep actions excluded from global filter
        cell: ({ row, table }) => {
            const user = row.original;
            const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const passwordInput = React.useRef<HTMLInputElement>(null);

            const {
                data: deleteData,
                setData: setDeleteData,
                delete: destroy,
                processing: processingDelete,
                errors: deleteErrors,
                reset: resetDeleteForm,
                clearErrors: clearDeleteErrors,
            } = useForm({ password: '' });

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

            const closeDeleteModal = () => {
                setIsDeleteDialogOpen(false);
                resetDeleteForm('password');
                clearDeleteErrors();
            };

            useEffect(() => {
                if (!isDeleteDialogOpen) {
                    resetDeleteForm('password');
                    clearDeleteErrors();
                }
            }, [isDeleteDialogOpen, resetDeleteForm, clearDeleteErrors]);

            const handleEditClick = () => {
                setIsDropdownOpen(false);
                // --- Access meta via table.options.meta ---
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.editUser) {
                    meta.editUser(user);
                } else {
                    console.warn('editUser function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            return (
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
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <UserRoundPen className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DialogTrigger asChild>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setIsDropdownOpen(false);
                                    }}
                                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
