import RentalInvoice from '@/components/invoices/rental-invoice';
import { ExtendContract } from '@/components/rentals/sheets/extend-contract';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, RentalsType } from '@/types';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rental Contract Preview',
        href: '#',
    },
];

interface PageProps {
    rental?: RentalsType; // rental can be undefined if coming from client-side preview
}

export default function RentalContractPreview({ rental: serverRental }: PageProps) {
    const [previewRental, setPreviewRental] = useState<RentalsType | undefined>(serverRental);
    console.log('previewRental', previewRental);

    useEffect(() => {
        const storedData = sessionStorage.getItem('rental_preview_data');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                setPreviewRental(parsedData);
            } catch (e) {
                console.error('Failed to parse preview data from sessionStorage', e);
            }
        }
    }, []);

    if (!previewRental) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Loading Preview..." />
                <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-600">
                    <p className="text-lg font-semibold">Loading contract data...</p>
                    <p className="text-sm">
                        If you are seeing this page directly, there is no data to preview. Please generate a preview from the rental form.
                    </p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rental Contract Preview" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Tabs defaultValue="front">
                    <TabsList>
                        <TabsTrigger value="front">Front Contract</TabsTrigger>
                        <TabsTrigger value="invoice">Invoice</TabsTrigger>
                    </TabsList>
                    <TabsContent value="front">
                        <ExtendContract rental={previewRental} />
                    </TabsContent>
                    <TabsContent value="invoice">
                        <RentalInvoice rental={previewRental} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
