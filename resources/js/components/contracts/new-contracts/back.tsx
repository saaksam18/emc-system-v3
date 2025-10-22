import { Ref } from 'react';

interface PageProps {
    contentRef: Ref<HTMLDivElement> | undefined;
}
function BackNewContract({ contentRef }: PageProps) {
    return (
        <div>
            <div className="min-h-screen p-8">
                {/* Replaced <Head> with standard document title visualization */}

                <div className="contract-document mx-auto h-[297mm] w-[210mm] overflow-hidden rounded-lg bg-white shadow-xl" ref={contentRef}>
                    <div className="p-8">
                        {/* --- Repair Policy --- */}
                        <div className="mb-2">
                            <h2 className="mb-2 border-b border-black text-lg font-bold">Repair Policy</h2>
                            <ol className="space-y-.5 list-decimal pl-5 text-sm">
                                <li>
                                    Rental motorbike shall be used in Phnom Penh city area only. In case the motorbike is used outside of Phnom Penh
                                    city, you shall be responsible for any damage/problem concerning the motorbike. If the motorbike does not work
                                    outside of Phnom Penh city, you have to repair it to the original condition and inform EMC immediately.
                                </li>
                                <li>
                                    Even in breakdown/trouble of rental motorbike, you shall bring the motorbike back to EMC shop as long as the
                                    motorbike can run with safety.
                                </li>
                                <li>
                                    When rental motorbike tires or tubes are got flat/broken during the rental period, you should pay repair fee by
                                    yourself except first or second day of rental (Customer should pay the repair fee from third day of rental).
                                </li>
                                <li>
                                    When rental motorbike parts, helmets, keys, and a key tag get lost or breakdown/damage owing to physical shock or
                                    3rd party’s action, you are responsible for repair/compensation fee.
                                </li>
                                <li>
                                    When rental motorbike key or rental helmet is lost or damaged, the renter needs to pay some compensation. (Details
                                    are described in other paper)
                                </li>
                                <li>
                                    When rental motorbike parts get breakdown/damage under normal use (e.g. Light is off, gasoline gauge is not
                                    working), you can exchange the motor or ask for repair fee from EMC with the receipt that shows the actual
                                    expenses of standard market-price.
                                </li>
                                <li>
                                    EMC finds rental-motor has a problem/broken part when you return the motorbike to EMC; EMC is entitled to keep
                                    your deposit (passport, money or equivalent until the full amount of repair/compensation fee is paid off.
                                </li>
                            </ol>
                        </div>

                        {/* --- Minor Policy Sections --- */}
                        <div className="mb-2 space-y-2">
                            <div>
                                <h2 className="mb-1 border-b border-black text-lg font-bold">Phone Number & Address Change</h2>
                                <p className="text-sm">
                                    When you change the phone number or current address in Phnom Penh city,{' '}
                                    <span className="font-bold underline">NEVER FAIL TO LET US KNOW</span> your new phone number or new address via
                                    SMS mail, phone, or Facebook.
                                </p>
                            </div>
                            <div>
                                <h2 className="mb-1 border-b border-black text-lg font-bold">Refund Policy</h2>
                                <p className="text-sm">
                                    EMC shall refund 50% rental fee of the rest of your rental days when you get back the motor more than 1 week
                                    earlier before your scheduled return date.
                                </p>
                            </div>
                            <div>
                                <h2 className="mb-1 border-b border-black text-lg font-bold">Driven out of Phnom Penh city Penalties</h2>
                                <p className="text-sm">
                                    Our scooter is exclusively permitted for use within the confines of Phnom Penh city. Any unauthorized use outside
                                    of this designated area incurs a daily penalty of $100.
                                </p>
                            </div>
                            <div>
                                <h2 className="mb-1 border-b border-black text-lg font-bold">Overdue Penalties</h2>
                                <ol className="list-decimal space-y-1 pl-5 text-sm">
                                    <li>
                                        If your payment is overdue more than 3 days without any notice to EMC or without a specific reason (ex:
                                        unexpected accident/serious-illness), additionally you shall pay $2 per day as penalty charge for delay apart
                                        from rental fee.
                                    </li>
                                    <li>
                                        If your payment is overdue more than 10 days without any notice to EMC, EMC is entitled to visit your working
                                        place or residence without any notice to you for the purpose of investigating a situation, collecting the
                                        payment. In this case, you shall pay $6 per visit (EMC make a record of visit with physical evidences) as
                                        collection fee apart from rental fee & penalty charge.
                                    </li>
                                    <li>
                                        If you keep using rental motorbike without paying extension fee, penalty charge or collection fee, EMC can
                                        stop renting the motorbike anytime under EMC’s discretion and can repossess the motorbike without any notice
                                        to you. In this case, you still shall pay total unpaid amount (e.g. Penalty fee, Collection fee)
                                    </li>
                                </ol>
                            </div>
                            <div>
                                <h2 className="mb-1 border-b border-black text-lg font-bold">The effect of the contract</h2>
                                <p className="text-sm">
                                    When you make an extension rental or a motorbike exchange contract with EMC, all the articles and policies in this
                                    contract except the amount of compensation fee remain effective until you return your rental motorbike to EMC.
                                </p>
                            </div>
                        </div>

                        {/* --- Signature Block --- */}
                        <div className="mt-5 border-t border-black pt-2">
                            <h2 className="mb-2 text-lg font-bold">Signature</h2>
                            <div className="flex justify-between text-sm">
                                <div className="flex w-1/2 flex-col items-center">
                                    <span className="w-48 border-b border-black py-2"></span>
                                    <span className="mt-1">The Renter</span>
                                </div>
                                <div className="flex w-1/2 flex-col items-center">
                                    <span className="w-48 border-b border-black py-2"></span>
                                    <span className="mt-1">Staff Name</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BackNewContract;
