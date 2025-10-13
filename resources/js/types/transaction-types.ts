// Add the Inertia import
import { InertiaFormProps } from '@inertiajs/react';

// Assuming these are imported from a global types file or are defined elsewhere
import DepositDetails from '@/components/rentals/new-rental-transactioins/deposit-details';
import NewRentalReviews from '@/components/rentals/new-rental-transactioins/new-rental-reviews';
import PaymentDetails from '@/components/rentals/new-rental-transactioins/payment-details';
import RelationalInformation from '@/components/rentals/new-rental-transactioins/relational-information';
import { BreadcrumbItem, Customers, Deposits, Vehicle } from '@/types';
import { CheckCircleIcon, LockIcon, MapPinIcon, UserIcon } from 'lucide-react';
import React from 'react'; // Needed for React.ReactNode

// --- Enhanced Deposit Type ---
/**
 * Extends the Deposits type, making 'id' optional/flexible and adding rental-specific flags.
 */
export interface EnhancedDeposit extends Omit<Deposits, 'id'> {
    id?: string | number; // Allows for temporary IDs like 'primary_0' before API submission
    is_primary?: boolean;
    registered_number?: string | null;
    expiry_date?: string | null; // Stays as string 'YYYY-MM-DD' or null/empty
}

// --- Initial Form Values Type ---
/**
 * Defines the complete structure of the form data for a new rental transaction.
 */
export type InitialFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    activeDeposits: EnhancedDeposit[];
    customer_id: number | null;
    status_id: number | null;
    user_id: number | null;
    actual_start_date: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    total_cost: string;
    notes: string;
};

// --- Form Errors Type ---
/**
 * Defines the structure for form validation errors, including nested errors for activeDeposits.
 */
export type FormErrors = Partial<
    Record<keyof Omit<InitialFormValues, 'activeDeposits'> | `activeDeposits.${number}.${keyof EnhancedDeposit}` | 'activeDeposits', string>
>;

// --- Set Data Function Type (THE FIX) ---
/**
 * Defines the complex type signature for the setData function returned by Inertia's useForm hook.
 */
export type SetDataFunction = InertiaFormProps<InitialFormValues>['setData'];
// Utility to format Date for form initialization
// This needs to be available where initialFormValues is defined.
const formatInitialDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

// --- Initial Form Values Object ---
export const initialFormValues: InitialFormValues = {
    customer_id: null,
    vehicle_id: '',
    status_id: null,
    actual_start_date: formatInitialDate(new Date()),
    end_date: '',
    period: 0,
    coming_date: '',
    total_cost: '',
    notes: '',
    user_id: null,
    activeDeposits: [
        {
            id: 'primary_0',
            deposit_type: '',
            deposit_value: '',
            registered_number: '',
            expiry_date: '',
            description: '',
            is_primary: true,
        },
    ],
};

// --- API Response Type ---
/**
 * The expected structure of the detailed customer data when fetched from the API.
 */
export interface DetailedCustomerResponse {
    customer: Customers; // Assuming 'Customers' type is the full, formatted customer object
}

// --- Page Props Type ---
export interface TransactionProcessingPageProps {
    vehicle: Vehicle | undefined;
    vehicleStatuses: { id: number; name: string }[];
    customers: { id: number; name: string }[];
    users: { id: number; name: string }[];
}

// --- Navigation/Step Types ---
interface Step {
    id: number;
    name: string;
    icon: React.ElementType; // Use React.ElementType for component types
    component: React.ComponentType<any>; // Component to render for the step
    fields: string[];
}

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rental Transaction Processing',
        href: 'rentals/new-transaction/{vehicle}',
    },
];

export const steps: Step[] = [
    { id: 1, name: 'Relational Information', icon: UserIcon, fields: ['name', 'email'], component: RelationalInformation },
    { id: 2, name: 'Deposit', icon: MapPinIcon, fields: ['street', 'city'], component: DepositDetails },
    { id: 3, name: 'Payment', icon: LockIcon, fields: ['username', 'password'], component: PaymentDetails },
    { id: 4, name: 'Confirm', icon: CheckCircleIcon, fields: [], component: NewRentalReviews },
];

export interface LookupItem {
    id: number;
    name: string;
    // Add other properties if they exist on the items
    [key: string]: any;
}
