import { Icon } from '@/components/icon';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type ComponentPropsWithoutRef } from 'react';

/**
 * NavFooter component displays navigation items in the sidebar footer.
 * It handles both internal (Inertia Links) and external links.
 * The active state is determined by checking if the current page URL starts with the item's href.
 *
 * @param {ComponentPropsWithoutRef<typeof SidebarGroup> & { items: NavItem[] }} props - Component props.
 * @param {NavItem[]} props.items - Array of navigation items to display.
 * @param {string} [props.className] - Optional additional CSS classes for the SidebarGroup.
 * @returns {JSX.Element} The rendered NavFooter component.
 */
export function NavFooter({
    items,
    className,
    ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
}) {
    // Get the current page object from Inertia
    const page = usePage();

    return (
        // SidebarGroup container for the footer navigation
        <SidebarGroup {...props} className={`group-data-[collapsible=icon]:p-0 ${className || ''}`}>
            <SidebarGroupContent>
                {/* SidebarMenu holds the list of menu items */}
                <SidebarMenu>
                    {/* Map through the provided navigation items */}
                    {items.map((item) => {
                        // Determine if the link is internal (has an ID) or external
                        const isInternalLink = item.id ? true : false;

                        // Determine if the current menu item should be marked as active.
                        // It's active if the current page URL starts with the item's href.
                        // Added check for page.url to ensure it exists before calling startsWith.
                        const isActive = page.url && item.url ? page.url.startsWith(item.url) : false;

                        return (
                            // SidebarMenuItem represents a single item in the menu
                            <SidebarMenuItem key={item.title}>
                                {/* SidebarMenuButton is the clickable part of the item */}
                                {/* Use `asChild` to render the Link or anchor tag directly */}
                                <SidebarMenuButton asChild isActive={isActive}>
                                    {/* Render an Inertia Link for internal navigation */}
                                    {isInternalLink ? (
                                        <Link
                                            href={item.url}
                                            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                                            prefetch // Enable prefetching for internal links
                                        >
                                            {/* Display icon if provided */}
                                            {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                            {/* Display item title */}
                                            <span>{item.title}</span>
                                        </Link>
                                    ) : (
                                        // Render a standard anchor tag for external links
                                        <a
                                            href={item.url}
                                            target={item.target || '_blank'} // Default to opening in a new tab
                                            rel="noopener noreferrer" // Security best practice for external links
                                            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                                        >
                                            {/* Display icon if provided */}
                                            {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                            {/* Display item title */}
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
