import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; // Assuming you have a Separator component
import { Skeleton } from '@/components/ui/skeleton';
import { Customers, Vehicle } from '@/types';
import { InitialFormValues, PaymentsState } from '@/types/transaction-types';
import { Calendar, CalendarSync, DollarSign, KeyboardMusic, Loader2, MapPin, MapPinHouse, Phone, PlusCircle, User, UserRoundPen } from 'lucide-react'; // Import necessary icons
import React from 'react';
// --- Helper Component for Data Fields ---
interface DetailFieldProps {
    icon: React.ReactNode;
    label: string;
    value: string | number | null;
}

const DetailField: React.FC<DetailFieldProps> = ({ icon, label, value }) => (
    <div className="flex items-start text-sm">
        <div className="flex w-full space-x-2 rounded-md border bg-gray-50 px-2 py-1">
            <div className="text-muted-foreground pt-1">{icon}</div>
            <div className="flex flex-col">
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                    {value || <span className="text-muted-foreground italic">N/A</span>}
                </span>
            </div>
        </div>
    </div>
);

interface PageProps {
    selectedCustomerData: Customers | null;
    data: InitialFormValues;
    payments: Partial<PaymentsState>;
    selectedVehicleData: Vehicle | undefined;
    onUpdateClick: () => void;
}

function CustomerDetailsCard({ selectedCustomerData, data, selectedVehicleData, onUpdateClick }: PageProps) {
    return (
        <div>
            <Card
                className={
                    selectedCustomerData
                        ? 'dark:bg-sidebar h-full border-green-200 bg-green-50 shadow-md dark:border-green-950'
                        : 'dark:bg-sidebar border-red-200 bg-red-50 shadow-md dark:border-red-500'
                }
            >
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle>
                                {selectedCustomerData ? (
                                    <>
                                        <User className="text-primary mr-2 inline h-5 w-5" />
                                        {selectedCustomerData?.full_name || 'Customer Details'}
                                    </>
                                ) : (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                            </CardTitle>
                            <CardDescription>
                                {selectedCustomerData
                                    ? `ID: ${selectedCustomerData?.id} - Ready for rental processing.`
                                    : 'Loading customer details...'}
                            </CardDescription>
                        </div>
                        {selectedCustomerData && (
                            <Button variant="outline" className="cursor-pointer px-3 py-1 text-xs font-semibold" onClick={onUpdateClick}>
                                <UserRoundPen className="h-4 w-4" />
                                Update
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {!selectedCustomerData ? (
                        <div className="space-y-4 p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                            <div className="bordertext-sm flex h-10 w-full items-center justify-center rounded-md">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading customer details
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1: Customer Information */}
                            <div className="grid grid-cols-1 gap-2">
                                <h4 className="text-primary-500 text-lg font-semibold">Customer Information</h4>
                                <div className="grid grid-cols-2 space-x-2">
                                    <DetailField
                                        icon={<MapPinHouse className="h-4 w-4" />}
                                        label="Nationality"
                                        value={selectedCustomerData?.nationality}
                                    />
                                    <DetailField icon={<User className="h-4 w-4" />} label="Gender" value={selectedCustomerData?.gender} />
                                </div>
                            </div>
                            {/* Contact & Additional */}
                            <div className="grid grid-cols-1 gap-2">
                                <h5 className="text-muted-foreground text-sm font-semibold">Contact & Additional</h5>
                                <div className="grid grid-cols-2 space-x-2 gap-y-2">
                                    {/* Assumes primary_contact holds the value (e.g., phone or email) */}
                                    <DetailField
                                        icon={<Phone className="h-4 w-4" />}
                                        label="Primary Contact"
                                        value={selectedCustomerData?.primary_contact}
                                    />
                                    {/* Assuming there's a primary email field or you parse it from activeContacts */}
                                    <DetailField icon={<MapPin className="h-4 w-4" />} label="Address" value={selectedCustomerData?.address} />
                                    <div className="col-span-2">
                                        <DetailField icon={<PlusCircle className="h-4 w-4" />} label="Remark" value={selectedCustomerData?.notes} />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Vehicle Data */}
                            <div className="grid grid-cols-1 gap-2">
                                <h4 className="text-primary-500 text-lg font-semibold">Vehicle Data</h4>
                                <div className="grid grid-cols-2 space-x-2 gap-y-2">
                                    <DetailField
                                        icon={<KeyboardMusic className="h-4 w-4" />}
                                        label="License Plate"
                                        value={selectedVehicleData?.license_plate}
                                    />
                                    <DetailField
                                        icon={<KeyboardMusic className="h-4 w-4" />}
                                        label="Categories"
                                        value={selectedVehicleData?.vehicle_class}
                                    />
                                    <DetailField icon={<KeyboardMusic className="h-4 w-4" />} label="Color" value={selectedVehicleData?.color} />
                                    <DetailField
                                        icon={<KeyboardMusic className="h-4 w-4" />}
                                        label="Compensation Fee ($)"
                                        value={selectedVehicleData?.compensation_price}
                                    />
                                </div>
                            </div>

                            <Separator className="my-2" />

                            {/* SECTION 3: Rental Data */}
                            <div className="grid grid-cols-1 gap-2">
                                <h4 className="text-primary-500 text-lg font-semibold">Rental Data</h4>
                                <div className="grid grid-cols-2 space-x-2 gap-y-2">
                                    <DetailField
                                        icon={<Calendar className="h-4 w-4" />}
                                        label="Start Date"
                                        value={data?.actual_start_date || data?.start_date}
                                    />
                                    <DetailField icon={<Calendar className="h-4 w-4" />} label="Return Date" value={data?.end_date || 0} />
                                    <DetailField icon={<Calendar className="h-4 w-4" />} label="Coming Date" value={data?.coming_date || 0} />
                                    <DetailField icon={<CalendarSync className="h-4 w-4" />} label="Period" value={data?.period} />
                                </div>
                            </div>

                            <Separator className="my-2" />

                            {/* SECTION 4: Deposit Data */}
                            {(data.activeDeposits || [])
                                .filter((d) => d.deposit_type || d.deposit_value)
                                .map((deposit, index) => (
                                    <div key={deposit.id || index} className="grid grid-cols-1 gap-2">
                                        <h4 className="text-primary-500 text-lg font-semibold">Deposit Data</h4>
                                        <div className="mt-2 grid grid-cols-2 space-x-2 gap-y-2 border-t pt-2 first:mt-0 first:border-t-0 first:pt-0">
                                            <DetailField
                                                icon={<DollarSign className="h-4 w-4" />}
                                                label="Deposit Type"
                                                value={deposit.deposit_type_name || 'N/A'}
                                            />
                                            <DetailField
                                                icon={<DollarSign className="h-4 w-4" />}
                                                label="Deposit Value"
                                                value={deposit.deposit_value || 'N/A'}
                                            />
                                            {deposit.visa_type && (
                                                <DetailField
                                                    icon={<User className="h-4 w-4" />}
                                                    label="Registered Number"
                                                    value={deposit.visa_type}
                                                />
                                            )}
                                            {deposit.expiry_date && (
                                                <DetailField
                                                    icon={<Calendar className="h-4 w-4" />}
                                                    label="Expiry Date"
                                                    value={deposit.expiry_date}
                                                />
                                            )}
                                            {deposit.description && (
                                                <div className="col-span-2">
                                                    <DetailField
                                                        icon={<PlusCircle className="h-4 w-4" />}
                                                        label="Description"
                                                        value={deposit.description}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default CustomerDetailsCard;
