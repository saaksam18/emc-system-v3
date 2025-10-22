import { RentalsType } from '@/types';
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

function FrontNewContract({ rental, contentRef }: PageProps) {
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

    // NEW FUNCTION: Helper to format the phone number string
    const formatPhoneNumber = (phoneNumber: string | undefined): { local: string | undefined; international: string | undefined } => {
        if (!phoneNumber) return { local: undefined, international: undefined };

        // 1. Clean the input: remove all non-digit characters and any international prefix like '00'
        let cleaned = ('' + phoneNumber).replace(/\D/g, '');

        // Remove leading country code if present (e.g., if +855, 855, or 0 is already at the start)
        // This logic is crucial for standardizing the local number part.
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1); // Remove leading '0' (e.g., 089xxxx -> 89xxxx)
        }
        // Assuming the Cambodian country code is 855
        if (cleaned.startsWith('855')) {
            cleaned = cleaned.substring(3); // Remove '855' (e.g., 85589xxxx -> 89xxxx)
        }

        // Now, 'cleaned' should be the local part of the number (usually 8-9 digits).

        const localPart = cleaned;
        let localFormatted = cleaned; // Default to cleaned if no match

        // 2. Local Display Format (e.g., 089 176 942)
        // We check for 8-9 digit patterns common in Cambodia
        const match = localPart.match(/^(\d{2,3})(\d{3})(\d{3,4})$/); // e.g., (89)(176)(942) or (89)(176)(9426)

        if (match) {
            // Use the leading '0' for local display, then group the rest.
            localFormatted = `0${match[1]} ${match[2]} ${match[3]}`;
        } else {
            // If the number is too long (like your 10-digit example: 8917694264) or short,
            // we'll just insert spaces after 3 digits for readability, but use the original input
            // which includes the leading '0' if it was there in the original data.
            localFormatted = phoneNumber.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
        }

        // 3. International (E.164) Format (e.g., +85589176942)
        const internationalFormatted = localPart.length >= 8 ? `+855${localPart}` : undefined;

        return {
            local: localFormatted,
            international: internationalFormatted,
        };
    };

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

    const calculateTotalRentalCost = (rentalData: { sale: { helmet: { amount: string }; rental: { amount: string } } }): number => {
        // Safely access the amount, defaulting to '0' if the property or nested object is undefined.
        // The nullish coalescing operator (??) is used for robust default assignment.
        const helmetAmountStr = rentalData.sale.helmet?.amount ?? '0';
        const rentalAmountStr = rentalData.sale.rental?.amount ?? '0';

        // Convert the string amounts (which are now guaranteed to be either the original string or '0') to numbers.
        const helmetAmount = parseFloat(helmetAmountStr);
        const rentalAmount = parseFloat(rentalAmountStr);

        // Basic check for valid conversion, though '0' should always convert correctly.
        if (isNaN(helmetAmount) || isNaN(rentalAmount)) {
            console.error('One or both amounts are not valid numbers.');
            return 0; // Return 0 or throw an error based on your desired error handling
        }

        return helmetAmount + rentalAmount;
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
                                        <span className="w-24 font-semibold">Sex:</span> {rental?.sex || rental?.customer?.gender || 'N/A'}
                                    </label>
                                </div>
                                <label className="text-sm whitespace-nowrap">
                                    <span className="w-24 font-semibold">Nationality:</span>{' '}
                                    {rental?.nationality || rental?.customer?.nationality || 'N/A'}
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label className="text-sm font-semibold whitespace-nowrap">
                                    {rental?.primary_contact_type && <>{rental?.primary_contact_type}</>}
                                    {rental?.customer?.primary_contact_type && <>{rental?.customer?.primary_contact_type}</>}
                                    {!rental?.primary_contact_type && !rental?.customer?.primary_contact_type && <>Contact</>}
                                </label>
                                {rental?.primary_contact &&
                                    (() => {
                                        const formatted = formatPhoneNumber(rental.primary_contact);
                                        return (
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm">{formatted.local || rental.primary_contact}</span>
                                            </div>
                                        );
                                    })()}
                                {rental?.customer?.primary_contact &&
                                    (() => {
                                        const formatted = formatPhoneNumber(rental.customer.primary_contact);
                                        return (
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm">{formatted.local || rental.customer.primary_contact}</span>
                                            </div>
                                        );
                                    })()}
                                {!rental?.primary_contact && !rental?.customer?.primary_contact && (
                                    <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                )}

                                <label className="text-sm font-semibold whitespace-nowrap">Occupation in Cambodia:</label>
                                {rental?.occupations ? <>{rental?.occupations}</> : <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                            </div>

                            <div className="flex items-center">
                                <label className="text-sm font-semibold whitespace-nowrap">Present Address in Cambodia:</label>
                                {rental?.address && <span className="ml-1">{rental?.address}</span>}
                                {rental?.customer?.address && <span className="ml-1">{rental?.customer?.address}</span>}
                                {!rental?.address && !rental?.customer?.address && <DottedLineInput widthClass="flex-1 min-w-[200px]" />}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center">
                                    <label className="text-sm font-semibold whitespace-nowrap">Rental Date:</label>
                                    {rental?.actual_start_date ? (
                                        <span className="ml-1">{formatDate(rental?.actual_start_date)}</span>
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

                            <div className="flex items-center space-x-4">
                                <label className="text-sm font-semibold whitespace-nowrap">Helmet Rental:</label>
                                {rental?.helmet_amount === 1 && <span className="ml-1">{rental?.helmet_amount} Helmet</span>}
                                {rental?.helmet_amount > 1 && <span className="ml-1">{rental?.helmet_amount} Helmets</span>}
                                {!rental?.helmet_amount && <DottedLineInput widthClass="w-[80px]" />}
                            </div>

                            <div className="pt-2">
                                <span className="text-sm font-semibold">How to get to know our shop? (survey)</span>
                                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                                    {rental?.how_know_shop ? (
                                        <span className="ml-1">{rental?.how_know_shop}</span>
                                    ) : (
                                        <DottedLineInput widthClass="flex-1 min-w-[200px]" />
                                    )}
                                </div>
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
                                        rental.activeDeposits.filter((d) => d.deposit_type || d.deposit_value).length > 0 ? (
                                            rental.activeDeposits
                                                .filter((d) => d.deposit_type || d.deposit_value)
                                                .map((deposit, index) => (
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
        </div>
    );
}

export default FrontNewContract;
