// Add the Inertia import
import { InertiaFormProps } from '@inertiajs/react';

// Assuming these are imported from a global types file or are defined elsewhere
import ChangeVehicleInformation from '@/components/rentals/rental-transactioins/change-vehicle/change-vehicle-information';
import { ExtendInformation } from '@/components/rentals/rental-transactioins/extension/extend-information';
import ExtendRentalReviews from '@/components/rentals/rental-transactioins/extension/extend-rental-reviews';
import DepositDetails from '@/components/rentals/rental-transactioins/new/deposit-details';
import NewRentalReviews from '@/components/rentals/rental-transactioins/new/new-rental-reviews';
import RelationalInformation from '@/components/rentals/rental-transactioins/new/relational-information';
import PaymentDetails from '@/components/rentals/rental-transactioins/payment-details';
import { BreadcrumbItem, ChartOfAccountTypes, Customers, Deposits, SaleTransaction, Vehicle } from '@/types';
import { format } from 'date-fns';
import { CheckCircleIcon, CircleDollarSign, IdCard, UserIcon } from 'lucide-react';
import React, { Ref, useMemo } from 'react'; // Needed for React.ReactNode

// =========================================================
// --- 1. CORE & PRIMITIVE TYPES ---
// =========================================================

export type PaymentType = 'cash' | 'bank' | 'credit';

// =========================================================
// --- 2. DATA MODEL INTERFACES (Building Blocks) ---
// =========================================================

/**
 * Extends the Deposits type, making 'id' optional/flexible and adding rental-specific flags.
 */
export interface EnhancedDeposit extends Omit<Deposits, 'id'> {
    id?: string | number; // Allows for temporary IDs like 'primary_0' before API submission
    is_primary?: boolean;
    visa_type?: string | null;
    expiry_date?: string | null; // Stays as string 'YYYY-MM-DD' or null/empty
}

export interface SaleItem {
    id?: string | number;
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

// =========================================================
// --- 3. FORM STRUCTURE TYPES (Main State) ---
// =========================================================

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
    start_date?: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    total_cost: string;
    helmet_amount: number | string;
    occupations: string;
    how_know_shop: string;
    notes: string;
};

export type InitialExtendFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    payments: EnhancedPayment[];
    rental_id: number | null;
    incharger_id: number | null;
    start_date: string;
    end_date: string;
    coming_date: string;
    period: number | string;
    notes: string;
};

export interface ExtendContractFormValues {
    rental_id: number | null;
    start_date: string;
    end_date: string;
    period: number | string;
    coming_date: string;
    notes: string;
    incharger_id: number | null;
    payments: SaleItem[];
    [key: string]: any;
}

export type InitialChangeVehicleFormValues = Omit<Customers, 'id' | 'created_at' | 'updated_at' | 'primary_deposit_type' | 'primary_deposit'> & {
    payments: EnhancedPayment[];
    rental_id: number | null;
    incharger_id: number | null;

    p_vehicle_status_id: string;
    n_vehicle_status_id: string;
    n_vehicle_id: string;

    notes: string;
};

export interface ChangeVehicleFormValues {
    rental_id: number | null;
    p_vehicle_status_id: number | null;
    n_vehicle_status_id: number | null;
    n_vehicle_id: number | null;
    notes: string;
    incharger_id: number | null;
    payments: SaleItem[];
    [key: string]: any;
}

// =========================================================
// --- 4. ERROR & UTILITY TYPES ---
// =========================================================

/**
 * Defines the structure for form validation errors, using a flattened dot-notation for nested arrays.
 */
export type FormErrors = Partial<
    Record<
        | keyof Omit<InitialFormValues, 'activeDeposits' | 'payments'> // Top level fields (e.g., end_date)
        | 'activeDeposits' // Array level error
        | 'payments' // Array level error
        | `activeDeposits.${number}.${keyof EnhancedDeposit}` // Nested deposit fields (e.g., activeDeposits.0.deposit_value)
        | `payments.${number}.${keyof EnhancedPayment}`, // Nested payment fields (e.g., payments.0.amount)
        string
    >
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

/**
 * Defines the complex type signature for the setData function returned by Inertia's useForm hook.
 */
export type SetDataFunction = InertiaFormProps<InitialFormValues>['setData'];

// =========================================================
// --- 5. PAGE PROPS & NAVIGATION TYPES ---
// =========================================================

/**
 * The expected structure of the detailed customer data when fetched from the API.
 */
export interface DetailedCustomerResponse {
    customer: Customers; // Assuming 'Customers' type is the full, formatted customer object
}

export interface TransactionProcessingPageProps {
    vehicle: Vehicle | undefined;
    vehicleStatuses: { id: number; name: string }[];
    customers: { id: number; name: string }[];
    users: { id: number; name: string }[];
    depositTypes: { id: number; name: string }[];
    chartOfAccounts: ChartOfAccountTypes[];
}

interface Step {
    id: number;
    name: string;
    icon: React.ElementType; // Use React.ElementType for component types
    component: React.ComponentType<any>; // Component to render for the step
    fields: string[];
}

export interface LookupItem {
    id: number;
    name: string;
    // Add other properties if they exist on the items
    [key: string]: any;
}

// =========================================================
// --- 6. CONSTANTS, INITIAL VALUES & HOOKS ---
// =========================================================

/**
 * Utility to format Date for form initialization
 */
export const formatInitialDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Initial values for the new rental form state.
 */
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

export const initialExtendFormValues: ExtendContractFormValues = {
    rental_id: null,
    customer_id: null,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    period: 0,
    coming_date: '',
    notes: '',
    incharger_id: null,
    payments: [
        {
            id: `payment-${Date.now()}`,
            description: 'Contract Extension Payment',
            amount: '',
            credit_account_id: '',
            payment_type: 'cash',
            debit_target_account_id: '',
        },
    ],
};

export const initialChangeVehicleFormValues: ChangeVehicleFormValues = {
    rental_id: null,
    customer_id: null,
    p_vehicle_status_id: null,
    n_vehicle_status_id: null,
    n_vehicle_id: null,
    notes: '',
    incharger_id: null,
    payments: [
        {
            id: `payment-${Date.now()}`,
            description: 'Change Vehicle Payment',
            amount: '',
            credit_account_id: '',
            payment_type: 'cash',
            debit_target_account_id: '',
        },
    ],
};

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rental Transaction Processing',
        href: 'rentals/new-transaction/{vehicle}',
    },
];

export const updateRentalBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Update Contract',
        href: 'rentals/extend-transaction/{vehicle}',
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

export const extendSteps: Step[] = [
    {
        id: 1,
        name: 'Rental',
        icon: UserIcon,
        fields: ['start_date', 'end_date', 'period', 'payments', 'incharger_id'],
        component: ExtendInformation,
    },
    { id: 2, name: 'Confirm', icon: CheckCircleIcon, fields: [], component: ExtendRentalReviews },
];

export const changeVehicleSteps: Step[] = [
    {
        id: 1,
        name: 'Rental',
        icon: UserIcon,
        fields: ['p_vehicle_status_id', 'n_vehicle_id', 'n_vehicle_status_id', 'incharger_id'],
        component: ChangeVehicleInformation,
    },
    { id: 2, name: 'Confirm', icon: CheckCircleIcon, fields: [], component: ExtendRentalReviews },
];

/**
 * Hook to safely find and return the name from a collection based on an ID.
 */
export const useLookupName = <T extends LookupItem>(collection: T[] | undefined, lookupId: number | string | null | undefined): string => {
    return useMemo(() => {
        // 1. Validate collection and ID
        if (!Array.isArray(collection) || lookupId === undefined || lookupId === null) {
            return '';
        }

        // 2. Safely convert ID
        const numericId = Number(lookupId);
        if (isNaN(numericId)) {
            return '';
        }

        // 3. Find the item and return the name
        const item = collection.find((c) => c.id === numericId);
        return item?.name ?? '';
    }, [collection, lookupId]);
};

export const useAccountHelpers = ({ chartOfAccounts }: { chartOfAccounts: ChartOfAccountTypes[] }) => {
    const incomeAccounts = useMemo(() => chartOfAccounts?.filter((acc) => acc.type === 'Revenue'), [chartOfAccounts]);
    const specificBankAccounts = useMemo(
        () => chartOfAccounts?.filter((acc) => acc.type === 'Asset' && acc.name.includes('Bank')),
        [chartOfAccounts],
    );

    const getAccountName = (accountId: string, accounts: ChartOfAccountTypes[]) => {
        const account = accounts.find((acc) => String(acc.id) === accountId);
        return account ? `${account.name} (${account.type})` : 'Select account';
    };

    return { incomeAccounts, specificBankAccounts, getAccountName };
};

// Define a new type that combines all the necessary data
export interface FullRentalType extends InitialFormValues {
    customer: Customers | null;
    vehicle: Vehicle | undefined;
}

// Define the shape of the props
export interface RentalReveiwProps {
    // State/Data
    rental: FullRentalType;
    data: InitialFormValues;
    formErrors: FormErrors;
    selectedCustomerData: Customers | null;
    selectedVehicleData: Vehicle | undefined;
    customers: { id: number; name: string }[];
    vehicleStatuses: { id: number; name: string }[];
    users: { id: number; name: string }[];
    lastSale: SaleTransaction | undefined;
    processing: boolean;
    contentRef: Ref<HTMLDivElement> | undefined;
    isActiveTab: string | undefined;
    setIsActiveTab: ((value: string) => void) | undefined;
    chartOfAccounts: ChartOfAccountTypes[];

    // Handlers
    setData: InertiaFormProps<InitialFormValues>['setData'];
    handleComboboxChange: (field: keyof InitialFormValues, value: string, id: number | null) => void;

    // UI State & Handlers
    customerDialogOpen: boolean;
    setCustomerDialogOpen: (open: boolean) => void;
    setOpen: (open: boolean) => void; // Dummy/external dialog control
    onCreateClick: () => void; // Handler for creating new customer
}
