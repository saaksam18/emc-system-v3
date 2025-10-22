// Add the Inertia import
import { InertiaFormProps } from '@inertiajs/react';

// Assuming these are imported from a global types file or are defined elsewhere
import DepositDetails from '@/components/rentals/new-rental-transactioins/deposit-details';
import NewRentalReviews from '@/components/rentals/new-rental-transactioins/new-rental-reviews';
import PaymentDetails from '@/components/rentals/new-rental-transactioins/payment-details';
import RelationalInformation from '@/components/rentals/new-rental-transactioins/relational-information';
import { BreadcrumbItem, ChartOfAccountTypes, Customers, Deposits, Vehicle } from '@/types';
import { CheckCircleIcon, CircleDollarSign, IdCard, UserIcon } from 'lucide-react';
import React from 'react'; // Needed for React.ReactNode

// --- Enhanced Deposit Type ---
/**
 * Extends the Deposits type, making 'id' optional/flexible and adding rental-specific flags.
 */
export interface EnhancedDeposit extends Omit<Deposits, 'id'> {
    id?: string | number; // Allows for temporary IDs like 'primary_0' before API submission
    is_primary?: boolean;
    visa_type?: string | null;
    expiry_date?: string | null; // Stays as string 'YYYY-MM-DD' or null/empty
}

type PaymentType = 'cash' | 'bank' | 'credit';

export interface SaleFormData {
    sale_date: string;
    customer_name: string;
    item_description: string;
    memo_ref_no: string;
    amount: string;
    payment_type: PaymentType;
    credit_account_id: string;
    debit_target_account_id: string;
}

interface SaleItem {
    description: string;
    amount: string;
    credit_account_id: string;
    credit_account_name?: string;
    payment_type: PaymentType;
    debit_target_account_id: string;
}

export interface EnhancedPayment extends Omit<SaleItem, 'id'> {
    id?: string | number;
}

// --- Initial Form Values Type ---
/**
 * Defines the complete structure of the form data for a new rental transaction.
 */
export type InitialFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    activeDeposits: EnhancedDeposit[];
    payments: EnhancedPayment[];
    customer_id: number | null;
    status_id: number | null;
    incharger_id: number | null;
    actual_start_date: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    total_cost: string;
    helmet_amount: number | string;
    occupations: string;
    how_know_shop: string;
    notes: string;
};

// --- Form Errors Type ---
/**
 * Defines the structure for form validation errors, including nested errors for activeDeposits.
 */
export type FormErrors = Partial<
    Record<keyof Omit<InitialFormValues, 'activeDeposits'> | `activeDeposits.${number}.${keyof EnhancedDeposit}` | 'activeDeposits', string>
> & {
    rental_amount?: string;
    rental_credit_account_id?: string;
    rental_debit_target_account_id?: string;
    helmet_amount?: string;
    helmet_credit_account_id?: string;
    helmet_debit_target_account_id?: string;
    deposit_amount?: string;
    deposit_credit_account_id?: string;
    deposit_debit_target_account_id?: string;
};

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
    helmet_amount: 1,
    occupations: '',
    how_know_shop: '',
    notes: '',
    incharger_id: null,
    activeDeposits: [
        {
            id: 'primary_0',
            deposit_type: '',
            deposit_value: '',
            visa_type: '',
            expiry_date: '',
            description: '',
            is_primary: true,
        },
    ],
    payments: [
        {
            id: 'initial_payment_0',
            description: '',
            amount: '',
            credit_account_id: '',
            payment_type: 'cash',
            debit_target_account_id: '',
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
    depositTypes: { id: number; name: string }[];
    chartOfAccounts: ChartOfAccountTypes[];
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
    {
        id: 1,
        name: 'Rental',
        icon: UserIcon,
        fields: ['customer_id', 'status_id', 'actual_start_date', 'end_date', 'period', 'helmet_amount', 'incharger_id'],
        component: RelationalInformation,
    },
    { id: 2, name: 'Deposit', icon: IdCard, fields: ['activeDeposits'], component: DepositDetails },
    { id: 3, name: 'Payment', icon: CircleDollarSign, fields: ['payments'], component: PaymentDetails },
    { id: 4, name: 'Confirm', icon: CheckCircleIcon, fields: [], component: NewRentalReviews },
];

export interface LookupItem {
    id: number;
    name: string;
    // Add other properties if they exist on the items
    [key: string]: any;
}
