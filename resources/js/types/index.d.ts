import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    id?: number;
    title: string;
    href: string;
    target?: string;
    icon?: LucideIcon | null;
    prefetch?: boolean;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Role {
    id: number;
    name: string;
    guard_name: string;
    inputer: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Permission {
    id: number;
    name: string;
    guard_name: string;
    created_at?: string;
    updated_at?: string;
}

export interface Vehicle {
    id?: number | string; // Added ID for the key prop
    vehicle_no: string;
    make: string;
    model: string;
    year: string;
    license_plate: string;
    vin: string;
    color: string;
    engine_cc: string;
    vehicle_class: any;
    compensation_price: string;
    purchase_price: string;
    daily_rental_price: string;
    weekly_rental_price: string;
    monthly_rental_price: string;
    current_status_id: any;
    current_location: string;
    notes: string;
    user_id?: string;
    [key: string]: any;
}

export interface VehicleCountByClass {
    class_id: number;
    rentable_count: number;
    class_name: string;
}

export interface VehicleCountByModel {
    model_id: number;
    rentable_count: number;
    model_name: string;
}

export interface VehicleClass {
    id?: number;
    name: string;
    description: string;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

export interface VehicleMakerType {
    id: number;
    name: string;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
}

export interface VehicleModelType {
    maker_id?: any;
    id?: number;
    name: string;
    maker_name?: string;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

export interface VehicleStatusType {
    id: number;
    status_name: string;
    description?: string;
    is_rentable?: boolean;
    is_rentable_yn?: boolean;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
}

// Customers
export interface Customers {
    id?: number;
    first_name: string | undefined;
    last_name: string | undefined;
    date_of_birth: string | undefined;
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    commune?: string | undefined;
    district?: string | undefined;
    city?: string | undefined;
    notes?: string | null | undefined;
    user_id?: string | null | undefined;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

export interface Contacts {
    id: number | any;
    contact_type: string;
    contact_value: string;
    is_primary?: any;
    description?: string;
    is_active?: any;
    start_date?: any;
    end_date?: any;
    notes?: string | null | undefined;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

export interface ContactTypes {
    id?: number | any;
    name?: any;
    description?: string;
    is_active?: any;
    start_date?: any;
    end_date?: any;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

export interface Deposits {
    id: number;
    type: string;
    registered_number: string;
    expiry_date: any;
    is_primary?: any;
    description?: string;
    is_active?: any;
    start_date?: any;
    end_date?: any;
    notes?: string | null | undefined;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

// Rentals
export interface RentalsType {
    id?: number;
    vehicle_id: any;
    vehicle_no: string;
    customer_id: any;
    customer_name: string;
    start_date?: any;
    end_date?: any;
    period?: any;
    coming_date?: any;
    actual_start_date?: any;
    actual_return_date?: any;
    total_cost?: string;
    is_active?: boolean;
    status_id: any;
    status_name: string;
    notes?: string | null | undefined;
    incharger_id?: string;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
    version_timestamp?: any;
    is_latest_version?: boolean;
    [key: string]: any;
}
export interface DepositTypes {
    id?: number;
    name: string;
    is_active: boolean;
    description?: string | null | undefined;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}

// Accounting
export interface ChartOfAccountTypes {
    id: number;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    created_at?: string;
    updated_at?: string;
}
export interface Transaction {
    id: number;
    transaction_no: string;
    transaction_date: string;
    item_description: string;
    memo_ref_no?: string;
    debit_account: ChartOfAccountTypes;
    credit_account: ChartOfAccountTypes;
    debit_account_id?: ChartOfAccountTypes;
    credit_account_id: ChartOfAccountTypes;
    amount: number;
    user_name?: string;
    created_at?: any;
    updated_at?: any;
}
export interface SaleTransaction {
    id: number;
    sale_no: string;
    sale_date: string;
    customer_name: string;
    item_description: string;
    memo_ref_no?: string;
    amount: number;
    payment_type: 'cash' | 'bank' | 'credit' | 'Cash' | 'Bank Transfer' | 'On Credit';
    gl_debit_account_name?: string;
    gl_credit_account_name?: string;
}

export interface Vendor {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    user_name?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ExpenseTransaction {
    id: number;
    expense_no: string;
    expense_date: string;
    vendor_name: string;
    item_description: string;
    memo_ref_no?: string;
    amount: number;
    payment_type: 'cash' | 'bank' | 'Cash' | 'Bank Transfer';
    gl_debit_account_name?: string;
    gl_credit_account_name?: string;
}

export interface ExpenseEntryProps {
    expenses: ExpenseTransaction[];
    chartOfAccounts: ChartOfAccountTypes[];
    vendors: Vendor[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
}

// NEW: Trial Balance Account Interface
export interface TrialBalanceAccount {
    id: number;
    name: string;
    type: string; // e.g., 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    debit_balance: number; // Balance if it's a debit
    credit_balance: number; // Balance if it's a credit
}

// NEW: Trial Balance Page Props Interface
export interface TrialBalanceProps {
    trialBalance: TrialBalanceAccount[];
    asOfDate?: string; // The date for which the trial balance was generated
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}
