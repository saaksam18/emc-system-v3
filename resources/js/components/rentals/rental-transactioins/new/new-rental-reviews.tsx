// Removed: import { Head } from '@inertiajs/react';
// Reason: Resolving compilation error "Could not resolve @inertiajs/react"

import BackNewContract from '@/components/contracts/new-contracts/back';
import FrontNewContract from '@/components/contracts/new-contracts/front';
import RentalInvoice from '@/components/invoices/rental-invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RentalReveiwProps } from '@/types/transaction-types';

export default function NewRentalReviews({
    selectedCustomerData,
    selectedVehicleData,
    data,
    lastSale,
    contentRef,
    isActiveTab,
    setIsActiveTab,
    chartOfAccounts,
}: RentalReveiwProps) {
    // FIX: Add early return check if rental object is missing or null
    if (!data || !selectedCustomerData || !selectedVehicleData) {
        return (
            <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-600">
                <p className="text-lg font-semibold">Loading contract data...</p>
                <p className="text-sm">Please ensure the rental ID is valid and data is being passed from the controller.</p>
            </div>
        );
    }
    const rental = {
        ...data,
        customer: selectedCustomerData,
        vehicle: selectedVehicleData,
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <Tabs value={isActiveTab} onValueChange={setIsActiveTab}>
                <TabsList>
                    <TabsTrigger value="front">Front Contract</TabsTrigger>
                    <TabsTrigger value="back">Back Contract</TabsTrigger>
                    <TabsTrigger value="invoice">Invoice</TabsTrigger>
                </TabsList>
                <TabsContent value="front">
                    <FrontNewContract contentRef={isActiveTab === 'front' ? contentRef : undefined} rental={rental || undefined} />
                </TabsContent>
                <TabsContent value="back">
                    <BackNewContract contentRef={isActiveTab === 'back' ? contentRef : undefined} />
                </TabsContent>
                <TabsContent value="invoice">
                    <RentalInvoice
                        contentRef={isActiveTab === 'invoice' ? contentRef : undefined}
                        rental={rental || undefined}
                        lastSale={lastSale || undefined}
                        chartOfAccounts={chartOfAccounts}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
