import { Icon } from '@/components/icon';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type ComponentPropsWithoutRef } from 'react';

export function NavFooter({
    items,
    className,
    ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
}) {
    const page = usePage();
    return (
        <SidebarGroup {...props} className={`group-data-[collapsible=icon]:p-0 ${className || ''}`}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const isInternalLink = item.id ? true : false;

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={item.href === page.url}>
                                    {isInternalLink ? (
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                                            prefetch
                                        >
                                            {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                            <span>{item.title}</span>
                                        </Link>
                                    ) : (
                                        <a
                                            href={item.href}
                                            target={item.target}
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                                        >
                                            {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                            <span>{item.title}</span>
                                        </a>
                                    )}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
