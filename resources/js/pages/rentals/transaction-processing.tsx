import { Create as CreateCustomerSheet } from '@/components/customers/sheets/create';
import { Edit as EditCustomerSheet } from '@/components/customers/sheets/edit'; // New import
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { ContactTypes, Customers } from '@/types'; // Import necessary types
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BikeIcon, Check, Printer, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// IMPORTING TYPES AND DATA
import {
    DetailedCustomerResponse,
    FormErrors,
    InitialFormValues,
    TransactionProcessingPageProps as PageProps,
    breadcrumbs,
    initialFormValues,
    steps,
} from '@/types/transaction-types';

// Reusable UI Component
import { FormSection } from '@/components/form/FormSection';
import CustomerDetailsCard from '@/components/rentals/new-rental-transactioins/customer-details-card';
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
}
// --- End of Type Definitions ---

function TransactionProcessing({ vehicle, customers, vehicleStatuses, depositTypes, users, chartOfAccounts, contactTypes }: ExtendedPageProps) {
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

    // --- 1. State Management and Form Setup ---
    const { data, setData, post, processing, errors, clearErrors, setError } = useForm<InitialFormValues>({
        ...initialFormValues,
        vehicle_id: vehicle?.id || '',
    });

    const formErrors = errors as FormErrors;
    // Customer
    const [selectedCustomerData, setSelectedCustomerData] = useState<Customers | null>(null);
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const [isEditCustomerSheetOpen, setIsEditCustomerSheetOpen] = useState(false);

    const [step, setStep] = useState(1);
    // Conform step tabs
    const [isActiveTab, setIsActiveTab] = useState('front');
    const [currentTab, setCurrentTab] = useState(1);

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

    // --- Dynamic Payments Logic Integration ---
    // Removed useDynamicPayments hook and its synchronization useEffect.
    // Payments are now managed manually within PaymentDetails component.

    const incomeAccounts = useMemo(() => (chartOfAccounts || []).filter((account) => account.parent_account_id === 4), [chartOfAccounts]);
    const cashInHandAccounts = useMemo(() => (chartOfAccounts || []).filter((account) => account.parent_account_id === 1), [chartOfAccounts]);

    useEffect(() => {
        if (vehicle && data.vehicle_id !== vehicle.id) {
            setData('vehicle_id', vehicle.id);
        }
    }, [vehicle, data.vehicle_id, setData]);

    /* --- 3. Step/Progress Logic --- */
    const progressWidth = useMemo(() => {
        const totalSegments = steps.length - 1;
        const completedSegments = Math.max(0, step - 1);
        if (totalSegments === 0) return '0%';
        return `${(completedSegments / totalSegments) * 100}%`;
    }, [step]);

    const nextStep = () => {
        if (validateCurrentStep()) {
            setStep((prev) => Math.min(steps.length, prev + 1));
        }
    };
    const prevStep = () => {
        if (step === steps.length) {
            // If on the confirm step, reset the tabs
            setIsActiveTab('front');
            setCurrentTab(1);
        }
        setStep((prev) => Math.max(1, prev - 1));
    };
    /* --- End Step/Progress Logic --- */

    /* --- Side Effects & Handlers --- */
    // Function to fetch customer data
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
    const handleComboboxChange = (field: keyof InitialFormValues, value: string, id: number | null = null) => {
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

        const fieldName = name as keyof InitialFormValues;
        setData(fieldName, finalValue as any);
        clearErrors(fieldName as keyof FormErrors);
    };
    /* --- End Side Effects & Handlers --- */

    // Get the component for the current step
    const CurrentStepComponent = steps.find((s) => s.id === step)?.component;
    const currentStepData = steps.find((s) => s.id === step);

    // --- Validation ---
    const validateCurrentStep = (): boolean => {
        const currentStepData = steps.find((s) => s.id === step);
        if (!currentStepData) return true;

        const newErrors: Partial<FormErrors> = {};

        // --- General Field Validation ---
        currentStepData.fields.forEach((field) => {
            if (field.startsWith('activeDeposits')) {
                const primaryDeposit = data.activeDeposits.find((d) => d.is_primary);
                if (!primaryDeposit) {
                    newErrors.activeDeposits = 'A primary deposit is required.';
                } else {
                    if (!primaryDeposit.deposit_type && !primaryDeposit.deposit_value) {
                        newErrors.activeDeposits = 'Primary deposit type and value are required.';
                    } else if (!primaryDeposit.deposit_type) {
                        newErrors.activeDeposits = 'Primary deposit type is required.';
                    } else if (!primaryDeposit.deposit_value) {
                        newErrors.activeDeposits = 'Primary deposit value is required.';
                    }
                }
            } else if (field === 'payments') {
                // Exclude auto-generated payments from validation
                const paymentsToValidate = data.payments.filter(
                    (p) => p.id !== 'auto_helmet_fee' && !p.id.toString().startsWith('temp_payment_deposit_'),
                );

                if (paymentsToValidate.length > 0) {
                    const invalidPayments = paymentsToValidate.filter(
                        (p) => !p.amount || !p.credit_account_id || !p.debit_target_account_id, // Note: description is now optional
                    );
                    if (invalidPayments.length > 0) {
                        const invalidIds = invalidPayments.map((p) => p.id).join(', ');
                        newErrors.payments = `Please fill in Amount and Accounts for manual payments. Invalid item IDs: ${invalidIds}`;
                    }
                } else if (data.payments.length === 0) {
                    // Only error if there are no payments at all.
                    newErrors.payments = 'At least one payment is required.';
                }
            } else {
                const fieldValue = data[field as keyof InitialFormValues];
                if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                    newErrors[field as keyof FormErrors] = 'This field is required.';
                }
            }
        });

        const isValid = Object.keys(newErrors).length === 0;

        if (!isValid) {
            setError(newErrors as any); // Update form errors to display them
            const description = Object.values(newErrors).filter(Boolean).join('; ');
            toast.error(`Please fill in all required fields for the "${currentStepData.name}" step.`, {
                description: description || 'Cannot proceed until all mandatory information is provided.',
            });
        } else {
            clearErrors(); // Clear old errors on success
        }

        return isValid;
    };

    const contentRef = useRef<HTMLDivElement>(null);

    // Function to handle the three-step transition
    const handleSequentialMove = () => {
        if (currentTab === 1) {
            toast.info('Print dialog closed. Switching to back of the contract...');
            setIsActiveTab('back');
            setCurrentTab(2);
        } else if (currentTab === 2) {
            toast.info('Print dialog closed. Switching to rental receipt...');
            setIsActiveTab('invoice');
            setCurrentTab(3);
        }
    };
    // Setup react-to-print
    const reactToPrintFn = useReactToPrint({
        contentRef,
        onAfterPrint: handleSequentialMove,
    });

    // handlePOSRentalSubmit
    const handlePOSRentalSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        post(route('rentals.register.store'), {
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Processing" />
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
                                    {steps.map((s) => (
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
                                    {steps.map((s) => (
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

                <div className={`${step === steps.length ? 'w-full' : 'grid grid-cols-1 gap-4 md:grid-cols-2'}`}>
                    {/* DYNAMIC FORM SECTION RENDERING */}
                    {CurrentStepComponent && currentStepData && (
                        <FormSection title={currentStepData.name} description={`Please complete the details for the ${currentStepData.name} step.`}>
                            {/* 1. Vehicle Identification Header */}
                            {step === steps.length ? (
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
                                data={data}
                                setData={setData}
                                formErrors={formErrors}
                                handleInputChange={handleInputChange}
                                // Step 1 specific props
                                selectedCustomerData={selectedCustomerData}
                                selectedVehicleData={vehicle}
                                customers={customers}
                                vehicleStatuses={vehicleStatuses}
                                depositTypes={depositTypes}
                                users={users}
                                processing={processing}
                                handleComboboxChange={handleComboboxChange}
                                // Step 3: Sales
                                chartOfAccounts={chartOfAccounts}
                                // payments={data.payments} // Removed redundant prop
                                // Step 4: Confirm
                                isActiveTab={isActiveTab}
                                setIsActiveTab={setIsActiveTab}
                                contentRef={contentRef}
                                reactToPrintFn={reactToPrintFn}
                                // etc
                                customerDialogOpen={customerDialogOpen}
                                setCustomerDialogOpen={setCustomerDialogOpen}
                                onCreateClick={onCreateClick}
                                // form submitting
                                handleSubmit={handlePOSRentalSubmit}
                                clearErrors={clearErrors}
                                errors={formErrors}
                            />
                        </FormSection>
                    )}

                    {step === steps.length ? (
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

                    {step === steps.length ? (
                        <div className="flex w-1/2 flex-col gap-1 md:flex-row">
                            <Button
                                type="button"
                                variant="default"
                                onClick={handlePOSRentalSubmit}
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
                        </div>
                    ) : (
                        <Button
                            variant="default"
                            onClick={nextStep}
                            disabled={step === steps.length}
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

export default TransactionProcessing;
