'use client';

import { Button } from '@/components/ui/button';

import { VehicleCountByClass } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

// --- Column Definitions (No functional changes needed here for moving the filter) ---
export const columns: ColumnDef<VehicleCountByClass>[] = [
    {
        accessorKey: 'class_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Class <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('class_name')}</div>,
    },
    {
        accessorKey: 'rentable_count',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Available <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('rentable_count')}</div>,
    },
];
