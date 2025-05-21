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
import { Vehicle } from '@/types';
import { useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Info, MoreHorizontal, PencilOff, PencilRuler, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Assume InputError component exists
const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

// --- Define Table Meta Interface (Updated) ---
// Added globalFilter and onGlobalFilterChange for parent-controlled filtering
export interface TableMeta {
    showDetails: (vehicle: Vehicle) => void;
    editVehicle: (vehicle: Vehicle) => void;
    soldOrStolen: (vehicle: Vehicle) => void;
    globalFilter?: string; // State for the global filter value
    onGlobalFilterChange?: (value: string) => void; // Function to update the filter value
}

// --- Column Definitions (No functional changes needed here for moving the filter) ---
export const columns: ColumnDef<Vehicle, TableMeta>[] = [
    {
        accessorKey: 'vehicle_no',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                No. <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('vehicle_no')}</div>,
    },
    {
        accessorKey: 'make',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Maker <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('make')}</div>,
    },
    // Model Column
    {
        accessorKey: 'model',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Model <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('model')}</div>,
    },
    // Year Column
    {
        accessorKey: 'year',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Year <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('year')}</div>,
    },
    // License Plate Column
    {
        accessorKey: 'license_plate',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                License Plate <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('license_plate')}</div>,
    },
    // current_status_id Column
    {
        accessorKey: 'current_status_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Status <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="capitalize">{row.getValue('current_status_name')}</div>,
        // Example filter function (can be expanded)
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    // Daily Rental Price Column
    {
        accessorKey: 'daily_rental_price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Daily Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('daily_rental_price'));
            // Format as currency (basic example)
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD', // Adjust currency as needed
            }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    // Daily Rental Price Column
    {
        accessorKey: 'weekly_rental_price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Weekly Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('weekly_rental_price'));
            // Format as currency (basic example)
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD', // Adjust currency as needed
            }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    // Daily Rental Price Column
    {
        accessorKey: 'monthly_rental_price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Monthly Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('monthly_rental_price'));
            // Format as currency (basic example)
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD', // Adjust currency as needed
            }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'vin',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                VIN <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.vin || 'N/A',
    },
    {
        accessorKey: 'color',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Color <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.color || 'N/A',
    },
    {
        accessorKey: 'engine_cc',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Engine Size <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.engine_cc || 'N/A',
    },
    {
        accessorKey: 'vehicle_class_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Class <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.vehicle_class_name || 'N/A',
    },
    {
        accessorKey: 'compensation_price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Compensation Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('compensation_price'));
            // Format as currency (basic example)
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD', // Adjust currency as needed
            }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'purchase_price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Purchase Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('purchase_price'));
            // Format as currency (basic example)
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD', // Adjust currency as needed
            }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'current_location',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Current Location <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.current_location || 'N/A',
    },
    {
        accessorKey: 'purchase_date',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Purchase Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const createdAt = new Date(row.original.purchase_date);
                return createdAt.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                });
            } catch (e) {
                return row.original.created_at; // Fallback
            }
        },
    },
    {
        accessorKey: 'notes',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Notes <ArrowUpDown className="ml-2 h-4 w-4" />
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
                return row.original.created_at; // Fallback
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
    {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        enableGlobalFilter: false, // Keep actions excluded from global filter
        cell: ({ row, table }) => {
            const vehicle = row.original;
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
                const toastId = toast.loading(`Deleting vehicle no. ${vehicle.vehicle_no}...`);
                destroy(route('vehicles.destroy', vehicle.id), {
                    preserveScroll: true,
                    preserveState: true,
                    data: { password: deleteData.password },
                    onSuccess: () => {
                        toast.success(`Vehicle no.  ${vehicle.vehicle_no} deleted successfully.`, { id: toastId });
                        closeDeleteModal();
                    },
                    onError: (errorResponse) => {
                        console.error('Deletion error:', errorResponse);
                        if (errorResponse.password) {
                            toast.error(errorResponse.password, { id: toastId });
                            passwordInput.current?.focus();
                        } else {
                            toast.error(`Failed to vehicle no.  ${vehicle.vehicle_no}. Please try again.`, { id: toastId });
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

            // --- Handle Details Click ---
            const handleDetailsClick = () => {
                setIsDropdownOpen(false); // Close the dropdown
                // Access meta from table options, ensuring it exists and has showDetails
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.showDetails) {
                    meta.showDetails(vehicle); // Call the function passed from parent
                } else {
                    // Warn if the function is missing
                    console.warn('showDetails function not found in table meta options.');
                    toast.error('Could not show details.');
                }
            };

            const handleEditClick = () => {
                setIsDropdownOpen(false);
                // --- Access meta via table.options.meta ---
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.editVehicle) {
                    meta.editVehicle(vehicle);
                } else {
                    console.warn('editVehicle function not found in table meta options.');
                    toast.error('Could not initiate edit action.');
                }
            };

            const handleSoldOrStolen = () => {
                setIsDropdownOpen(false);
                // --- Access meta via table.options.meta ---
                const meta = table.options.meta as TableMeta | undefined;
                if (meta?.soldOrStolen) {
                    meta.soldOrStolen(vehicle);
                } else {
                    console.warn('editVehicle function not found in table meta options.');
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
                            <DropdownMenuItem onSelect={handleDetailsClick} className="cursor-pointer">
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleEditClick} className="cursor-pointer">
                                <PencilRuler className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleSoldOrStolen} className="cursor-pointer">
                                <PencilOff className="mr-2 h-4 w-4" />
                                <span>Sold / Stolen</span>
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
                            <DialogTitle>Delete Vehicle No: {vehicle.vehicle_no}</DialogTitle>
                            <DialogDescription>
                                Are you sure? This action cannot be undone. Enter your administrator password to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleDeleteSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`delete-password-${vehicle.id}`}>Administrator Password</Label>
                                <Input
                                    id={`delete-password-${vehicle.id}`}
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
