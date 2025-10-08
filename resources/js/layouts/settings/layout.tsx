import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface NavItemGroup {
    group: string;
    items: NavItem[];
}

const sidebarNavItems: NavItemGroup[] = [
    {
        group: 'General',
        items: [
            {
                title: 'Appearance',
                url: '/settings/appearance',
                icon: null,
            },
        ],
    },
    {
        group: 'Account',
        items: [
            {
                title: 'Profile',
                url: '/settings/profile',
                icon: null,
            },
            {
                title: 'Password',
                url: '/settings/password',
                icon: null,
            },
        ],
    },
    {
        group: 'Accounting',
        items: [
            {
                title: 'Vendors',
                url: '/settings/vendors',
                icon: null,
            },
        ],
    },
    {
        group: 'Entities',
        items: [
            {
                title: 'Deposit Type',
                url: '/settings/rentals/deposit-type',
                icon: null,
            },
            {
                title: 'Contact Type',
                url: '/settings/customers/types',
                icon: null,
            },
        ],
    },
    {
        group: 'Vehicles',
        items: [
            {
                title: 'Classes',
                url: '/settings/vehicles/classes',
                icon: null,
            },
            {
                title: 'Status',
                url: '/settings/vehicles/status',
                icon: null,
            },
            {
                title: 'Maker',
                url: '/settings/vehicles/makers',
                icon: null,
            },
            {
                title: 'Model',
                url: '/settings/vehicles/models',
                icon: null,
            },
        ],
    },
    {
        group: 'Templates',
        items: [
            {
                title: 'Rental Contract',
                url: '/templates/new-rental-contract-master',
                icon: null,
            },
            {
                title: 'Rental Receipt',
                url: '',
                icon: null,
            },
            {
                title: 'Visa Receipt',
                url: '',
                icon: null,
            },
            {
                title: 'Work Permit Receipt',
                url: '',
                icon: null,
            },
        ],
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title="Settings" description="Manage system settings" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-4">
                        {sidebarNavItems.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                <h2 className="text-md mb-2 px-1 font-semibold tracking-tight">{group.group}</h2>
                                <div className="space-y-1">
                                    {group.items.map((item, itemIndex) => (
                                        <Button
                                            key={`${item.url}-${itemIndex}`}
                                            size="sm"
                                            variant="ghost"
                                            asChild
                                            className={cn('w-full justify-start', {
                                                'bg-muted': currentPath === item.url,
                                            })}
                                        >
                                            <Link href={item.url} prefetch>
                                                {item.title}
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                                <Separator className="my-6 md:hidden" />
                            </div>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="w-full flex-1">
                    <section className="max-w-4xl space-y-4">{children}</section>
                </div>
            </div>
        </div>
    );
}
