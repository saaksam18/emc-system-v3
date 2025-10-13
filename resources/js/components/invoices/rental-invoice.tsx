import { RentalsType } from '@/types';
import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Logo from '../../assets/logo.png';
import { Button } from '../ui/button';

interface PageProps {
    rental: RentalsType | undefined;
}

function RentalInvoice({ rental }: PageProps) {
    // Convert date to a more thermal-friendly format (DD/MM/YY)
    const receiptDate = new Date(rental?.start_date)
        .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
        })
        .toUpperCase()
        .replace(/ /g, '/');

    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });
    return (
        <div>
            <div className="flex justify-end">
                <Button variant="default" type="button" onClick={reactToPrintFn}>
                    <Printer /> Print
                </Button>
            </div>
            <div className="font-inter flex min-h-screen justify-center p-4">
                <div
                    className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 shadow-xl"
                    style={{
                        width: '300px' /* Simulates 80mm paper width */,
                        fontSize: '11px' /* Small font size typical of thermal prints */,
                        lineHeight: '1.4',
                    }}
                    ref={contentRef}
                >
                    {/* --- Header Section --- */}
                    <header className="mb-4">
                        <span className="mb-4 flex items-center gap-2">
                            <img src={Logo} alt="EMC Logo" className="max-w-10" />
                            <h1 className="text-sm font-extrabold text-nowrap text-gray-800">EMC Scooter Rental Services</h1>
                        </span>
                        <div className="text-start">
                            <p className="text-gray-600">No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh</p>
                            <p className="text-gray-600">Tel: 089 491 436, SMS( 日本語 , English)</p>
                            <p className="mb-2 text-gray-600">Viber: 089-518-867 ( 日本語 , English)</p>
                            <div className="border-t border-b border-gray-400 bg-gray-50 py-1 text-center text-sm font-bold">OFFICIAL RECEIPT</div>
                        </div>
                    </header>

                    {/* --- Transaction Details Section --- */}
                    <section className="mb-4 space-y-1">
                        <div className="flex justify-between">
                            <span className="font-semibold">Receipt No:</span>
                            <span>{rental?.id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Date:</span>
                            <span>{receiptDate}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-300 pt-2">
                            <span className="block font-semibold">Received From:</span>
                            <p className="text-sm font-bold uppercase">{rental?.full_name}</p>
                        </div>
                    </section>

                    {/* --- Itemized Section / Payment For --- */}
                    <section className="mb-4">
                        <div className="border-t border-b border-dashed border-gray-300 py-2">
                            <div className="mb-1 flex justify-between text-xs font-bold">
                                <span>DESCRIPTION</span>
                                <span className="text-right">AMOUNT</span>
                            </div>
                            <div className="flex justify-between">
                                {rental?.status_name === 'New Rental' ? (
                                    <span className="w-2/3">
                                        {rental?.class} {rental?.status_name} {rental?.period} Days
                                    </span>
                                ) : (
                                    <span className="w-2/3">
                                        {rental?.class} {rental?.status_name} Rental {rental?.period} Days
                                    </span>
                                )}

                                <span className="w-1/3 text-right">${rental?.total_cost}</span>
                            </div>
                        </div>
                    </section>

                    {/* --- Total Section --- */}
                    <section className="mb-4">
                        <div className="flex justify-between border-b-2 border-gray-600 pb-2 text-base font-extrabold">
                            <span>TOTAL AMOUNT PAID</span>
                            <span className="text-green-700">${rental?.total_cost}</span>
                        </div>
                        <div className="mt-2 text-xs">
                            <span className="font-semibold">Payment Method:</span> CASH
                        </div>
                    </section>

                    {/* --- Footer/Signature Section --- */}
                    <footer className="mt-6 text-center">
                        <p className="mb-4 text-xs text-gray-700 italic">Thank you for renting with us.</p>
                        <div className="flex justify-between border-t border-dashed border-gray-400 pt-8 text-xs">
                            <div className="w-1/2 text-left">
                                <p className="w-2/3 border-b border-gray-500"></p>
                                <p className="mt-1">Customer Signature</p>
                            </div>
                            <div className="w-1/2 text-right">
                                <p className="ml-auto w-2/3 border-b border-gray-500 font-bold">{rental?.incharger_name}</p>
                                <p className="mt-1">Received By</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default RentalInvoice;
