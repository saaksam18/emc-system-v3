import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Customers } from '@/types'; // Import necessary types
import { Head, useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Dummy function for demonstration
const setOpen = (open: boolean) => console.log('Dialog open:', open);
const onCreateClick = () => console.log('Create new customer clicked');

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

function TransactionProcessing({ vehicle, customers, vehicleStatuses, users }: PageProps) {
    // --- 1. State Management and Form Setup ---
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<InitialFormValues>({
        ...initialFormValues,
        vehicle_id: vehicle?.id || '',
    });

    useEffect(() => {
        // Only run if a vehicle object exists
        if (vehicle) {
            // Only update if the form data is different from the vehicle data
            // This handles both the initial load *after* render and subsequent vehicle changes.

            if (data.vehicle_id !== vehicle.id) {
                setData('vehicle_id', vehicle.id);
            }
        }
    }, [vehicle, setData, data.vehicle_no, data.vehicle_id]);

    const formErrors = errors as FormErrors;
    const [selectedCustomerData, setSelectedCustomerData] = useState<Customers | null>(null);
    const [step, setStep] = useState(1);
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

    // --- 3. Step/Progress Logic ---
    const progressWidth = useMemo(() => {
        const totalSegments = steps.length - 1;
        const completedSegments = Math.max(0, step - 1);
        if (totalSegments === 0) return '0%';
        return `${(completedSegments / totalSegments) * 100}%`;
    }, [step, steps.length]);

    const nextStep = () => setStep((prev) => Math.min(steps.length, prev + 1));
    const prevStep = () => setStep((prev) => Math.max(1, prev - 1));

    // Horizontal and Vertical Positioning Constants for UI (Keep near the UI logic)
    const LINE_OFFSET = '6.25rem';
    const TRACK_WIDTH = 'calc(100% - 9rem)';
    const LINE_TOP = '3.25rem';

    // --- 4. Side Effects & Handlers ---

    // Function to fetch customer data
    const fetchCustomerData = async (customerId: number) => {
        if (!customerId) {
            setSelectedCustomerData(null);
            return;
        }

        setSelectedCustomerData(null);
        const loadingToastId = toast.loading(`Fetching details for Customer ID: ${customerId}...`);

        try {
            // NOTE: In a real Inertia app, you should use Inertia's data fetching/props,
            // but the original code uses a direct API call, so we keep that structure.
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
        // FIX: Cast 'field' to string before using .includes()
        const fieldString = field as string;

        // Check if the field name ends with '_id' to determine if we should store the ID (number)
        const finalValue = fieldString.includes('_id') ? id : value;

        // Use functional update for setData to ensure correct state based on previous values
        setData((prev) => {
            const newState = { ...prev, [field]: finalValue };
            return newState;
        });

        if (field === 'customer_id') {
            // Use the ID to fetch data
            if (id !== null) {
                fetchCustomerData(id);
            } else {
                setSelectedCustomerData(null);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // 1. Destructure for clarity and necessary properties
        const { name, value } = e.target;
        let finalValue: string | boolean = value;

        // 2. Type Guard for 'checked' property (since HTMLTextAreaElement doesn't have it)
        if (e.target instanceof HTMLInputElement) {
            if (e.target.type === 'checkbox') {
                finalValue = e.target.checked;
            }
        }

        // 3. FIX: Type assertion to tell TypeScript that the 'name' string is a valid key.
        // We assert 'name' as keyof InitialFormValues.
        const fieldName = name as keyof InitialFormValues;

        setData(fieldName, finalValue as any);

        clearErrors(fieldName as keyof FormErrors);
    };

    // Get the component for the current step
    const CurrentStepComponent = steps.find((s) => s.id === step)?.component;
    const currentStepData = steps.find((s) => s.id === step);

    // --- 6. Real-time Data Display (New Section) ---
    const formDataDisplay = (
        <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold text-gray-700">📋 Current Form Data (Real-time)</h3>
            <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800 ring-1 ring-gray-200">{JSON.stringify(data, null, 2)}</pre>
        </div>
    );

    // --- 5. Component Render ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Processing" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Progress Indicator Card (UI) */}
                <Card className="w-full max-w-full p-0">
                    <CardContent>
                        {/* Progress Indicator Container (UI) */}
                        {/* ... Progress Bar and Step rendering logic here (moved to UI section) ... */}

                        {/* 0. Progress Line Wrapper: This element defines the exact position and width of the track */}
                        <div className="relative px-8 py-8">
                            <div
                                className="absolute h-1" // h-1 is the height of the line itself
                                style={{ left: LINE_OFFSET, width: TRACK_WIDTH, top: LINE_TOP }}
                            >
                                {/* 1. Progress Bar Track (Gray Line) */}
                                <div className="h-full w-full rounded-full bg-gray-200" />

                                {/* 2. Progress Fill (Yellow/Green Line) */}
                                <div
                                    className="absolute top-0 h-full rounded-full bg-yellow-500 transition-all duration-700 ease-out"
                                    style={{ width: progressWidth }}
                                />
                            </div>

                            {/* 3. Steps (Overlaid on the line) */}
                            <div className="relative z-10 flex justify-between">
                                {steps.map((s) => (
                                    <div key={s.id} className="flex flex-col items-center text-center">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-md transition-all duration-500 ease-in-out ${
                                                s.id === step
                                                    ? 'bg-yellow-500 text-white ring-4 ring-yellow-300' // Current step
                                                    : s.id < step
                                                      ? 'bg-green-500 text-white ring-4 ring-green-300' // Completed step
                                                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300' // Pending step
                                            } `}
                                        >
                                            {s.id < step ? <Check className="h-5 w-5 animate-pulse" /> : <s.icon className="h-5 w-5" />}
                                        </div>
                                        <span
                                            className={`mt-2 block text-sm font-medium transition-colors duration-300 ${s.id === step ? 'text-yellow-600' : 'text-gray-500'}`}
                                        >
                                            {s.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* DYNAMIC FORM SECTION RENDERING */}
                {CurrentStepComponent && currentStepData && (
                    <FormSection title={currentStepData.name} description={`Please complete the details for the ${currentStepData.name} step.`}>
                        <CurrentStepComponent
                            // Required for all steps
                            data={data}
                            setData={setData}
                            formErrors={formErrors}
                            handleInputChange={handleInputChange} // Assuming all steps use this
                            // Step 1 specific props (passed to all steps, but only used by step 1)
                            selectedCustomerData={selectedCustomerData}
                            selectedVehicleData={vehicle}
                            customers={customers}
                            vehicleStatuses={vehicleStatuses}
                            users={users}
                            processing={processing}
                            handleComboboxChange={handleComboboxChange}
                            customerDialogOpen={customerDialogOpen}
                            setCustomerDialogOpen={setCustomerDialogOpen}
                            setOpen={setOpen}
                            onCreateClick={onCreateClick}
                            errors={formErrors}
                            // Pass other necessary props like handlers, customer data, etc.
                        />
                    </FormSection>
                )}

                {/* Controls for Demonstration */}
                <div className="mt-8 flex space-x-4">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className="rounded-lg bg-gray-700 px-6 py-3 text-white shadow-md transition duration-150 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={nextStep}
                        disabled={step === steps.length}
                        className="rounded-lg bg-yellow-600 px-6 py-3 font-semibold text-white shadow-md transition duration-150 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {step === steps.length ? 'Finished!' : 'Next Step'}
                    </button>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                    Current Step: <span className="font-bold text-yellow-600">{step}</span>
                </p>
                {/* 🛑 INSERT THE NEW REAL-TIME DATA DISPLAY HERE 🛑 */}
                {formDataDisplay}
            </div>
        </AppLayout>
    );
}

export default TransactionProcessing;
