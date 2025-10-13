import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; // Assuming you have a Separator component
import { Customers } from '@/types';
import { Calendar, CreditCard, Mail, MapPin, Phone, User } from 'lucide-react'; // Import necessary icons
import React from 'react';
// --- Helper Component for Data Fields ---
interface DetailFieldProps {
    icon: React.ReactNode;
    label: string;
    value: string | number | null;
}

const DetailField: React.FC<DetailFieldProps> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-2 text-sm">
        <div className="text-muted-foreground pt-1">{icon}</div>
        <div className="flex flex-col">
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-white">{value || <span className="text-muted-foreground italic">N/A</span>}</span>
        </div>
    </div>
);

interface PageProps {
    selectedCustomerData: Customers | null;
}

function CustomerDetailsCard({ selectedCustomerData }: PageProps) {
    return (
        <div>
            <Card
                className={
                    selectedCustomerData
                        ? 'dark:bg-sidebar h-full border-green-200 bg-green-50 shadow-md dark:border-green-950'
                        : 'dark:bg-sidebar border-red-200 bg-red-50 shadow-md dark:border-red-500'
                }
            >
                <CardHeader className="border-b px-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-xl">
                                {selectedCustomerData ? (
                                    <>
                                        <User className="text-primary mr-2 inline h-5 w-5" />
                                        {selectedCustomerData.full_name || 'Customer Details'}
                                    </>
                                ) : (
                                    'Selected Customer Details'
                                )}
                            </CardTitle>
                            <CardDescription>
                                {selectedCustomerData
                                    ? `ID: ${selectedCustomerData.id} - Ready for rental processing.`
                                    : 'Select a customer using the dropdown to populate their details here.'}
                            </CardDescription>
                        </div>
                        {selectedCustomerData && (
                            <Badge variant="default" className="bg-green-800 px-3 py-1 text-xs font-semibold">
                                Selected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 px-16">
                    {!selectedCustomerData ? (
                        <div className="text-muted-foreground flex h-32 items-center justify-center">
                            <p>No customer currently selected.</p>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1: Personal & Primary Info */}
                            <div className="grid grid-cols-1 gap-4">
                                <h4 className="text-primary-500 text-lg font-semibold">Personal Information</h4>
                                <div className="grid grid-cols-2 gap-y-4">
                                    <DetailField icon={<Calendar className="h-4 w-4" />} label="D.O.B" value={selectedCustomerData.date_of_birth} />
                                    <DetailField icon={<User className="h-4 w-4" />} label="Gender" value={selectedCustomerData.gender} />
                                </div>
                            </div>

                            <Separator className="my-4" />

                            {/* SECTION 2: Contact & Location */}
                            <div className="grid grid-cols-1 gap-4">
                                <h4 className="text-primary-500 text-lg font-semibold">Contact & Address</h4>
                                <div className="grid grid-cols-2 gap-y-4">
                                    {/* Assumes primary_contact holds the value (e.g., phone or email) */}
                                    <DetailField
                                        icon={<Phone className="h-4 w-4" />}
                                        label="Primary Contact"
                                        value={selectedCustomerData.primary_contact}
                                    />
                                    {/* Assuming there's a primary email field or you parse it from activeContacts */}
                                    <DetailField
                                        icon={<Mail className="h-4 w-4" />}
                                        label="Email"
                                        // 💡 You would map the activeContacts to find the email here if not directly available
                                        value={
                                            selectedCustomerData.activeContacts?.find((c) => c.contact_type_name?.toLowerCase() === 'email')
                                                ?.contact_value || 'N/A'
                                        }
                                    />
                                    <div className="col-span-2">
                                        <DetailField icon={<MapPin className="h-4 w-4" />} label="Address" value={selectedCustomerData.address} />
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            {/* SECTION 3: Financial & Deposits */}
                            <div className="grid grid-cols-1 gap-4">
                                <h4 className="text-primary-500 text-lg font-semibold">Financial Readiness</h4>
                                <div className="grid grid-cols-2 gap-y-4">
                                    <DetailField
                                        icon={<CreditCard className="h-4 w-4" />}
                                        label="Primary Deposit"
                                        value={selectedCustomerData.primary_deposit}
                                    />
                                    <DetailField
                                        icon={<User className="h-4 w-4" />}
                                        label="Total Deposits"
                                        value={selectedCustomerData.active_deposits_count || 0}
                                    />
                                    <DetailField
                                        icon={<User className="h-4 w-4" />}
                                        label="Passport Number"
                                        value={selectedCustomerData.passport_number}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default CustomerDetailsCard;
