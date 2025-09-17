// resources/js/components/rentals/OrderListCard.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderItem, RentalDetails } from '@/pages/pos';
import { CircleX, Trash2 } from 'lucide-react';
import { PaymentSummary } from './PaymentSummary';

interface OrderListCardProps {
    items: OrderItem[];
    rentalDetails: RentalDetails | null;
    onClearAll: () => void;
    onRemoveItem: (id: number | string) => void;
    onIncreaseQuantity: (id: number | string) => void;
    onDecreaseQuantity: (id: number | string) => void;
    orderNumber: string;
    subTotal: number;
    tax: number;
    discount: number;
    totalPayable: number;
    onSubTotalChange: (value: number) => void;
    onTaxChange: (value: number) => void;
    onDiscountChange: (value: number) => void;
}

export function OrderListCard({
    items,
    rentalDetails,
    onClearAll,
    onRemoveItem,
    onIncreaseQuantity,
    onDecreaseQuantity,
    orderNumber,
    subTotal,
    tax,
    discount,
    totalPayable,
    onSubTotalChange,
    onTaxChange,
    onDiscountChange,
}: OrderListCardProps) {
    return (
        <Card className="flex w-1/3 flex-col">
            <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <div className="flex justify-between">
                    <CardTitle>Order List</CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="default">{orderNumber}</Badge>
                        <span className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600">
                            <Trash2 className="h-4 w-4" />
                        </span>
                    </div>
                </div>
                <Separator className="my-2" />
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h5 className="text-md font-bold">Order Details</h5>
                        <div className="cursor-pointer" onClick={onClearAll}>
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
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} aria-label={`Remove ${item.name}`}>
                                            <CircleX className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-start space-x-2">
                                            <button
                                                onClick={() => onDecreaseQuantity(item.id)}
                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                aria-label={`Decrease quantity of ${item.name}`}
                                            >
                                                -
                                            </button>
                                            <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                                            <button
                                                onClick={() => onIncreaseQuantity(item.id)}
                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                aria-label={`Increase quantity of ${item.name}`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">${(item.cost * item.quantity).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <PaymentSummary
                    subTotal={subTotal}
                    tax={tax}
                    discount={discount}
                    totalPayable={totalPayable}
                    onSubTotalChange={onSubTotalChange}
                    onTaxChange={onTaxChange}
                    onDiscountChange={onDiscountChange}
                />
            </CardContent>
        </Card>
    );
}
