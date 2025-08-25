import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CircleX, QrCode, Search, Trash2, User2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS - Sales Management',
        href: '/pos',
    },
];

const initialItems = [
    { id: 1, name: 'Rental Fee', quantity: 1, cost: 1500 },
    { id: 2, name: 'Helmet', quantity: 2, cost: 50 },
    { id: 3, name: 'Insurance', quantity: 1, cost: 200 },
];

const vehicles = [
    { id: 1, name: 'Honda Click 125i', image: 'https://www.ncxhonda.com/motorcycles/storage/app/uploads//Color_Chart/Click_125/Honda_Click125-White.png', price: 500, status: 'Available' },
    { id: 2, name: 'Yamaha NMAX', image: 'https://via.placeholder.com/150', price: 700, status: 'Rented' },
    { id: 3, name: 'Honda PCX 160', image: 'https://premiumbikes.ph/wp-content/uploads/2023/12/Honda-pcx160-abs-1.png', price: 650, status: 'Available' },
    { id: 4, name: 'Yamaha Aerox', image: 'https://via.placeholder.com/150', price: 750, status: 'Maintenance' },
    { id: 5, name: 'Suzuki Raider 150', image: 'https://via.placeholder.com/150', price: 450, status: 'Available' },
    { id: 6, name: 'Kawasaki Ninja 400', image: 'https://via.placeholder.com/150', price: 1200, status: 'Rented' },
    { id: 7, name: 'Honda Click 125i', image: 'https://www.ncxhonda.com/motorcycles/storage/app/uploads//Color_Chart/Click_125/Honda_Click125-White.png', price: 500, status: 'Available' },
    { id: 8, name: 'Yamaha NMAX', image: 'https://via.placeholder.com/150', price: 700, status: 'Rented' },
    { id: 9, name: 'Honda PCX 160', image: 'https://premiumbikes.ph/wp-content/uploads/2023/12/Honda-pcx160-abs-1.png', price: 650, status: 'Available' },
    { id: 10, name: 'Yamaha Aerox', image: 'https://via.placeholder.com/150', price: 750, status: 'Maintenance' },
    { id: 11, name: 'Suzuki Raider 150', image: 'https://via.placeholder.com/150', price: 450, status: 'Available' },
    { id: 12, name: 'Kawasaki Ninja 400', image: 'https://via.placeholder.com/150', price: 1200, status: 'Rented' },
    { id: 13, name: 'Honda Click 125i', image: 'https://www.ncxhonda.com/motorcycles/storage/app/uploads//Color_Chart/Click_125/Honda_Click125-White.png', price: 500, status: 'Available' },
    { id: 14, name: 'Yamaha NMAX', image: 'https://via.placeholder.com/150', price: 700, status: 'Rented' },
    { id: 15, name: 'Honda PCX 160', image: 'https://premiumbikes.ph/wp-content/uploads/2023/12/Honda-pcx160-abs-1.png', price: 650, status: 'Available' },
    { id: 16, name: 'Yamaha Aerox', image: 'https://via.placeholder.com/150', price: 750, status: 'Maintenance' },
    { id: 17, name: 'Suzuki Raider 150', image: 'https://via.placeholder.com/150', price: 450, status: 'Available' },
    { id: 18, name: 'Kawasaki Ninja 400', image: 'https://via.placeholder.com/150', price: 1200, status: 'Rented' },
    { id: 19, name: 'Honda Click 125i', image: 'https://www.ncxhonda.com/motorcycles/storage/app/uploads//Color_Chart/Click_125/Honda_Click125-White.png', price: 500, status: 'Available' },
    { id: 20, name: 'Yamaha NMAX', image: 'https://via.placeholder.com/150', price: 700, status: 'Rented' },
    { id: 21, name: 'Honda PCX 160', image: 'https://premiumbikes.ph/wp-content/uploads/2023/12/Honda-pcx160-abs-1.png', price: 650, status: 'Available' },
    { id: 22, name: 'Yamaha Aerox', image: 'https://via.placeholder.com/150', price: 750, status: 'Maintenance' },
    { id: 23, name: 'Suzuki Raider 150', image: 'https://via.placeholder.com/150', price: 450, status: 'Available' },
    { id: 24, name: 'Kawasaki Ninja 400', image: 'https://via.placeholder.com/150', price: 1200, status: 'Rented' },
];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user.name;
    const [items, setItems] = useState(initialItems);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const removeItem = (id: number) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const increaseQuantity = (id: number) => {
        setItems(items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)));
    };

    const decreaseQuantity = (id: number) => {
        setItems(
            items.map((item) =>
                item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item,
            ),
        );
    };

    const clearAll = () => {
        setItems([]);
    };

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const subTotal = items.reduce((acc, item) => acc + item.cost * item.quantity, 0);
    const taxRate = 0.1; // 10%
    const tax = subTotal * taxRate;
    const discount = 50; // flat $50 discount for demo
    const totalPayable = subTotal + tax - discount;

    const filteredVehicles = vehicles
        .filter((v) => filter === 'All' || v.status === filter)
        .filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />

            <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col gap-4 p-4">
                    <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
                        <Card className="w-2/3 flex flex-col">
                            <CardHeader>
                                <CardTitle>POS - Sales Management</CardTitle>
                                <CardDescription>
                                    Welcome, {user} | August 25, 2025
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col min-h-0">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="relative w-full">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search vehicles..."
                                            className="pl-8 w-full"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant={filter === 'All' ? 'default' : 'outline'}
                                        onClick={() => setFilter('All')}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant={filter === 'Available' ? 'default' : 'outline'}
                                        onClick={() => setFilter('Available')}
                                    >
                                        Available
                                    </Button>
                                    <Button
                                        variant={filter === 'Rented' ? 'default' : 'outline'}
                                        onClick={() => setFilter('Rented')}
                                    >
                                        Rented
                                    </Button>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {filteredVehicles.map((vehicle) => (
                                            <Card
                                                key={vehicle.id}
                                                className="group transform cursor-pointer transition-all duration-200 border border-transparent hover:border-primary"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="overflow-hidden rounded-md mb-2">
                                                        <img
                                                            src={vehicle.image}
                                                            alt={vehicle.name}
                                                            className="h-64 w-full object-contain transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                    </div>
                                                    <h6 className="truncate font-semibold">{vehicle.name}</h6>
                                                    <p className="text-sm text-gray-500">${vehicle.price}/day</p>
                                                    <Badge
                                                        variant={
                                                            vehicle.status === 'Available'
                                                                ? 'default'
                                                                : 'destructive'
                                                        }
                                                        className="mt-1"
                                                    >
                                                        {vehicle.status}
                                                    </Badge>
                                                    <Button className="mt-2 w-full" size="sm">
                                                        Choose
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="w-1/3 flex flex-col">
                            <CardContent className="p-4 flex flex-1 flex-col min-h-0">
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
                                <div className="flex flex-col gap-2">
                                    <h5 className="text-md font-bold">Customer Informations</h5>
                                    <div className="flex gap-2">
                                        <Input placeholder="Customer Name" />
                                        <Button variant="default">
                                            <User2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="default" className="bg-green-600">
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-md font-bold">Order Details</h5>
                                            <Badge variant="outline" className="p-2">
                                                Items: {totalItems}
                                            </Badge>
                                        </div>
                                        <div className="cursor-pointer" onClick={clearAll}>
                                            <Badge className="bg-red-100 text-red-500 transition-all duration-300 hover:bg-red-500 hover:text-white py-1 px-2">
                                                Clear all
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 rounded-md border flex-1 overflow-y-auto">
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
                                                            <span className="w-4 text-center text-sm font-semibold">
                                                                {item.quantity}
                                                            </span>
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
                                    <div className="flex justify-between">
                                        <span>Sub Total</span>
                                        <span className="font-semibold">${subTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax (10%)</span>
                                        <span className="font-semibold">${tax.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Discount</span>
                                        <span className="font-semibold text-green-600">
                                            -${discount.toLocaleString()}
                                        </span>
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
        </AppLayout>
    );
}