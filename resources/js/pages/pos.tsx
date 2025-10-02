import { Create as CreateCustomerSheet } from '@/components/customers/sheets/create';
import { OrderListCard } from '@/components/rentals/OrderListCard';
import { RentalPopoverContent } from '@/components/rentals/RentalPopoverContent';
import { ChangeDeposit as ChangeDepositSheet } from '@/components/rentals/sheets/change-deposit';
import { Create as CreateRentalSheet } from '@/components/rentals/sheets/create';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ContactTypes, Customers, Deposits, RentalsType, SharedData, User, Vehicle, VehicleStatusType } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
    contactTypes: ContactTypes[];
    rentals: RentalsType[];
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: unknown;
}

export default function Welcome({ vehicles, availableVehicles, customers, users, vehicleStatuses, depositTypes, contactTypes, rentals }: PageProps) {
    console.log(rentals);
    const { auth } = usePage<SharedData>().props;
    const user = auth.user.name;
    const [items, setItems] = useState<OrderItem[]>([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isCreateRentalSheetOpen, setIsCreateRentalSheetOpen] = useState(false);
    const [isCreateCustomerSheetOpen, setIsCreateCustomerSheetOpen] = useState(false);
    const [isChangeDepositSheetOpen, setIsChangeDepositSheetOpen] = useState(false);
    const [rentalDetails, setRentalDetails] = useState<RentalDetails | null>(null);
    const [transactionType, setTransactionType] = useState<string | null>(null);
    const [rentalPeriod, setRentalPeriod] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [customRentalPeriod, setCustomRentalPeriod] = useState('');
    const [depositType, setDepositType] = useState<string | null>(null);
    const [otherDeposit, setOtherDeposit] = useState('');
    const [selectedAvailableVehicleId, setSelectedAvailableVehicleId] = useState('');
    const [orderNumber, setOrderNumber] = useState(`#ORD${Math.floor(Math.random() * 10000)}`);
    const [newDepositType, setNewDepositType] = useState([]);
    const [newDepositValue, setNewDepositValue] = useState('');

    const handleRentalCreated = (rentalData: RentalDetails) => {
        const newItems: OrderItem[] = [
            {
                id: rentalData.vehicle_no,
                name: `Rental for NO-${rentalData.vehicle_no}`,
                quantity: 1,
                cost: parseFloat(rentalData.total_cost),
            },
        ];
        setItems(newItems);
        setRentalDetails(rentalData);
        setIsCreateRentalSheetOpen(false);
    };

    const handleCustomerCreated = () => {
        setIsCreateCustomerSheetOpen(false);
    };

    const handleChooseVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
    };

    const removeItem = (id: number | string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const increaseQuantity = (id: number | string) => {
        setItems(items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)));
    };

    const decreaseQuantity = (id: number | string) => {
        setItems(items.map((item) => (item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item)));
    };

    const clearAll = () => {
        setItems([]);
        setRentalDetails(null);
    };

    const handleTransactionTypeChange = (type: string) => {
        setTransactionType(transactionType === type ? null : type);
    };

    const handleRentalPeriodChange = (period: string) => {
        setRentalPeriod(rentalPeriod === period ? null : period);
    };

    const handleDepositTypeChange = (type: string) => {
        setDepositType(depositType === type ? null : type);
    };

    const selectedRental = useMemo(() => {
        if (!selectedVehicle || !selectedVehicle.current_Rentals_id) return null;
        return rentals.find((r) => r.id === selectedVehicle.current_Rentals_id) || null;
    }, [selectedVehicle, rentals]);

    const [subTotal, setSubTotal] = useState(0);
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const taxRate = 0.1;

    useEffect(() => {
        const newSubTotal = items.reduce((acc, item) => acc + item.cost * item.quantity, 0);
        setSubTotal(newSubTotal);
    }, [items]);

    useEffect(() => {
        setTax(subTotal * taxRate);
    }, [subTotal]);

    const totalPayable = subTotal + tax - discount;

    const filteredVehicles = (vehicles || [])
        .filter((v) => filter === 'All' || v.status === filter)
        .filter((v) => (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />

            <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col gap-4 p-4">
                    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
                        <Card className="flex w-2/3 flex-col">
                            <CardHeader>
                                <CardTitle>POS - Sales Management</CardTitle>
                                <CardDescription>Welcome, {user} | August 25, 2025</CardDescription>
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
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                                        {filteredVehicles.map((vehicle: Vehicle) => (
                                            <Card
                                                key={vehicle.id}
                                                className="group hover:border-primary transform cursor-pointer border border-transparent transition-all duration-200"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="mb-2 overflow-hidden rounded-md">
                                                        <img
                                                            src={vehicle.photo_path || 'https://via.placeholder.com/400x300.png?text=No+Image'}
                                                            alt={vehicle.model}
                                                            className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                    </div>
                                                    <h6 className="truncate font-semibold">
                                                        NO-{vehicle.vehicle_no} {vehicle.model}
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
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button className="mt-2 w-full" size="sm" onClick={() => handleChooseVehicle(vehicle)}>
                                                                Choose
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="w-lg p-8">
                                                            <DialogHeader>
                                                                <DialogTitle>Rental Form</DialogTitle>
                                                                <DialogDescription>Enter the details for the rental form.</DialogDescription>
                                                            </DialogHeader>
                                                            <RentalPopoverContent
                                                                customers={customers}
                                                                onOpenCreateRentalSheet={() => setIsCreateRentalSheetOpen(true)}
                                                                onOpenCreateCustomerSheet={() => setIsCreateCustomerSheetOpen(true)}
                                                                transactionType={transactionType}
                                                                onTransactionTypeChange={handleTransactionTypeChange}
                                                                rentalPeriod={rentalPeriod}
                                                                onRentalPeriodChange={handleRentalPeriodChange}
                                                                selectedCustomerId={selectedCustomerId}
                                                                onSelectedCustomerIdChange={setSelectedCustomerId}
                                                                notes={notes}
                                                                onNotesChange={setNotes}
                                                                customRentalPeriod={customRentalPeriod}
                                                                onCustomRentalPeriodChange={setCustomRentalPeriod}
                                                                depositType={depositType}
                                                                onDepositTypeChange={handleDepositTypeChange}
                                                                otherDeposit={otherDeposit}
                                                                onOtherDepositChange={setOtherDeposit}
                                                                availableVehicles={availableVehicles}
                                                                selectedVehicle={selectedVehicle}
                                                                selectedAvailableVehicleId={selectedAvailableVehicleId}
                                                                onSelectedAvailableVehicleChange={setSelectedAvailableVehicleId}
                                                                onOpenChangeDepositSheet={() => setIsChangeDepositSheetOpen(true)}
                                                                currentDeposit="Passport"
                                                                newDepositType={newDepositType || []}
                                                                onNewDepositTypeChange={setNewDepositType}
                                                                newDepositValue={newDepositValue}
                                                                onNewDepositValueChange={setNewDepositValue}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <OrderListCard
                            items={items}
                            rentalDetails={rentalDetails}
                            onClearAll={clearAll}
                            onRemoveItem={removeItem}
                            onIncreaseQuantity={increaseQuantity}
                            onDecreaseQuantity={decreaseQuantity}
                            orderNumber={orderNumber}
                            subTotal={subTotal}
                            tax={tax}
                            discount={discount}
                            totalPayable={totalPayable}
                            onSubTotalChange={setSubTotal}
                            onTaxChange={setTax}
                            onDiscountChange={setDiscount}
                        />
                    </div>
                </div>
            </div>
            <Sheet open={isCreateRentalSheetOpen} onOpenChange={setIsCreateRentalSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Create New Rental</SheetTitle>
                        <SheetDescription>Enter the details for the new rental.</SheetDescription>
                    </SheetHeader>
                    <div className="h-[calc(100vh-100px)] overflow-y-auto">
                        <CreateRentalSheet
                            key={selectedVehicle?.id}
                            customers={customers}
                            availableVehicles={availableVehicles}
                            vehicleStatuses={vehicleStatuses || []}
                            depositTypes={depositTypes}
                            users={users}
                            onSubmitSuccess={handleRentalCreated}
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
                            depositTypes={depositTypes || []}
                            users={users}
                            onDepositUpdated={() => setIsChangeDepositSheetOpen(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
