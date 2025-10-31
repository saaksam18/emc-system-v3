import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/layouts/app-layout';
import {
    BreadcrumbItem,
    ChartOfAccountTypes,
    ContactTypes,
    Customers,
    Deposits,
    RentalsType,
    SharedData,
    User,
    Vehicle,
    VehicleClass,
    VehicleStatusType,
} from '@/types';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { Bike, Search } from 'lucide-react';
import { useState } from 'react';

// --- Skeleton Component Definition ---
// This is a reusable component for a single vehicle card skeleton
const VehicleCardSkeleton = () => (
    <Card className="border border-transparent">
        <CardContent className="p-4">
            <Skeleton className="mb-2 h-36 w-full rounded-md" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-1 h-4 w-1/2" />
            <Skeleton className="mt-2 h-5 w-1/4 rounded-full" />
            <Skeleton className="mt-2 h-8 w-full" />
        </CardContent>
    </Card>
);

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS - Sales Management',
        href: '/pos',
    },
];

export interface OrderItem {
    id: number | string;
    name: string;
    quantity: number;
    cost: number;
}

export interface RentalDetails {
    customer_name: string;
    vehicle_no: string;
    actual_start_date: string;
    end_date: string;
    period: number | string;
    total_cost: string;
    notes: string;
}

interface PageProps {
    availableVehicles: Vehicle[] | null;
    vehicleStatuses: VehicleStatusType[] | null;
    vehicles: Vehicle[] | null;
    depositTypes: Deposits[] | null;
    customers: Customers[] | null;
    users: User[] | null;
    chartOfAccounts: ChartOfAccountTypes[];
    contactTypes: ContactTypes[];
    rentals: RentalsType[] | null;
    vehicleClasses: VehicleClass[] | null;
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: unknown;
}

export default function Welcome({ vehicles, vehicleClasses }: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user.name;
    const [filter, setFilter] = useState('All');
    const [classFilter, setClassFilter] = useState('All Class');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVehicles = (vehicles || [])
        .filter((v) => filter === 'All' || v.current_status_name === filter)
        .filter((v) => classFilter === 'All Class' || v.class_name === classFilter)
        .filter((v) => (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />

            <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col gap-4 p-4">
                    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
                        <Card className="flex w-full flex-col">
                            <CardHeader>
                                <CardTitle>POS - Sales Management</CardTitle>
                                <CardDescription>Welcome, {user} | August 25, 2025</CardDescription>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col">
                                <div className="mb-4 grid grid-cols-5 gap-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between">
                                                <Bike className="mr-2 h-4 w-4" />
                                                <span className="truncate">{classFilter}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                            <DropdownMenuLabel>Filter by Class</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setClassFilter('All Class')}>All Class</DropdownMenuItem>
                                            {vehicleClasses?.map((vehicleClass) => (
                                                <DropdownMenuItem key={vehicleClass.id} onClick={() => setClassFilter(vehicleClass.name)}>
                                                    {vehicleClass.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <div className="col-span-4 flex items-center gap-2">
                                        <div className="relative w-full">
                                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                            <Input
                                                placeholder="Search Vehicles..."
                                                className="w-full pl-8"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>
                                            All
                                        </Button>
                                        <Button variant={filter === 'In Stock' ? 'default' : 'outline'} onClick={() => setFilter('In Stock')}>
                                            Available
                                        </Button>
                                        <Button variant={filter === 'On Rent' ? 'default' : 'outline'} onClick={() => setFilter('On Rent')}>
                                            Rented
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                        <Deferred data="vehicles" fallback={<VehicleCardSkeleton />}>
                                            {filteredVehicles.map((vehicle: Vehicle) => (
                                                <Card
                                                    key={vehicle.id}
                                                    className="group hover:border-primary bg-sidebar transform cursor-pointer border border-transparent transition-all duration-200 hover:bg-white/50"
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="mb-2 overflow-hidden rounded-md">
                                                            <img
                                                                src={vehicle.photo_path || 'https://via.placeholder.com/400x300.png?text=No+Image'}
                                                                alt={vehicle.model}
                                                                className="min-h-36 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                            />
                                                        </div>
                                                        <h6 className="truncate font-semibold">
                                                            NO-{vehicle.vehicle_no} {vehicle.make} {vehicle.model}
                                                        </h6>
                                                        <p className="text-sm text-gray-500">
                                                            {vehicle.color} - {vehicle.year}
                                                        </p>
                                                        <Badge
                                                            variant={vehicle.current_status_name === 'In Stock' ? 'default' : 'destructive'}
                                                            className={`${vehicle.current_status_name === 'In Stock' ? 'bg-green-200 text-green-500' : 'bg-red-200 text-red-500'} mt-1 rounded-full`}
                                                        >
                                                            {vehicle.current_status_name}
                                                        </Badge>
                                                        {vehicle.current_status_name === 'In Stock' ? (
                                                            <Button
                                                                variant="default"
                                                                className="text-primary mt-2 w-full cursor-pointer rounded-full bg-amber-400 hover:bg-amber-300"
                                                                size="sm"
                                                                onClick={() => {
                                                                    router.visit(`/rentals/new-transaction/${vehicle.id}`);
                                                                }}
                                                            >
                                                                <Bike />
                                                                Choose
                                                            </Button>
                                                        ) : (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        className="text-primary mt-2 w-full cursor-pointer rounded-full bg-amber-400 hover:bg-amber-300"
                                                                        size="sm"
                                                                    >
                                                                        <Bike />
                                                                        Choose
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-full">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                className="w-full cursor-pointer rounded-full"
                                                                                onClick={() => {
                                                                                    router.visit(`/rentals/extend-transaction/${vehicle.id}`);
                                                                                }}
                                                                            >
                                                                                Extension
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                variant="secondary"
                                                                                className="w-full cursor-pointer rounded-full"
                                                                                onClick={() => {
                                                                                    router.visit(`/rentals/change-vehicle-transaction/${vehicle.id}`);
                                                                                }}
                                                                            >
                                                                                Change Vehicle
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                variant={'secondary'}
                                                                                className="w-full cursor-pointer rounded-full"
                                                                            >
                                                                                Change Deposit
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                variant={'secondary'}
                                                                                className="w-full cursor-pointer rounded-full"
                                                                            >
                                                                                Pick Up
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                variant={'secondary'}
                                                                                className="w-full cursor-pointer rounded-full"
                                                                            >
                                                                                Temp. Return
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                variant={'destructive'}
                                                                                className="w-full cursor-pointer rounded-full"
                                                                            >
                                                                                Return
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Deferred>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
