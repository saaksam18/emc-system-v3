import { RentalsType } from '@/types';
import { EnhancedDeposit } from '@/types/transaction-types';
import React, { Ref } from 'react';

// Dummy Logo Component (Since I cannot render the original image)
const EmcLogo: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-2">
        <div className="relative text-8xl leading-none font-black">
            <span className="text-black italic">E</span>
            <span className="text-black italic">M</span>
            <span className="text-yellow-600 italic">C</span>
        </div>
        <div className="mt-1 border-t border-black pt-1 font-serif text-base font-bold tracking-wider italic">Expats Scooter Rental Services</div>
    </div>
);

interface PageProps {
    rental: RentalsType | undefined;
    contentRef: Ref<HTMLDivElement> | undefined;
}

function ExtendContract({ rental, contentRef }: PageProps) {
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

    // NEW CODE: Get today's date as a YYYY-MM-DD string
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`;

    // NEW FUNCTION: Helper to format the date string
    const formatDate = (dateString: string | undefined): string | undefined => {
        if (!dateString) return undefined;

        try {
            // Create a Date object from the YYYY-MM-DD string
            const date = new Date(dateString);

            // Check if the date is valid (a common issue with Date parsing)
            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing fails
            }

            // Use Intl.DateTimeFormat for robust, locale-aware formatting
            const formatter = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit', // 08
                month: 'short', // Sep
                year: 'numeric', // 2025
            });

            // The format will be '08 Sep 2025'. We replace the space with a hyphen.
            return formatter.format(date).replace(/ /g, '-');
        } catch (error) {
            console.error('Date formatting error:', error);
            return dateString;
        }
    };

    const calculateTotalRentalCost = (rentalData: RentalsType | undefined): number => {
        if (!rentalData?.payments || !Array.isArray(rentalData.payments)) {
            return 0;
        }

        return rentalData.payments.reduce((total, payment) => {
            // Exclude deposits from the total rental fee calculation.
            if (payment.description && payment.description.toLowerCase().includes('deposit')) {
                return total;
            }
            const amount = parseFloat(payment.amount || '0');
            return total + (isNaN(amount) ? 0 : amount);
        }, 0);
    };
    const totalCost = calculateTotalRentalCost(rental);
    return (
        <div>
            <div className="min-h-screen p-8">
                {/* Replaced <Head> with standard document title visualization */}

                <div className="mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white shadow-xl" ref={contentRef}>
                    <div className="p-8">
                        {/* START OF CONTRACT PREVIEW AREA */}

                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-extrabold tracking-widest uppercase">
                                Expats Scooter Rental Services <span className="text-xs font-normal">(EMC motorbike rental)</span>
                            </h1>
                        </div>
                        {/* --- Header Section --- */}
                        <div className="mb-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                            <div className="space-y-.5 md:col-span-2">
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
                            <span className="text-sm italic">Rental Information</span>
                        </div>
                        <div className="mb-6 space-y-3">
                            <div className="flex flex-wrap items-center space-x-4">
                                <label className="text-sm whitespace-nowrap">
                                    <span className="w-24 font-semibold">Customer Name: </span>
                                    {rental?.full_name || rental?.customer?.full_name || 'N/A'}
                                </label>

                                <div className="ml-4 flex items-center space-x-2 whitespace-nowrap">
                                    <label className="text-sm">
                                        <span className="w-24 font-semibold">Today's Date:</span> {formatDate(todayDateString)}
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center">
                                    <label className="text-sm font-semibold whitespace-nowrap">Previous Return Date:</label>
                                    {rental?.start_date ? (
                                        <span className="ml-1">{formatDate(rental?.start_date)}</span>
                                    ) : (
                                        <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                    )}
                                </div>
                                <div className="flex items-center">
                                    <label className="text-sm font-semibold whitespace-nowrap">Return Date:</label>
                                    {rental?.end_date ? (
                                        <span className="ml-1">{formatDate(rental?.end_date)}</span>
                                    ) : (
                                        <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm font-semibold whitespace-nowrap">Rental Period:</label>
                                {rental?.period ? (
                                    <span className="ml-1">{rental?.period} days</span>
                                ) : (
                                    <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                )}
                                <span className="text-sm whitespace-nowrap">PM5:00 (The rental date is counted as the 1st rental day)</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm font-semibold whitespace-nowrap">Rental Status:</label>
                                <p>Extension</p>
                            </div>
                        </div>

                        {/* --- Motorbike Details & Fee Section --- */}
                        <div className="mb-6 space-y-3 border-t border-black pt-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm font-semibold whitespace-nowrap">Vehicle ID:</label>
                                {rental?.vehicle_no && <span className="ml-1">{rental?.vehicle_no}</span>}
                                {rental?.vehicle?.vehicle_no && <span className="ml-1">{rental?.vehicle?.vehicle_no}</span>}
                                {!rental?.vehicle_no && !rental?.vehicle?.vehicle_no && <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                                <label className="text-sm font-semibold whitespace-nowrap">License Plate:</label>
                                {rental?.license_plate && <span className="ml-1">{rental?.license_plate}</span>}
                                {rental?.vehicle?.license_plate && <span className="ml-1">{rental?.vehicle?.license_plate}</span>}
                                {!rental?.license_plate && !rental?.vehicle?.license_plate && <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                                <label className="text-sm font-semibold whitespace-nowrap">Model:</label>
                                {rental?.make && (
                                    <span className="ml-1">
                                        {rental?.make} {rental?.model}
                                    </span>
                                )}
                                {rental?.vehicle?.make && (
                                    <span className="ml-1">
                                        {rental?.vehicle?.make} {rental?.vehicle?.model}
                                    </span>
                                )}
                                {!rental?.make && !rental?.vehicle?.make && <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                                <label className="text-sm font-semibold whitespace-nowrap">Class:</label>
                                {rental?.class && <span className="ml-1">{rental?.class}</span>}
                                {rental?.vehicle?.vehicle_class && <span className="ml-1">{rental?.vehicle?.vehicle_class}</span>}
                                {!rental?.class && !rental?.vehicle?.vehicle_class && <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                            </div>

                            <div className="grid grid-cols-2 border border-black bg-gray-100 text-sm font-semibold">
                                <div className="border-r border-black p-1 text-center">Total Rental Fee</div>
                                <div className="border-r border-black p-1 text-center">Deposit for Motorbike Rental</div>
                            </div>
                            <div className="grid grid-cols-2 border-r border-b border-l border-black text-sm">
                                <div className="flex items-end justify-center border-r border-black p-2">
                                    <div className="flex items-center justify-center text-lg font-black">
                                        <span className="ml-1">$</span>
                                        {totalCost && <span className="ml-1">{totalCost}</span>}
                                        {!rental?.total_cost || (!totalCost && <DottedLineInput widthClass="flex-1 min-w-[200px]" />)}
                                    </div>
                                </div>
                                <div className="space-y-1 p-2">
                                    <div className="ml-auto flex flex-col items-center justify-center text-lg font-bold">
                                        {rental?.activeDeposits &&
                                        rental.activeDeposits.filter((d: EnhancedDeposit) => d.deposit_type || d.deposit_value).length > 0 ? (
                                            rental.activeDeposits
                                                .filter((d: EnhancedDeposit) => d.deposit_type || d.deposit_value)
                                                .map((deposit: EnhancedDeposit, index: number) => (
                                                    <span key={index} className="ml-1">
                                                        {deposit.deposit_type_name === 'Money' ? (
                                                            <>
                                                                {deposit.deposit_type_name}: ${deposit.deposit_value}
                                                            </>
                                                        ) : (
                                                            <>{deposit.deposit_type_name}</>
                                                        )}
                                                    </span>
                                                ))
                                        ) : rental?.primary_deposit_type ? (
                                            <span className="ml-1">
                                                {rental.primary_deposit_type === 'Money' ? (
                                                    <>
                                                        {rental.primary_deposit_type}: ${rental.primary_deposit}
                                                    </>
                                                ) : (
                                                    <>{rental.primary_deposit_type}</>
                                                )}
                                            </span>
                                        ) : rental?.customer.primary_deposit_type ? (
                                            <span className="ml-1">
                                                {rental.customer.primary_deposit_type === 'Money' ? (
                                                    <>
                                                        {rental.customer.primary_deposit_type}: ${rental.customer.primary_deposit}
                                                    </>
                                                ) : (
                                                    <>{rental.customer.primary_deposit_type}</>
                                                )}
                                            </span>
                                        ) : (
                                            <>
                                                <span className="ml-1">$</span>
                                                <DottedLineInput widthClass="w-20" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* --- Return/Exchange Policy --- */}
                        <div className="mb-6">
                            <h2 className="mb-2 border-b border-black text-lg font-bold">The effect of this contract and previous contracts</h2>
                            <p className="text-sm">
                                Previous contract articles and policies are effective in this contract. And this contract is effective until you
                                return the rental motorbike to EMC.
                            </p>
                        </div>
                        {/* --- Compensation Policy --- */}
                        <div className="mb-6">
                            <h2 className="mb-2 border-b border-black text-lg font-bold">Compensation Policy</h2>
                            <p className="mb-2 text-sm">
                                If the motorbike is stolen or seriously damaged (assessed as unavailable for rental service of EMC), you shall pay $
                                {rental?.compensation_price && <span className="ml-1 font-bold">{rental?.compensation_price}</span>}
                                {rental?.vehicle?.compensation_price && <span className="ml-1 font-bold">{rental?.vehicle?.compensation_price}</span>}
                                {!rental?.compensation_price && !rental?.vehicle?.compensation_price && (
                                    <DottedLineInput widthClass="w-20 inline" />
                                )}{' '}
                                as compensation fee in total. The motorbike has no insurance for any loss or damage; you should take care of the
                                motorbike in secure and be fully responsible for any loss and damage. In case of an accident or serious
                                breakdown/trouble, you shall inform our company by calling immediately.
                            </p>
                            <p className="text-sm">
                                You shall pay all the amount of compensation fee at one time basically (payment condition is negotiable).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExtendContract;
