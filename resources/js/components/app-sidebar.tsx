import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavGroup } from '@/components/nav-main'; // Assuming NavMain is updated and NavGroup type is defined there
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types'; // Assuming NavItem is defined here
import { Link } from '@inertiajs/react';
import {
    BadgeDollarSign,
    BarChart,
    Bike,
    BookCheck,
    BookUser,
    ClipboardList,
    Dock,
    ExternalLink,
    File,
    FileSliders,
    House,
    LucideBanknote,
    ReceiptCentIcon,
    Scale,
    ScaleIcon,
    Settings,
    User2,
} from 'lucide-react'; // Added Settings icon
import AppLogo from './app-logo';

// --- Updated Navigation Items with Groups ---
const mainNavGroups: NavGroup[] = [
    {
        // Group 1: Core
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: House,
                prefetch: true, // Example: Keep prefetch if needed
            },
        ],
    },
    {
        // Group 2: Finance & Accounting
        title: 'Finances & Accountings',
        items: [
            {
                title: 'General Ledger',
                href: '/general-ledger',
                icon: ClipboardList,
                prefetch: true,
            },
            {
                title: 'Sales',
                href: '/sales',
                icon: BadgeDollarSign,
                prefetch: true,
            },
            {
                title: 'Expenses',
                href: '/expenses',
                icon: LucideBanknote,
                prefetch: true,
            },
            {
                title: 'Profit & Loss',
                href: '/profit-loss',
                icon: BarChart,
                prefetch: true,
            },
            {
                title: 'Balance Sheet',
                href: '/balance-sheet',
                icon: ScaleIcon,
                prefetch: true,
            },
            {
                title: 'Trial Balance',
                href: '/trial-balance',
                icon: Scale,
                prefetch: true,
            },
        ],
    },
    {
        // Group 3: Services
        title: 'Services', // Title for the second group
        items: [
            {
                title: 'Rentals',
                href: '/rentals',
                icon: BookUser,
                prefetch: true,
            },
            {
                title: 'Visa',
                href: '/vehicles',
                icon: BookCheck,
                prefetch: true,
            },
            {
                title: 'Work Permit',
                href: '/vehicles',
                icon: Dock,
                prefetch: true,
            },
        ],
    },
    {
        // Group 4: Stock
        title: 'Listing', // Title for the second group
        items: [
            {
                title: 'Customers',
                href: '/customers',
                icon: User2,
                prefetch: true,
            },
            {
                title: 'Vehicles',
                href: '/vehicles',
                icon: Bike,
                prefetch: true,
            },
        ],
    },
    {
        // Group 5: Report
        title: 'Report', // Title for the second group
        items: [
            {
                title: 'Rental Transaction',
                href: '/reports/rentals-transaction',
                icon: ReceiptCentIcon,
                prefetch: true,
            },
        ],
    },
    {
        // Group 6: Client Edittor
        title: 'Content', // Title for the second group
        items: [
            {
                title: 'Pages',
                href: '/web-editor/top',
                icon: File,
                prefetch: true,
            },
            {
                title: 'Blog',
                href: '/web-editor/top',
                icon: FileSliders,
                prefetch: true,
            },
        ],
    },
];

// Footer items remain the same (assuming NavFooter handles a flat list)
const footerNavItems: NavItem[] = [
    {
        title: 'Client Site',
        href: '/home',
        target: '_blank',
        icon: ExternalLink,
    },
    {
        id: 1,
        title: 'Administration',
        href: '/administrator',
        icon: User2,
        prefetch: true,
    },
    {
        id: 1,
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        prefetch: true,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Pass the grouped data structure to NavMain */}
                <NavMain groups={mainNavGroups} />
            </SidebarContent>

            <SidebarFooter>
                {/* NavFooter likely still takes a flat list */}
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
