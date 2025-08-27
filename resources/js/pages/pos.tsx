import { Create as CreateRentalSheet } from '@/components/rentals/sheets/create';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, Customers, Deposits, SharedData, User, Vehicle, VehicleStatusType } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CircleX, QrCode, Search, Trash2, User2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { InitialFormValues } from '@/components/rentals/sheets/create';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS - Sales Management',
        href: '/pos',
    },
];

interface OrderItem {
    id: number | string;
    name: string;
    quantity: number;
    cost: number;
}

interface PageProps {
    availableVehicles: Vehicle[] | null;
    vehicleStatuses: VehicleStatusType[] | null;
    vehicles: Vehicle[] | null;
    depositTypes: Deposits[] | null;
    customers: Customers[] | null;
    users: User[] | null;
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: unknown;
}

interface RentalDetails {
    customer_name: string;
    vehicle_no: string;
    actual_start_date: string;
    end_date: string;
    period: number | string;
    total_cost: string;
    notes: string;
}

export default function Welcome({ vehicles, availableVehicles, customers, users, vehicleStatuses, depositTypes }: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user.name;
    const [items, setItems] = useState<OrderItem[]>([]);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isCreateRentalSheetOpen, setIsCreateRentalSheetOpen] = useState(false);
    const [rentalDetails, setRentalDetails] = useState<RentalDetails | null>(null);

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

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const [subTotal, setSubTotal] = useState(0);
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(50);
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
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {filteredVehicles.map((vehicle: Vehicle) => (
                                            <Card
                                                key={vehicle.id}
                                                className="group hover:border-primary transform cursor-pointer border border-transparent transition-all duration-200"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="mb-2 overflow-hidden rounded-md">
                                                        <img
                                                            src={vehicle.image}
                                                            alt={vehicle.model}
                                                            className="h-64 w-full object-contain transition-transform duration-300 group-hover:scale-110"
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
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button className="mt-2 w-full" size="sm" onClick={() => handleChooseVehicle(vehicle)}>
                                                                Choose
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex flex-col gap-2 pt-2">
                                                                    <Button
                                                                        variant="default"
                                                                        onClick={() => {
                                                                            setIsCreateRentalSheetOpen(true);
                                                                        }}
                                                                    >
                                                                        New Rental
                                                                    </Button>
                                                                    <Button variant="outline">Extension</Button>
                                                                    <Button variant="outline">Reservation</Button>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex w-1/3 flex-col">
                            <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                                <div className="flex justify-between">
                                    <CardTitle>Order List</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">#ORD123</Badge>
                                        <span className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </span>
                                    </div>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-md font-bold">Order Details</h5>
                                        <div className="cursor-pointer" onClick={clearAll}>
                                            <Badge className="bg-red-100 px-2 py-1 text-red-500 transition-all duration-300 hover:bg-red-500 hover:text-white">
                                                Clear all
                                            </Badge>
                                        </div>
                                    </div>

                                    {rentalDetails ? (
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Customer:</span>
                                                <span className="font-medium">{rentalDetails.customer_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Vehicle:</span>
                                                <span className="font-medium">NO-{rentalDetails.vehicle_no}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Start Date:</span>
                                                <span className="font-medium">{rentalDetails.actual_start_date}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">End Date:</span>
                                                <span className="font-medium">{rentalDetails.end_date}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Period:</span>
                                                <span className="font-medium">{rentalDetails.period} days</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total Cost:</span>
                                                <span className="font-medium">${parseFloat(rentalDetails.total_cost).toLocaleString()}</span>
                                            </div>
                                            {rentalDetails.notes && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Notes:</span>
                                                    <span className="font-medium">{rentalDetails.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground text-center">
                                            <p>No rental created yet.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 flex-1 overflow-y-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[15px]"></TableHead>
                                                <TableHead className="col-span-2">Item</TableHead>
                                                <TableHead className="text-left">QTY</TableHead>
                                                <TableHead className="text-center">Cost</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(item.id)}
                                                            aria-label={`Remove ${item.name}`}
                                                        >
                                                            <CircleX className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-start space-x-2">
                                                            <button
                                                                onClick={() => decreaseQuantity(item.id)}
                                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                                aria-label={`Decrease quantity of ${item.name}`}
                                                            >
                                                                -
                                                            </button>
                                                            <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                                                            <button
                                                                onClick={() => increaseQuantity(item.id)}
                                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                                aria-label={`Increase quantity of ${item.name}`}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        ${(item.cost * item.quantity).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="mt-auto space-y-2 pt-4">
                                    <h5 className="text-md font-bold">Payment Summary</h5>
                                    <div className="flex items-center justify-between">
                                        <span>Sub Total</span>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">$</span>
                                            <Input
                                                type="number"
                                                value={subTotal}
                                                onChange={(e) => setSubTotal(parseFloat(e.target.value) || 0)}
                                                className="w-32 pr-4 pl-7 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Tax</span>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">$</span>
                                            <Input
                                                type="number"
                                                value={tax}
                                                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                                                className="w-32 pr-4 pl-7 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Discount</span>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">-$</span>
                                            <Input
                                                type="number"
                                                value={discount}
                                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                                className="w-32 pr-4 pl-8 text-right"
                                            />
                                        </div>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total Payable</span>
                                        <span>${totalPayable.toLocaleString()}</span>
                                    </div>
                                </div>
                                <Button className="mt-4 w-full">Proceed to Payment</Button>
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
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}