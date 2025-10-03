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
    Computer,
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

const mainNavGroups: NavGroup[] = [
    {
        title: 'Main',
        items: [
            {
                title: 'Dashboard',
                url: '/dashboard',
                icon: House,
                prefetch: true,
            },
        ],
    },
    {
        title: 'Financial',
        items: [
            {
                title: 'General Ledger',
                url: '/general-ledger',
                icon: ClipboardList,
                prefetch: true,
            },
            {
                title: 'Sales',
                url: '/sales',
                icon: BadgeDollarSign,
                prefetch: true,
            },
            {
                title: 'Expenses',
                url: '/expenses',
                icon: LucideBanknote,
                prefetch: true,
            },
            {
                title: 'Profit & Loss',
                url: '/profit-loss',
                icon: BarChart,
                prefetch: true,
            },
            {
                title: 'Balance Sheet',
                url: '/balance-sheet',
                icon: ScaleIcon,
                prefetch: true,
            },
            {
                title: 'Trial Balance',
                url: '/trial-balance',
                icon: Scale,
                prefetch: true,
            },
        ],
    },
    {
        title: 'Services',
        items: [
            {
                title: 'Rentals',
                url: '/rentals',
                icon: BookUser,
                prefetch: true,
            },
            {
                title: 'Visa',
                url: '/vehicles',
                icon: BookCheck,
                prefetch: true,
            },
            {
                title: 'Work Permit',
                url: '/vehicles',
                icon: Dock,
                prefetch: true,
            },
        ],
    },
    {
        title: 'List',
        items: [
            {
                title: 'Customers',
                url: '/customers',
                icon: User2,
                prefetch: true,
            },
            {
                title: 'Vehicles',
                url: '/vehicles',
                icon: Bike,
                prefetch: true,
            },
        ],
    },
    {
        title: 'Report',
        items: [
            {
                title: 'Rental Transaction',
                url: '/reports/rentals-transaction',
                icon: ReceiptCentIcon,
                prefetch: true,
            },
        ],
    },
    {
        title: 'Content',
        items: [
            {
                title: 'Pages',
                url: '/web-editor/top',
                icon: File,
                prefetch: true,
            },
            {
                title: 'Blog',
                url: '/web-editor/top',
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
        url: '/home',
        target: '_blank',
        icon: ExternalLink,
    },
    {
        id: 1,
        title: 'POS',
        url: '/pos',
        icon: Computer,
        prefetch: true,
    },
    {
        id: 2,
        title: 'Administration',
        url: '/administrator',
        icon: User2,
        prefetch: true,
    },
    {
        id: 3,
        title: 'Settings',
        url: '/settings',
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
