// Removed: import { Head } from '@inertiajs/react';
// Reason: Resolving compilation error "Could not resolve @inertiajs/react"

import BackNewContract from '@/components/contracts/new-contracts/back';
import FrontNewContract from '@/components/contracts/new-contracts/front';
import RentalInvoice from '@/components/invoices/rental-invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, RentalsType } from '@/types';
import { Head } from '@inertiajs/react';

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rental Contract Preview',
        href: '/print/{rental}', // Ensure this route exists and is correct
    },
];
interface ReceiptData {
    receiptNo: string;
    date: string; // e.g., '2025-10-08'
    receivedFrom: string;
    paymentFor: string; // "AT Rental 1 month"
    amount: number;
    currency: string;
    receiverInitials: string; // 'VC'
    companyName: string; // 'EMC Motorbike Rental'
    companyAddress: string;
    phoneNumber: string;
}

interface PageProps {
    rental: RentalsType | undefined;
}

// --- Example Usage Component ---

const initialReceiptData: ReceiptData = {
    receiptNo: '124',
    date: '2025-10-08',
    receivedFrom: 'Lubin Chofflet',
    paymentFor: 'AT Motorbike Rental (1 Month)',
    amount: 95.0,
    currency: 'USD',
    receiverInitials: 'VC',
    companyName: 'EMC Scooter Rental Services',
    companyAddress: '123 Main St, Central City',
    phoneNumber: '(555) 123-4567',
};

export default function RentalContractPreview({ rental }: PageProps) {
    // FIX: Add early return check if rental object is missing or null
    if (!rental) {
        return (
            <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-600">
                <p className="text-lg font-semibold">Loading contract data...</p>
                <p className="text-sm">Please ensure the rental ID is valid and data is being passed from the controller.</p>
            </div>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rental Contract Preview" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Tabs defaultValue="front">
                    <TabsList>
                        <TabsTrigger value="front">Front Contract</TabsTrigger>
                        <TabsTrigger value="back">Back Contract</TabsTrigger>
                        <TabsTrigger value="invoice">Invoice</TabsTrigger>
                    </TabsList>
                    <TabsContent value="front">
                        <FrontNewContract rental={rental || undefined} />
                    </TabsContent>
                    <TabsContent value="back">
                        <BackNewContract />
                    </TabsContent>
                    <TabsContent value="invoice">
                        <RentalInvoice rental={rental || undefined} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
