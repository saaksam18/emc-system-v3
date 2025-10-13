import { Create as CreateCustomerSheet } from '@/components/customers/sheets/create';
import ChangeDeposit, { ChangeDeposit as ChangeDepositSheet } from '@/components/rentals/sheets/change-deposit';
import { ChangeVehicle } from '@/components/rentals/sheets/change-vehicle';
import { Create as CreateRentalSheet } from '@/components/rentals/sheets/create';
import { ExtendContract } from '@/components/rentals/sheets/extend-contract';
import { Pickup } from '@/components/rentals/sheets/pick-up';
import { Return } from '@/components/rentals/sheets/return';
import { Show } from '@/components/rentals/sheets/show';
import { TemporaryReturn } from '@/components/rentals/sheets/temporary-return';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
    VehicleStatusType,
} from '@/types';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CustomizeNewRentalMaster from './templates/contracts/customize-new-rental-master';

// --- Skeleton Component Definition ---
// This is a reusable component for a single vehicle card skeleton
const VehicleCardSkeleton = () => (
    // ... same Skeleton structure as before ...
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
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: unknown;
}

export default function Welcome({
    vehicles,
    availableVehicles,
    customers,
    users,
    chartOfAccounts,
    vehicleStatuses,
    depositTypes,
    contactTypes,
    rentals,
}: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const { props: pageProps } = usePage<PageProps>();
    const user = auth.user.name;
    const [items, setItems] = useState<OrderItem[]>([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRental, setSelectedRental] = useState<RentalsType | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isCreateRentalSheetOpen, setIsCreateRentalSheetOpen] = useState(false);
    const [isCreateCustomerSheetOpen, setIsCreateCustomerSheetOpen] = useState(false);
    const [isChangeDepositSheetOpen, setIsChangeDepositSheetOpen] = useState(false);
    const [isCustomizeNewRentalMasterOpen, setIsCustomizeNewRentalMasterOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<string | null>(null);
    const [rentalPeriod, setRentalPeriod] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [notes, setNotes] = useState('');
    console.log('selectedVehicle', selectedVehicle);
    console.log('rentals', rentals);
    console.log('selectedRental', selectedRental);

    const handleExtend = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('extend');
        setSelectedRental(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<
        'show' | 'create' | 'edit' | 'temporary' | 'extend' | 'exVehicle' | 'exDeposit' | 'pick-up' | 'return'
    >('create');
    const [edit, setEdit] = useState<RentalsType | null>(null); // For editing

    const handleRentalCreated = () => {
        setIsCreateRentalSheetOpen(false);
    };

    const handleCustomerCreated = () => {
        setIsCreateCustomerSheetOpen(false);
    };

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Reload only the customers data after submit
        router.reload({ only: ['customers'] });
    };

    const [subTotal, setSubTotal] = useState(0);
    const [, setTax] = useState(0);
    const taxRate = 0.1;

    useEffect(() => {
        const newSubTotal = items.reduce((acc, item) => acc + item.cost * item.quantity, 0);
        setSubTotal(newSubTotal);
    }, [items]);

    useEffect(() => {
        setTax(subTotal * taxRate);
    }, [subTotal]);

    const filteredVehicles = (vehicles || [])
        .filter((v) => filter === 'All' || v.current_status_name === filter)
        .filter((v) => (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const dummyContractData = {
        customerName: 'John Doe',
        sex: 'male' as const,
        nationality: 'American',
        phoneNumber: '123-456-7890',
        occupation: 'Software Engineer',
        address: '123 Main St, Anytown, USA',
        rentalDate: '2025-10-03',
        returnDate: '2025-10-10',
        rentalPeriodType: 'days' as const,
        rentalPeriodValue: 7,
        helmetRental: 'Yes' as const,
        howToKnow: {
            facebook: true,
            webPage: false,
            wordOfMouth: '',
            flyer: '',
            shopSignboard: false,
            magazine: '',
            other: '',
        },
        motorId: 'M-123',
        plateNo: 'ABC-123',
        motorType: 'Honda Dream',
        transmission: 'AT' as const,
        rentalFeePerPeriod: 50,
        totalRentalFee: 350,
        depositAmount: 100,
        depositMethod: 'Passport' as const,
        otherDepositDetails: '',
        compensationFee: 500,
        renterSignature: 'John Doe',
        staffSignature: 'Jane Smith',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />

            <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col gap-4 p-4">
                    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
                        <Card className="flex w-full flex-col">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>POS - Sales Management</CardTitle>
                                        <CardDescription>Welcome, {user} | August 25, 2025</CardDescription>
                                    </div>
                                    <Dialog open={isCustomizeNewRentalMasterOpen} onOpenChange={setIsCustomizeNewRentalMasterOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">Print Rental Contract</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Rental Contract</DialogTitle>
                                                <DialogDescription>Modify the fields for the new rental master contract.</DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-[70vh] overflow-y-auto">
                                                <CustomizeNewRentalMaster data={dummyContractData} />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="relative w-full">
                                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                        <Input
                                            placeholder="Search vehicles..."
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
                                <div className="flex-1 overflow-y-auto">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                        <Deferred data="vehicles" fallback={<VehicleCardSkeleton />}>
                                            {filteredVehicles.map((vehicle: Vehicle) => (
                                                <Card
                                                    key={vehicle.id}
                                                    className="group hover:border-primary bg-sidebar transform cursor-pointer border border-transparent transition-all duration-200"
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
                                                            className="mt-1"
                                                        >
                                                            {vehicle.current_status_name}
                                                        </Badge>
                                                        {vehicle.current_status_name === 'In Stock' ? (
                                                            <Button
                                                                className="mt-2 w-full"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // 1. Set the selected vehicle state
                                                                    setSelectedVehicle(vehicle);
                                                                    // 2. Open the rental creation sheet
                                                                    setIsCreateRentalSheetOpen(true);
                                                                }}
                                                            >
                                                                Choose
                                                            </Button>
                                                        ) : (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        className="mt-2 w-full"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            // 1. Set the selected vehicle state
                                                                            setSelectedVehicle(vehicle);
                                                                            // 2. Find and set the active retnal for the vehicle
                                                                            const activeRental = rentals?.find(
                                                                                (r) =>
                                                                                    r.vehicle_no === vehicle.vehicle_no &&
                                                                                    vehicle.current_status_name !== 'In Stock',
                                                                            );
                                                                            setSelectedRental(activeRental || null);
                                                                        }}
                                                                    >
                                                                        Choose
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-full">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button className="w-full" onClick={() => handleExtend(selectedRental!)}>
                                                                                Extension
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button variant={'secondary'} className="w-full">
                                                                                Change Vehicle
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button variant={'secondary'} className="w-full">
                                                                                Change Deposit
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button variant={'secondary'} className="w-full">
                                                                                Pick Up
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button variant={'secondary'} className="w-full">
                                                                                Temp. Return
                                                                            </Button>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Button variant={'destructive'} className="w-full">
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
            <Sheet open={isCreateRentalSheetOpen} onOpenChange={setIsCreateRentalSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Create New Rental</SheetTitle>
                        <SheetDescription>Enter the details for the new rental.</SheetDescription>
                    </SheetHeader>
                    <div>
                        <CreateRentalSheet
                            key={selectedVehicle?.id}
                            customers={customers}
                            availableVehicles={availableVehicles}
                            vehicleStatuses={vehicleStatuses || []}
                            depositTypes={depositTypes}
                            users={users}
                            chartOfAccounts={chartOfAccounts}
                            onSubmitSuccess={handleRentalCreated}
                            onCreateClick={() => setIsCreateCustomerSheetOpen(true)}
                            initialVehicleNo={selectedVehicle?.vehicle_no}
                            initialTransactionType={transactionType}
                            initialRentalPeriod={rentalPeriod}
                            initialCustomerId={selectedCustomerId}
                            initialNotes={notes}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={isCreateCustomerSheetOpen} onOpenChange={setIsCreateCustomerSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Create New Customer</SheetTitle>
                        <SheetDescription>Enter the details for the new customer.</SheetDescription>
                    </SheetHeader>
                    <div className="h-[calc(100vh-100px)] overflow-y-auto">
                        <CreateCustomerSheet contactTypes={contactTypes || []} onSubmitSuccess={handleCustomerCreated} />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={isChangeDepositSheetOpen} onOpenChange={setIsChangeDepositSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Change Deposit</SheetTitle>
                        <SheetDescription>Update the deposit details for the selected rental.</SheetDescription>
                    </SheetHeader>
                    <div className="h-[calc(100vh-100px)] overflow-y-auto">
                        <ChangeDepositSheet
                            selectedRow={selectedRental}
                            depositTypes={depositTypes?.map((d) => ({ id: d.id, name: d.name })) || []}
                            users={users}
                            onDepositUpdated={() => setIsChangeDepositSheetOpen(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    {/* Show Details View */}
                    {sheetMode === 'show' && selectedRental && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedRental?.name || 'N/A'} Details:</SheetTitle>
                                <SheetDescription>Viewing details for rental: {selectedRental?.name || 'N/A'}</SheetDescription>
                            </SheetHeader>
                            <Show selectedRow={selectedRental} />
                            <SheetFooter>
                                <SheetClose asChild>
                                    <Button type="button" variant="outline">
                                        Close
                                    </Button>
                                </SheetClose>
                            </SheetFooter>
                        </>
                    )}

                    {/* Extend Form View */}
                    {sheetMode === 'extend' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <ExtendContract
                                selectedRow={selectedRental}
                                vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}

                    {/* Change vehicle Form View */}
                    {sheetMode === 'exVehicle' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <ChangeVehicle
                                availableVehicles={availableVehicles}
                                selectedRow={selectedRental}
                                vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}

                    {/* Change deposit Form View */}
                    {sheetMode === 'exDeposit' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <ChangeDeposit
                                selectedRow={selectedRental}
                                depositTypes={pageProps.depositTypes || depositTypes || []}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}

                    {/* Pick up Form View */}
                    {sheetMode === 'pick-up' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <Pickup
                                selectedRow={selectedRental}
                                vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                depositTypes={depositTypes}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}

                    {/* Temporary Form View */}
                    {sheetMode === 'temporary' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <TemporaryReturn
                                selectedRow={selectedRental}
                                vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}

                    {/* Return Form View */}
                    {sheetMode === 'return' && edit && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                <SheetDescription>Update the rental's details.</SheetDescription>
                            </SheetHeader>
                            <Return
                                selectedRow={selectedRental}
                                vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                users={users}
                                onSubmitSuccess={handleFormSubmitSuccess}
                            />
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
