import { Create as CreateCustomerSheet } from '@/components/customers/sheets/create';
import { Edit as EditCustomerSheet } from '@/components/customers/sheets/edit'; // New import
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { ContactTypes, Customers, RentalsType, SaleTransaction } from '@/types'; // Import necessary types
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BikeIcon, Check, Printer, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// IMPORTING TYPES AND DATA
import {
    DetailedCustomerResponse,
    ExtendContractFormValues,
    FormErrors,
    TransactionProcessingPageProps as PageProps,
    extendSteps,
    initialExtendFormValues,
    updateRentalBreadcrumbs,
} from '@/types/transaction-types';

// Reusable UI Component
import { FormSection } from '@/components/form/FormSection';
import CustomerDetailsCard from '@/components/rentals/rental-transactioins/customer-details-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';

// --- Type Definitions from payment-details.tsx ---
interface ExtendedPageProps extends PageProps {
    flash: {
        success?: string;
        error?: string;
        errors?: Record<string, string>;
    };
    contactTypes: ContactTypes[];
    lastSale: SaleTransaction[] | undefined;
    rental: RentalsType | undefined;
}
// --- End of Type Definitions ---

function ExtendTransaction({
    vehicle,
    customers,
    vehicleStatuses,
    depositTypes,
    users,
    chartOfAccounts,
    contactTypes,
    lastSale,
    rental,
}: ExtendedPageProps) {
    const { props: pageProps } = usePage<ExtendedPageProps>();
    // Effect for flash messages
    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.errors && typeof flash.errors === 'object' && flash.errors !== null) {
            Object.values(flash.errors)
                .flat()
                .forEach((message) => {
                    if (message) {
                        toast.error(String(message));
                    }
                });
        }
    }, [pageProps.flash]);

    /* --- Step/Progress Logic --- */
    const [step, setStep] = useState(1);
    const progressWidth = useMemo(() => {
        const totalSegments = extendSteps.length - 1;
        const completedSegments = Math.max(0, step - 1);
        if (totalSegments === 0) return '0%';
        return `${(completedSegments / totalSegments) * 100}%`;
    }, [step]);

    const nextStep = () => {
        if (validateCurrentStep()) {
            setStep((prev) => Math.min(extendSteps.length, prev + 1));
        }
    };
    const prevStep = () => {
        if (step === extendSteps.length) {
            // If on the confirm step, reset the tabs
            setIsActiveTab('front');
            setCurrentTab(1);
        }
        setStep((prev) => Math.max(1, prev - 1));
    };

    // Conform step tabs
    const [isActiveTab, setIsActiveTab] = useState('front');
    const [currentTab, setCurrentTab] = useState(1);
    /* --- End Step/Progress Logic --- */

    // --- 1. State Management and Form Setup ---
    const { data, setData, put, processing, errors, clearErrors, setError } = useForm<ExtendContractFormValues>({
        ...initialExtendFormValues,
        rental_id: rental?.id || null,
        start_date: rental?.start_date || null,
    });

    const formErrors = errors as FormErrors;
    // Customer
    const [selectedCustomerData, setSelectedCustomerData] = useState<Customers | null>(null);
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [isEditCustomerSheetOpen, setIsEditCustomerSheetOpen] = useState(false);

    // isSubmissionComplete for activate print button
    const [isSubmissionComplete, setIsSubmissionComplete] = useState(false);

    /* Create New Customer */
    const onCreateClick = () => setCustomerDialogOpen(true);
    const handleCustomerCreateSuccess = () => {
        setCustomerDialogOpen(false);
        toast.success('New customer created successfully! The customer list has been updated.');
        router.reload({ only: ['customers'] });
    };
    /* End Create New Customer */

    /* Update Customer */
    const onUpdateClick = () => {
        if (selectedCustomerData) {
            setIsEditCustomerSheetOpen(true);
        } else {
            toast.error('No customer selected to update.');
        }
    };
    const handleCustomerUpdateSuccess = () => {
        // New handler
        setIsEditCustomerSheetOpen(false);
        toast.success('Customer updated successfully!');
        router.reload({
            only: ['customers'],
            onSuccess: () => {
                if (selectedCustomerData) {
                    fetchCustomerData(selectedCustomerData.id);
                }
            },
        });
    };
    /* End Update Customer */

    /* --- Side Effects & Handlers --- */
    // Function to fetch customer data
    useEffect(() => {
        // Chec if the rental object and customer ID exist
        if (rental && rental.customer_id) {
            // Call the asynchronous function to fetch the full customer object
            fetchCustomerData(rental.customer_id);
        }
    }, [rental]);
    const fetchCustomerData = async (customerId: number) => {
        if (!customerId) {
            setSelectedCustomerData(null);
            return;
        }

        const loadingToastId = toast.loading(`Fetching details for Customer ID: ${customerId}...`);

        try {
            const response = await fetch(`/api/customer/${customerId}`);
            if (!response.ok) {
                toast.error(`Failed to fetch customer details. Status: ${response.status}`, {
                    id: loadingToastId,
                    description: 'Please check the network connection or contact support.',
                });
                throw new Error(`Failed to fetch customer details. Status: ${response.status}`);
            }
            const apiData: DetailedCustomerResponse = await response.json();
            toast.success(`Customer ${apiData.customer.full_name || apiData.customer.id} loaded successfully!`, {
                id: loadingToastId,
                description: 'You can now proceed with the rental transaction.',
                duration: 3000,
            });
            setSelectedCustomerData(apiData.customer);
        } catch (error) {
            console.error('Error fetching customer data:', error);
            toast.error('A network error occurred.', {
                id: loadingToastId,
                description: 'Could not connect to the server to fetch customer data.',
            });
            setSelectedCustomerData(null);
        }
    };
    // End Function to fetch customer data
    const handleComboboxChange = (field: keyof ExtendContractFormValues, value: string, id: number | null = null) => {
        const fieldString = field as string;
        const finalValue = fieldString.includes('_id') ? id : value;

        setData((prev) => ({ ...prev, [field]: finalValue }));

        if (field === 'customer_id') {
            if (id !== null) {
                fetchCustomerData(id);
            } else {
                setSelectedCustomerData(null);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let finalValue: string | boolean = value;

        if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
            finalValue = e.target.checked;
        }

        const fieldName = name as keyof ExtendContractFormValues;
        setData(fieldName, finalValue);
        clearErrors(fieldName as keyof FormErrors);
    };
    /* --- End Side Effects & Handlers --- */

    // Get the component for the current step
    const CurrentStepComponent = extendSteps.find((s) => s.id === step)?.component;
    const currentStepData = extendSteps.find((s) => s.id === step);

    // --- Validation ---
    const validateCurrentStep = (): boolean => {
        const currentStepData = extendSteps.find((s) => s.id === step);
        if (!currentStepData) return true;

        const newErrors: Partial<FormErrors> = {};

        currentStepData.fields.forEach((field) => {
            if (field === 'payments') {
                // 1. Filter out auto-generated/system payments (like helmet fee or deposit)
                const paymentsToValidate = data.payments.filter(
                    (p) => p.id !== 'auto_helmet_fee' && !p.id.toString().startsWith('temp_payment_deposit_'),
                );

                if (paymentsToValidate.length > 0) {
                    // 2. Iterate through ALL payments to find their original index and validate them
                    data.payments.forEach((payment, index) => {
                        // Skip system-generated payments, which are not user-editable
                        if (payment.id === 'auto_helmet_fee' || payment.id?.toString().startsWith('temp_payment_deposit_')) {
                            return;
                        }

                        // Check Amount
                        if (!payment.amount || parseFloat(payment.amount as string) <= 0) {
                            newErrors[`payments.${index}.amount`] = 'Amount must be a positive number.';
                        }

                        // Check Income Account (credit_account_id) - always required
                        if (!payment.credit_account_id) {
                            newErrors[`payments.${index}.credit_account_id`] = 'Income account is required.';
                        }

                        // Check Target Bank Account (debit_target_account_id) - required for 'bank' or 'credit'
                        if (['bank', 'credit'].includes(payment.payment_type) && !payment.debit_target_account_id) {
                            newErrors[`payments.${index}.debit_target_account_id`] = 'Target bank/credit account is required.';
                        }
                    });

                    // After checking all payments, if newErrors contains specific payment errors,
                    // we don't need a generic array error. If no manual payments were validated,
                    // we should skip the generic check below.
                    const hasPaymentErrors = Object.keys(newErrors).some((key) => key.startsWith('payments.'));

                    if (paymentsToValidate.length > 0 && !hasPaymentErrors) {
                        // Success: All validated payments passed.
                    } else if (paymentsToValidate.length > 0 && hasPaymentErrors) {
                        // Failure: Specific errors have been set, so we don't set a generic error.
                    }
                } else if (data.payments.length === 0) {
                    // Check if ANY payment is required for the step (if the array is completely empty)
                    newErrors.payments = 'At least one payment is required.';
                }
            } else {
                const fieldValue = data[field as keyof ExtendContractFormValues];
                if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                    newErrors[field as keyof FormErrors] = 'This field is required.';
                }
            }
        });

        const isValid = Object.keys(newErrors).length === 0;

        if (!isValid) {
            setError(newErrors as FormErrors); // Update form errors to display them
            const description = Object.values(newErrors).filter(Boolean).join('; ');
            toast.error(`Please fill in all required fields for the "${currentStepData.name}" step.`, {
                description: description || 'Cannot proceed until all mandatory information is provided.',
            });
        } else {
            clearErrors(); // Clear old errors on success
        }

        return isValid;
    };

    // Function to handle the three-step transition
    const handleSequentialMove = () => {
        if (currentTab === 1) {
            toast.info('Print dialog closed. Switching to rental receipt...');
            setIsActiveTab('invoice');
            setCurrentTab(2);
        }
    };
    console.log(currentTab);

    // Setup react-to-print
    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({
        contentRef,
        onAfterPrint: handleSequentialMove,
    });

    // handlePOSRentalSubmit
    const handleSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        console.log(data);
        put(route('rentals.status.extend-contract.update', rental?.id), {
            onSuccess: () => {
                setIsSubmissionComplete(true);
            },
            onError: (errors) => {
                toast.error('Submission failed. Please check the form for errors.', {
                    description: Object.values(errors).flat().join(' | '),
                    duration: 5000,
                });
            },
        });
    };
    // --- 5. Component Render ---
    return (
        <AppLayout breadcrumbs={updateRentalBreadcrumbs}>
            <Head title="Extension Processing" />
            <Sheet open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Create New Customer</SheetTitle>
                        <SheetDescription>Fill out the form to add a new customer to the system.</SheetDescription>
                    </SheetHeader>
                    <CreateCustomerSheet contactTypes={contactTypes} onSubmitSuccess={handleCustomerCreateSuccess} />
                </SheetContent>
            </Sheet>

            {/* Edit Customer Sheet */}
            <Sheet open={isEditCustomerSheetOpen} onOpenChange={setIsEditCustomerSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Edit Customer</SheetTitle>
                        <SheetDescription>Update the details for {selectedCustomerData?.full_name}.</SheetDescription>
                    </SheetHeader>
                    <EditCustomerSheet
                        selectedCustomer={selectedCustomerData}
                        contactTypes={contactTypes}
                        onSubmitSuccess={handleCustomerUpdateSuccess}
                    />
                </SheetContent>
            </Sheet>

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Progress Indicator Card (UI) */}
                <div className="w-full max-w-sm rounded-2xl p-2 text-gray-800 lg:fixed lg:top-4 lg:left-1/2 lg:z-50 lg:max-w-2xl lg:-translate-x-1/2 lg:border lg:border-white/30 lg:bg-white/20 lg:shadow-lg lg:backdrop-blur-lg dark:text-gray-100 lg:dark:border-gray-500/30 lg:dark:bg-gray-800/20">
                    <div className="flex w-full items-center justify-center">
                        {/* Container for both vertical and horizontal layouts */}
                        <div className="w-full">
                            {/* Vertical Layout for small screens */}
                            <div className="relative ml-4 lg:hidden">
                                {/* Vertical Line */}
                                <div className="absolute top-0 left-5 h-full w-1 -translate-x-1/2 transform bg-white/30 dark:bg-gray-700/30" />
                                {/* Progress Fill */}
                                <div
                                    className="absolute top-0 left-5 w-1 -translate-x-1/2 transform bg-yellow-500 transition-all duration-700 ease-out"
                                    style={{ height: progressWidth }}
                                />
                                <div className="relative z-10 flex flex-col space-y-8">
                                    {extendSteps.map((s) => (
                                        <div key={s.id} className="flex items-center">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-md transition-all duration-500 ease-in-out ${
                                                    s.id <= step
                                                        ? 'bg-yellow-500 text-white'
                                                        : 'bg-white/40 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200'
                                                }`}
                                            >
                                                {s.id < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                            </div>
                                            <span
                                                className={`ml-4 text-base font-medium transition-opacity duration-300 ${
                                                    s.id <= step ? 'opacity-100' : 'opacity-75'
                                                }`}
                                            >
                                                {s.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Horizontal Layout for large screens */}
                            <div className="relative hidden lg:block">
                                {/* Horizontal Line */}
                                <div className="absolute top-5 left-0 h-1 w-full -translate-y-1/2 transform bg-white/30 dark:bg-gray-700/30" />
                                {/* Progress Fill */}
                                <div
                                    className="absolute top-5 left-0 h-1 -translate-y-1/2 transform bg-yellow-500 transition-all duration-700 ease-out"
                                    style={{ width: progressWidth }}
                                />
                                <div className="relative z-10 flex justify-between">
                                    {extendSteps.map((s) => (
                                        <div key={s.id} className="flex flex-col items-center text-center">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-md transition-all duration-500 ease-in-out ${
                                                    s.id <= step
                                                        ? 'bg-yellow-500 text-white'
                                                        : 'bg-white/40 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200'
                                                }`}
                                            >
                                                {s.id < step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                            </div>
                                            <span
                                                className={`mt-2 w-20 text-base font-medium transition-opacity duration-300 ${
                                                    s.id <= step ? 'opacity-100' : 'opacity-75'
                                                }`}
                                            >
                                                {s.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${step === extendSteps.length ? 'w-full' : 'grid grid-cols-1 gap-4 md:grid-cols-2'}`}>
                    {/* DYNAMIC FORM SECTION RENDERING */}
                    {CurrentStepComponent && currentStepData && (
                        <FormSection title={currentStepData.name} description={`Please complete the details for the ${currentStepData.name} step.`}>
                            {/* 1. Vehicle Identification Header */}
                            {step === extendSteps.length ? (
                                ''
                            ) : (
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center">
                                            <BikeIcon className="mr-3 h-6 w-6 text-green-600" />
                                            {vehicle ? (
                                                <div>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        No-<span className="font-mono font-semibold">{vehicle.vehicle_no || 'NO-0000'}</span>{' '}
                                                        {vehicle.make || 'Unknown Make'} {vehicle.model || 'Unknown Model'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-xl font-bold text-gray-500">Select a Vehicle</p>
                                            )}
                                        </div>
                                        {vehicle && (
                                            <Badge variant="default" className={`bg-green-600 px-4 py-1.5 text-xs font-bold text-white shadow-md`}>
                                                {vehicle.current_status_name || 'Status Unknown'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                            <CurrentStepComponent
                                // Required for all steps
                                rental={rental}
                                data={data}
                                setData={setData}
                                formErrors={formErrors}
                                handleInputChange={handleInputChange}
                                // Step 1 specific props
                                selectedRow={rental}
                                selectedVehicleData={vehicle}
                                customers={customers}
                                selectedCustomerData={selectedCustomerData}
                                vehicleStatuses={vehicleStatuses}
                                depositTypes={depositTypes}
                                users={users}
                                processing={processing}
                                handleComboboxChange={handleComboboxChange}
                                // Step 3: Sales
                                chartOfAccounts={chartOfAccounts}
                                // Step 4: Confirm
                                lastSale={lastSale}
                                isActiveTab={isActiveTab}
                                setIsActiveTab={setIsActiveTab}
                                contentRef={contentRef}
                                reactToPrintFn={reactToPrintFn}
                                // etc
                                customerDialogOpen={customerDialogOpen}
                                setCustomerDialogOpen={setCustomerDialogOpen}
                                onCreateClick={onCreateClick}
                                clearErrors={clearErrors}
                            />
                        </FormSection>
                    )}

                    {step === extendSteps.length ? (
                        ''
                    ) : (
                        <CustomerDetailsCard
                            selectedCustomerData={selectedCustomerData}
                            data={data}
                            payments={data.payments}
                            selectedVehicleData={vehicle}
                            onUpdateClick={onUpdateClick} // Pass handler
                        />
                    )}
                </div>
            </div>
            {/* Controls for Demonstration */}
            <div className="fixed right-0 bottom-0 left-0 z-30 flex justify-center p-2">
                <div className="w-full items-center justify-center space-y-1 space-x-1 rounded-full p-2 drop-shadow-sm md:flex md:max-w-md">
                    <Button
                        variant="default"
                        onClick={prevStep}
                        disabled={step === 1 || isSubmissionComplete}
                        className="w-1/2 cursor-pointer rounded-full bg-gray-700 transition duration-150 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ArrowLeft />
                        Previous
                    </Button>

                    {step === extendSteps.length ? (
                        <div className="flex w-1/2 flex-col gap-1 md:flex-row">
                            <Button
                                type="button"
                                variant="default"
                                onClick={handleSubmit}
                                disabled={isSubmissionComplete || processing}
                                className="cursor-pointer rounded-full bg-yellow-600 font-semibold transition duration-150 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : isSubmissionComplete ? 'Saved' : 'Save'} <Save />
                            </Button>
                            <Button
                                variant="default"
                                type="button"
                                onClick={reactToPrintFn}
                                disabled={!isSubmissionComplete || processing}
                                className="cursor-pointer rounded-full bg-yellow-600 font-semibold transition duration-150 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Printer />
                            </Button>
                            {isActiveTab === 'invoice' && currentTab === 2 && (
                                <Button
                                    variant="default"
                                    type="button"
                                    onClick={() => router.get('/pos')}
                                    className="cursor-pointer rounded-full bg-green-600 font-semibold transition duration-150 hover:bg-green-500"
                                >
                                    Go to POS
                                    <ArrowRight />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="default"
                            onClick={nextStep}
                            disabled={step === extendSteps.length}
                            className="w-1/2 cursor-pointer rounded-full bg-yellow-600 font-semibold transition duration-150 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                            <ArrowRight />
                        </Button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

export default ExtendTransaction;
