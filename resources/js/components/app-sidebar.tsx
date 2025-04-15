import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavGroup } from '@/components/nav-main'; // Assuming NavMain is updated and NavGroup type is defined there
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types'; // Assuming NavItem is defined here
import { Link } from '@inertiajs/react';
import { Bike, Edit3, ExternalLink, LayoutGrid, ReceiptCentIcon, Settings, User2 } from 'lucide-react'; // Added Settings icon
import AppLogo from './app-logo';

// --- Updated Navigation Items with Groups ---
const mainNavGroups: NavGroup[] = [
    {
        // Group 1: Core
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
                prefetch: true, // Example: Keep prefetch if needed
            },
        ],
    },
    {
        // Group 2: Management
        title: 'Management', // Title for the second group
        items: [
            {
                title: 'Rental Management', // Renamed for clarity in this group
                href: '/rentals',
                icon: ReceiptCentIcon,
            },
            {
                title: 'Vehicles', // Renamed for clarity in this group
                href: '/vehicles',
                icon: Bike,
            },
            {
                title: 'Customers', // Renamed for clarity in this group
                href: '/customers',
                icon: User2,
            },
            {
                title: 'Settings', // Added a new item
                href: '/settings',
                icon: Settings,
            },
        ],
    },
    {
        // Group 3: Report
        title: 'Report', // Title for the second group
        items: [
            {
                title: 'Rental Transaction', // Renamed for clarity in this group
                href: '/rentals-transaction',
                icon: ReceiptCentIcon,
            },
            {
                title: 'Rental Chart', // Renamed for clarity in this group
                href: '/rentals-transaction',
                icon: Bike,
            },
            {
                title: 'Settings', // Added a new item
                href: '/settings',
                icon: Settings,
            },
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
