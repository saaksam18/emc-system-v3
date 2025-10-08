// Removed: import { Head } from '@inertiajs/react';
// Reason: Resolving compilation error "Could not resolve @inertiajs/react"

import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

// Dummy Logo Component (Since I cannot render the original image)
const EmcLogo: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-2">
        <div className="relative text-8xl leading-none font-black">
            <span className="text-black italic">E</span>
            <span className="text-black italic">M</span>
            <span className="text-yellow-600 italic">C</span>
        </div>
        <div className="mt-1 border-t border-black pt-1 font-serif text-base font-bold tracking-wider italic">Expat Motorbikes Cambodia</div>
    </div>
);

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rental Contract',
        href: '/print/{rental}', // Ensure this route exists and is correct
    },
];

export default function RentalContractPreview({ rental }) {
    const DottedLineInput: React.FC<{ flex?: boolean; widthClass?: string; value?: string }> = ({
        flex = false,
        widthClass = 'flex-1',
        value = '',
    }) => (
        <input
            type="text"
            className={`${widthClass} border-b border-dotted border-black bg-transparent px-1 text-sm focus:border-solid focus:outline-none ${flex ? 'flex-1' : ''}`}
            defaultValue={value}
        />
    );
    // FIX: Add early return check if rental object is missing or null
    if (!rental) {
        return (
            <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-600">
                <p className="text-lg font-semibold">Loading contract data...</p>
                <p className="text-sm">Please ensure the rental ID is valid and data is being passed from the controller.</p>
            </div>
        );
    }

    const handlePrint = () => {
        // Triggers the browser's native print dialog
        window.print();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rental Contract" />
            {/* Added style block for print media queries to ensure a clean printed look */}
            <style>
                {`
                /* Print Styles to ensure a clean, paper-friendly layout */
                @media print {
                    /* Hide the print button wrapper */
                    .no-print {
                        display: none !important;
                    }
                    /* Set the container background to white and remove padding/margins */
                    .print-container {
                        background-color: white !important;
                        padding: 0 !important;
                        min-height: auto !important;
                    }
                    /* Remove shadow and size constraints for printing */
                    .contract-document {
                        box-shadow: none !important;
                        max-width: none !important;
                        margin: 0 auto !important;
                        border-radius: 0 !important;
                    }
                }
                `}
            </style>

            <div className="print-container min-h-screen bg-gray-100 p-8">
                {/* Replaced <Head> with standard document title visualization */}
                <h1 className="sr-only">Contract Preview</h1>

                <div className="contract-document mx-auto max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
                    <div className="p-8">
                        {/* PRINT BUTTON - Added 'no-print' class and onClick handler */}
                        <div className="no-print mb-6 flex justify-end">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-xs font-semibold tracking-widest text-white uppercase ring-indigo-300 transition hover:bg-indigo-700 focus:border-indigo-900 focus:ring focus:outline-none active:bg-indigo-900 disabled:opacity-25"
                            >
                                Print Contract
                            </button>
                        </div>

                        {/* START OF CONTRACT PREVIEW AREA */}

                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-bold tracking-widest uppercase">
                                Expat Motorbikes Cambodia <span className="text-sm font-normal">(EMC motorbike rental)</span>
                            </h1>
                        </div>
                        {/* --- Header Section --- */}
                        <div className="mb-8 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                            <div className="space-y-1 md:col-span-2">
                                <p className="flex">
                                    <span className="w-24 font-semibold">Address:</span> No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh
                                </p>
                                <p className="flex">
                                    <span className="w-24 font-semibold">Business Days:</span> From Tuesday - Sunday, Closed on Mondays and National
                                    Holidays
                                </p>
                                <p className="flex">
                                    <span className="w-24 font-semibold">Business Hours:</span> AM9:00 - PM5:00
                                </p>
                                <p className="flex">
                                    <span className="italic">*Contact us in case of emergency problem even outside business hours</span>
                                </p>
                                <p className="flex">
                                    <span className="w-24 font-semibold">Contact:</span> Tel: 089 491 436, SMS or Viber: 089-518-867 ( 日本語 ,
                                    English)
                                </p>
                            </div>
                            <div className="flex justify-center md:col-span-1 md:justify-end">
                                <EmcLogo />
                            </div>
                        </div>
                        <div className="mb-4 flex justify-between border-b border-black pb-2 text-sm">
                            <div className="w-1/2 pr-2">
                                <span className="text-sm italic">Customer Information</span>
                            </div>
                        </div>
                        <div className="mb-6 space-y-3">
                            <div className="flex flex-wrap items-center space-x-4">
                                <label className="text-sm whitespace-nowrap">Customer Name: N/A</label>

                                <div className="ml-4 flex items-center space-x-2 whitespace-nowrap">
                                    <label className="text-sm">Sex: N/A</label>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm whitespace-nowrap">Nationality: N/A</label>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm whitespace-nowrap">Phone Number:</label>
                                <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                <label className="text-sm whitespace-nowrap">Occupation in Cambodia:</label>
                                <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                            </div>

                            <div className="flex items-center">
                                <label className="text-sm whitespace-nowrap">Present Address in Cambodia</label>
                                <DottedLineInput flex />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center">
                                    <label className="text-sm whitespace-nowrap">Rental Date</label>
                                    <DottedLineInput widthClass="w-28" />
                                    <span className="mr-2 ml-1 text-sm">201</span>
                                    <DottedLineInput widthClass="w-8" />
                                </div>
                                <div className="flex items-center">
                                    <label className="text-sm whitespace-nowrap">Return Date</label>
                                    <DottedLineInput widthClass="w-28" />
                                    <span className="mr-2 ml-1 text-sm">201</span>
                                    <DottedLineInput widthClass="w-8" />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm whitespace-nowrap">Rental Period:</label>
                                <DottedLineInput widthClass="w-8" />
                                <span className="text-sm whitespace-nowrap">PM6:00 (The rental date is counted as the 1st rental day)</span>
                            </div>

                            <div className="flex items-center space-x-4">
                                <label className="text-sm whitespace-nowrap">Helmet Rental:</label>
                                <DottedLineInput widthClass="w-8" />
                            </div>

                            <div className="pt-2">
                                <span className="text-sm font-semibold">- How to get to know our shop? -</span>
                                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                                    <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                </div>
                            </div>
                        </div>

                        {/* --- Motorbike Details & Fee Section --- */}
                        <div className="mb-6 space-y-3 border-t border-black pt-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm whitespace-nowrap">Motor ID</label>
                                <DottedLineInput widthClass="w-20" />
                                <label className="text-sm whitespace-nowrap">Plate No.</label>
                                <DottedLineInput widthClass="w-32" />
                                <label className="text-sm whitespace-nowrap">Motor Type.</label>
                                <DottedLineInput widthClass="w-28" />
                                <label className="text-sm whitespace-nowrap">Motor Class.</label>
                                <DottedLineInput widthClass="w-28" />
                            </div>

                            <div className="grid grid-cols-2 border border-black bg-gray-100 text-sm font-semibold">
                                <div className="border-r border-black p-1 text-center">Total Rental Fee</div>
                                <div className="border-r border-black p-1 text-center">Deposit for Motorbike Rental</div>
                            </div>
                            <div className="grid grid-cols-2 border-r border-b border-l border-black text-sm">
                                <div className="flex items-end justify-center border-r border-black p-2">
                                    <div className="flex items-center">
                                        <span className="ml-1">$</span>
                                        <DottedLineInput widthClass="w-24" />
                                    </div>
                                </div>
                                <div className="space-y-1 p-2">
                                    <div className="ml-auto flex items-center">
                                        <span className="ml-1">$</span>
                                        <DottedLineInput widthClass="w-20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* --- Compensation Policy --- */}
                        <div className="mb-6">
                            <h2 className="mb-2 border-b border-black text-lg font-bold">Compensation Policy</h2>
                            <p className="mb-2 text-sm">
                                If the motorbike is stolen or seriously damaged (assessed as unavailable for rental service of EMC), you shall pay $
                                <DottedLineInput widthClass="w-20 inline" /> as compensation fee in total. The motorbike has no insurance for any loss
                                or damage; you should take care of the motorbike in secure and be fully responsible for any loss and damage. In case
                                of an accident or serious breakdown/trouble, you shall inform our company by calling immediately.
                            </p>
                            <p className="text-sm">
                                You shall pay all the amount of compensation fee at one time basically (payment condition is negotiable).
                            </p>
                        </div>
                        {/* --- Return/Exchange Policy --- */}
                        <div className="mb-6">
                            <h2 className="mb-2 border-b border-black text-lg font-bold">Return/Exchange Policy</h2>
                            <ol className="list-decimal space-y-1 pl-5 text-sm">
                                <li>
                                    When you return/exchange the rental motorbike, you should fill the gasoline up before return/exchange. You shall
                                    fill gasoline up or pay some money as gasoline fee.
                                </li>
                                <li>You can exchange rental motorbikes at the same price if the rental motorbike has any trouble.</li>
                                <li>
                                    When you want to exchange more expensive type of motorbike and you keep on using this one, you need to pay the
                                    amount of price difference between the 2 motorbikes.
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
