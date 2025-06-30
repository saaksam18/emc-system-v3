import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavGroup } from '@/components/nav-main'; // Assuming NavMain is updated and NavGroup type is defined there
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types'; // Assuming NavItem is defined here
import { Link } from '@inertiajs/react';
import { Bike, BookCheck, Dock, Edit3, ExternalLink, House, NotebookTabs, ReceiptCentIcon, User2 } from 'lucide-react'; // Added Settings icon
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
        // Group 2: Rental
        title: 'Scooter Rental', // Title for the second group
        items: [
            {
                title: 'Rentals', // Renamed for clarity in this group
                href: '/rentals',
                icon: NotebookTabs,
                prefetch: true,
            },
            {
                title: 'Vehicles', // Renamed for clarity in this group
                href: '/vehicles',
                icon: Bike,
                prefetch: true,
            },
        ],
    },
    {
        // Group 3: Visa & WP
        title: 'Visa / Work Permit', // Title for the second group
        items: [
            {
                title: 'Visa', // Renamed for clarity in this group
                href: '/vehicles',
                icon: BookCheck,
                prefetch: true,
            },
            {
                title: 'Work Permit', // Renamed for clarity in this group
                href: '/vehicles',
                icon: Dock,
                prefetch: true,
            },
        ],
    },
    {
        // Group 4: Basic Data
        title: 'Visa Work Permit', // Title for the second group
        items: [
            {
                title: 'Customers', // Renamed for clarity in this group
                href: '/customers',
                icon: User2,
                prefetch: true,
            },
        ],
    },
    {
        // Group 3: Report
        title: 'Report', // Title for the second group
        items: [
            {
                title: 'Rental Transaction', // Renamed for clarity in this group
                href: '/reports/rentals-transaction',
                icon: ReceiptCentIcon,
                prefetch: true,
            },
            /* {
                title: 'Rental Chart', // Renamed for clarity in this group
                href: '/reports/rentals-transaction/chart',
                icon: Bike,
            }, */
        ],
    },
    {
        // Group 4: Client Edittor
        title: 'Website Editor', // Title for the second group
        items: [
            {
                title: 'Top', // Renamed for clarity in this group
                href: '/web-editor/top',
                icon: Edit3,
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
