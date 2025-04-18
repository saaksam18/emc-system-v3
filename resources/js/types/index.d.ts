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
    id: number;
    name: string;
    user_name: string;
    created_at?: string;
    updated_at?: string;
}

export interface VehicleMakerType {
    id: number;
    name: string;
    user_name: string;
    created_at?: string;
    updated_at?: string;
}

export interface VehicleModelType {
    id: number;
    name: string;
    maker_name: string;
    created_at?: string;
    updated_at?: string;
}

export interface VehicleStatusType {
    id: number;
    status_name: string;
    description: string;
    is_rentable: string;
    user_name: string;
    created_at?: string;
    updated_at?: string;
}

// Customers
export interface Customers {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    email: string;
    phone_number: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state_province: string;
    country: string;
    passport_number: string;
    passport_expiry: string;
    notes: string | null | undefined;
    user_id: string;
    created_at?: any;
    updated_at?: any;
    [key: string]: any;
}
