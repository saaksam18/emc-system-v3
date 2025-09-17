import React, { useState } from 'react';

// Use this for a single-file component without separate CSS files.
// All Tailwind classes are included directly in the JSX.

const App: React.FC = () => {
    const [formData, setFormData] = useState({
        customerName: '',
        sex: '',
        nationality: '',
        otherNationality: '',
        phoneNumber: '',
        occupation: '',
        presentAddress: '',
        rentalDate: '',
        returnDate: '',
        rentalPeriodDays: '',
        rentalPeriodMonths: '',
        helmetRental: '',
        howToKnow: [],
        howToKnowOther: '',
        wordOfMouseWho: '',
        flyerShop: '',
        magazineName: '',
        odometerStart: '',
        odometerEnd: '',
        totalRentalFee: '',
        deposit: '',
        depositMethod: '',
        otherDepositMethod: '',
        renterSignature: '',
        staffName: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData((prev) => ({
                ...prev,
                howToKnow: checked ? [...prev.howToKnow, name] : prev.howToKnow.filter((item) => item !== name),
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const nationalityOptions = ['USA', 'France', 'German', 'England', 'Korea', 'Philippines', 'Australia', 'Japan', 'Cambodia'];

    return (
        <div className="min-h-screen bg-gray-100 p-4 font-sans">
            <div className="mx-auto max-w-4xl space-y-8 rounded-xl bg-white p-8 shadow-lg">
                {/* Header Section */}
                <div className="flex items-center justify-center space-x-4 rounded-lg border border-black p-4">
                    <div className="flex-shrink-0">
                        <svg className="h-24 w-24 sm:h-32 sm:w-32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M512 256c0 141.4-114.6 256-256 256S0 397.4 0 256 114.6 0 256 0s256 114.6 256 256zM256 96c-8.8 0-16 7.2-16 16v128c0 8.8 7.2 16 16 16s16-7.2 16-16V112c0-8.8-7.2-16-16-16zM256 416a160 160 0 1 0 0-320 160 160 0 1 0 0 320z" />
                            <path
                                className="fill-white"
                                d="M256 160c-8.8 0-16 7.2-16 16v128c0 8.8 7.2 16 16 16s16-7.2 16-16V176c0-8.8-7.2-16-16-16z"
                            />
                            <path d="M256 224c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16z" />
                        </svg>
                        <svg className="h-24 w-24 sm:h-32 sm:w-32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor">
                            <path d="M192 64C86 64 0 150 0 256S86 448 192 448H448c106 0 192-86 192-192S554 64 448 64H192zm0 80c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zM352 256c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z" />
                        </svg>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-3xl font-extrabold text-black sm:text-4xl md:text-5xl">
                            <span className="relative">
                                <span className="relative z-10">EMC</span>
                                <span className="absolute top-1/2 left-0 h-1 w-full bg-black"></span>
                            </span>
                        </div>
                        <div className="mt-2 text-center text-sm font-semibold sm:text-base">Expat Scooter Rental Service (EMC motorbike rental)</div>
                    </div>
                </div>

                {/* Business Info Section */}
                <div className="space-y-2 text-sm sm:text-base">
                    <p>
                        <span className="font-bold">&lt;Address&gt;</span> No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh
                    </p>
                    <p>
                        <span className="font-bold">&lt;Business Days&gt;</span> From Monday-Friday, Closed on Saturday and Sundays and National
                        Holidays
                    </p>
                    <p>
                        <span className="font-bold">&lt;Business Hours&gt;</span> AM9:00 - PM5:00
                    </p>
                    <p className="italic">*Contact us in case of emergency problem even outside business hours</p>
                    <p>
                        <span className="font-bold">&lt;Contact&gt;</span> Tel: 069-400-260 (Khmer, English) or What App
                    </p>
                </div>

                {/* Form Fields Section 1 */}
                <div className="space-y-4">
                    <p className="text-sm italic">Please Fill Out the Area</p>
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                        <label className="w-full sm:w-auto">
                            Customer Name:
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                        <div className="flex items-center space-x-4">
                            <span className="font-semibold">Sex:</span>
                            <label>
                                <input
                                    type="radio"
                                    name="sex"
                                    value="male"
                                    checked={formData.sex === 'male'}
                                    onChange={handleInputChange}
                                    className="mr-1"
                                />
                                male
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="sex"
                                    value="female"
                                    checked={formData.sex === 'female'}
                                    onChange={handleInputChange}
                                    className="mr-1"
                                />
                                female
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                            Nationality:
                            <select
                                name="nationality"
                                value={formData.nationality}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            >
                                <option value="">-- Select --</option>
                                {nationalityOptions.map((nat) => (
                                    <option key={nat} value={nat}>
                                        {nat}
                                    </option>
                                ))}
                                <option value="other">other</option>
                            </select>
                            {formData.nationality === 'other' && (
                                <input
                                    type="text"
                                    name="otherNationality"
                                    value={formData.otherNationality}
                                    onChange={handleInputChange}
                                    placeholder="Please specify"
                                    className="mt-2 block w-full border-b border-black bg-transparent outline-none"
                                />
                            )}
                        </label>
                        <label className="block">
                            Phone Number:
                            <input
                                type="text"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                        <label className="block md:col-span-2">
                            Occupation in Cambodia:
                            <input
                                type="text"
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                        <label className="block md:col-span-2">
                            Present Address in Cambodia:
                            <input
                                type="text"
                                name="presentAddress"
                                value={formData.presentAddress}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                            Rental Date:
                            <input
                                type="date"
                                name="rentalDate"
                                value={formData.rentalDate}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                        <label className="block">
                            Return Date:
                            <input
                                type="date"
                                name="returnDate"
                                value={formData.returnDate}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                    </div>
                    <p className="mt-2 text-sm">PM6:00 (The rental date is counted as the 1st rental day)</p>

                    <div className="mt-4 flex items-center space-x-4">
                        <span className="font-semibold">Helmet Rental:</span>
                        <label>
                            <input
                                type="radio"
                                name="helmetRental"
                                value="Yes"
                                checked={formData.helmetRental === 'Yes'}
                                onChange={handleInputChange}
                                className="mr-1"
                            />
                            Yes
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="helmetRental"
                                value="No"
                                checked={formData.helmetRental === 'No'}
                                onChange={handleInputChange}
                                className="mr-1"
                            />
                            No
                        </label>
                    </div>

                    <div className="mt-4">
                        <p className="font-semibold">- How to get to know our shop? -</p>
                        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="Facebook"
                                    checked={formData.howToKnow.includes('Facebook')}
                                    onChange={handleInputChange}
                                />
                                <span>Facebook</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="Web Page"
                                    checked={formData.howToKnow.includes('Web Page')}
                                    onChange={handleInputChange}
                                />
                                <span>Web Page</span>
                            </label>
                            <div className="flex flex-col">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="Word-of-Mouse"
                                        checked={formData.howToKnow.includes('Word-of-Mouse')}
                                        onChange={handleInputChange}
                                    />
                                    <span>Word-of-Mouse (Who:</span>
                                </label>
                                {formData.howToKnow.includes('Word-of-Mouse') && (
                                    <input
                                        type="text"
                                        name="wordOfMouseWho"
                                        value={formData.wordOfMouseWho}
                                        onChange={handleInputChange}
                                        className="block w-full border-b border-black bg-transparent outline-none"
                                    />
                                )}
                                <span>)</span>
                            </div>
                            <div className="flex flex-col">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="Flyer" checked={formData.howToKnow.includes('Flyer')} onChange={handleInputChange} />
                                    <span>Flyer (shop:</span>
                                </label>
                                {formData.howToKnow.includes('Flyer') && (
                                    <input
                                        type="text"
                                        name="flyerShop"
                                        value={formData.flyerShop}
                                        onChange={handleInputChange}
                                        className="block w-full border-b border-black bg-transparent outline-none"
                                    />
                                )}
                                <span>)</span>
                            </div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="Shop Signboard"
                                    checked={formData.howToKnow.includes('Shop Signboard')}
                                    onChange={handleInputChange}
                                />
                                <span>Shop Signboard</span>
                            </label>
                            <div className="flex flex-col">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="Magazine"
                                        checked={formData.howToKnow.includes('Magazine')}
                                        onChange={handleInputChange}
                                    />
                                    <span>Magazine (</span>
                                </label>
                                {formData.howToKnow.includes('Magazine') && (
                                    <input
                                        type="text"
                                        name="magazineName"
                                        value={formData.magazineName}
                                        onChange={handleInputChange}
                                        className="block w-full border-b border-black bg-transparent outline-none"
                                    />
                                )}
                                <span>)</span>
                            </div>
                            <div className="flex flex-col">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="Other" checked={formData.howToKnow.includes('Other')} onChange={handleInputChange} />
                                    <span>Other (</span>
                                </label>
                                {formData.howToKnow.includes('Other') && (
                                    <input
                                        type="text"
                                        name="howToKnowOther"
                                        value={formData.howToKnowOther}
                                        onChange={handleInputChange}
                                        className="block w-full border-b border-black bg-transparent outline-none"
                                    />
                                )}
                                <span>)</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                        <label className="block w-full sm:w-1/2">
                            Odometer:
                            <input
                                type="text"
                                name="odometerStart"
                                value={formData.odometerStart}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                        <label className="block w-full sm:w-1/2">
                            Odometer:
                            <input
                                type="text"
                                name="odometerEnd"
                                value={formData.odometerEnd}
                                onChange={handleInputChange}
                                className="block w-full border-b border-black bg-transparent outline-none"
                            />
                        </label>
                    </div>
                </div>

                {/* Fee and Deposit Section */}
                <div className="space-y-4 rounded-lg border border-black p-4">
                    <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-8">
                        <div className="flex-1 space-y-2">
                            <p className="font-bold">Rental Fee</p>
                            <div className="flex items-center space-x-2">
                                <input type="radio" name="rentalFee" value="1-7days" />
                                <span className="text-sm">1-7days $21</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="radio" name="rentalFee" value="8-19days" />
                                <span className="text-sm">8-19days $3/day</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="radio" name="rentalFee" value="1month" />
                                <span className="text-sm">1month $60</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="block">
                                <span className="font-bold">Total Rental Fee:</span>
                                <input
                                    type="text"
                                    name="totalRentalFee"
                                    value={formData.totalRentalFee}
                                    onChange={handleInputChange}
                                    className="block w-full border-b border-black bg-transparent outline-none"
                                />
                            </label>
                        </div>

                        <div className="flex-1 space-y-2">
                            <p className="font-bold">Deposit for Motorbike Rental</p>
                            <div className="flex items-center space-x-2">
                                <input type="radio" name="depositMethod" value="Passport" />
                                <span className="text-sm">Your Passport</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="depositMethod"
                                    value="Other"
                                    checked={formData.depositMethod === 'Other'}
                                    onChange={handleInputChange}
                                />
                                <span className="text-sm">Other</span>
                            </div>
                            {formData.depositMethod === 'Other' && (
                                <input
                                    type="text"
                                    name="otherDepositMethod"
                                    value={formData.otherDepositMethod}
                                    onChange={handleInputChange}
                                    placeholder="(e.g. Cheque, etc.)"
                                    className="mt-2 block w-full border-b border-black bg-transparent outline-none"
                                />
                            )}
                            <label className="block">
                                <span className="font-bold">Deposit: $</span>
                                <input
                                    type="text"
                                    name="deposit"
                                    value={formData.deposit}
                                    onChange={handleInputChange}
                                    className="block w-full border-b border-black bg-transparent outline-none"
                                />
                                <span className="text-sm">(The same price as compensation fee)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Policy Section */}
                <div className="space-y-4 text-sm">
                    <h3 className="font-bold">Compensation Policy</h3>
                    <p>
                        If the motorbike is stolen or seriously damaged (assessed as unavailable for rental service of EMC), you shall pay $400 as
                        compensation fee in total. The motorbike has no insurance for any loss or damage; you should take care of the motorbike in
                        secure and be fully responsible for any loss and damage. In case of an accident or serious breakdown/trouble, you shall inform
                        our company by calling immediately. You shall pay all the amount of compensation fee at one time basically (payment condition
                        is negotiable).
                    </p>
                    <h3 className="font-bold">Return/Exchange Policy</h3>
                    <ol className="list-inside list-decimal space-y-2">
                        <li>
                            When you return/exchange the rental motorbike, you should fill the gasoline up before return/exchange. You shall fill
                            gasoline up or pay some money as gasoline fee.
                        </li>
                        <li>You can exchange rental motorbikes at the same price if the rental motorbike has any trouble.</li>
                        <li>
                            When you want to exchange more expensive type of motorbike and you keep on using this one, you need to pay the amount of
                            price difference between the 2 motorbikes.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4 text-sm">
                    <h3 className="font-bold">Repair Policy</h3>
                    <ol className="list-inside list-decimal space-y-2">
                        <li>
                            Rental motorbike shall be used in Phnom Penh city area only. In case the motorbike is used outside of Phnom Penh city, you
                            shall be responsible for any damage/problem concerning the motorbike. If the motorbike does not work outside of Phnom Penh
                            city, you have to repair it to the original condition and inform EMC immediately.
                        </li>
                        <li>
                            Even in breakdown/trouble of rental motorbike, you shall bring the motorbike back to EMC shop as long as the motorbike can
                            run with safety.
                        </li>
                        <li>
                            When rental motorbike tires or tubes are got flat/broken during the rental period, you should pay repair fee by yourself
                            except first or second day of rental (Customer should pay the repair fee from third day of rental).
                        </li>
                        <li>
                            When rental motorbike parts, helmets, keys, and a key tag get lost or breakdown/damage owing to physical shock or 3rd
                            party’s action, you are responsible for repair/compensation fee.
                        </li>
                        <li>
                            When rental motorbike key or rental helmet is lost or damaged, the renter needs to pay some compensation. (Details are
                            described in other paper)
                        </li>
                        <li>
                            When rental motorbike parts get breakdown/damage under normal use (e.g. Light is off, gasoline gauge is not working), you
                            can exchange the motor or ask for repair fee from EMC with the receipt that shows the actual expenses of standard
                            market-price.
                        </li>
                        <li>
                            EMC finds rental-motor has a problem/broken part when you return the motorbike to EMC; EMC is entitled to keep your
                            deposit (passport, money or equivalent until the full amount of repair/compensation fee is paid off.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4 text-sm">
                    <h3 className="font-bold">Phone Number & Address Change</h3>
                    <p>
                        When you change the phone number or current address in Phnom Penh city, NEVER FAIL TO LET US KNOW your new phone number or new
                        address via SMS mail, phone, or Facebook.
                    </p>
                    <h3 className="font-bold">Refund Policy</h3>
                    <p>
                        When you get back the motor more than 1 week earlier before your scheduled return date, EMC shall refund 50% rental fee of the
                        rest of your rental days.
                    </p>
                    <h3 className="font-bold">Overdue Penalties</h3>
                    <ol className="list-inside list-decimal space-y-2">
                        <li>
                            If your payment is overdue more than 3 days without any notice to EMC or without a specific reason (ex: unexpected
                            accident/serious-illness), additionally you shall pay $2 per day as penalty charge for delay apart from rental fee.
                        </li>
                        <li>
                            If your payment is overdue more than 10 days without any notice to EMC, EMC is entitled to visit your working place or
                            residence without any notice to you for the purpose of investigating a situation, collecting the payment. In this case,
                            you shall pay $6 per visit (EMC make a record of visit with physical evidences) as collection fee apart from rental fee &
                            penalty charge.
                        </li>
                        <li>
                            If you keep using rental motorbike without paying extension fee, penalty charge or collection fee, EMC can stop renting
                            the motorbike anytime under EMC’s discretion and can repossess the motorbike without any notice to you. In this case, you
                            still shall pay total unpaid amount (e.g. Penalty fee, Collection fee)
                        </li>
                    </ol>
                    <h3 className="font-bold">The effect of the contract</h3>
                    <p>
                        When you make an extension rental or a motorbike exchange contract with EMC, all the articles and policies in this contract
                        except the amount of compensation fee remain effective until you return your rental motorbike to EMC.
                    </p>
                </div>

                {/* Signature Section */}
                <div className="mt-8 flex flex-col items-center justify-between space-y-4 text-sm sm:flex-row sm:space-y-0 sm:space-x-8">
                    <label className="block w-full sm:w-1/2">
                        The Renter:
                        <input
                            type="text"
                            name="renterSignature"
                            value={formData.renterSignature}
                            onChange={handleInputChange}
                            className="block w-full border-b border-black bg-transparent outline-none"
                        />
                    </label>
                    <label className="block w-full sm:w-1/2">
                        Staff Name:
                        <input
                            type="text"
                            name="staffName"
                            value={formData.staffName}
                            onChange={handleInputChange}
                            className="block w-full border-b border-black bg-transparent outline-none"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default App;
