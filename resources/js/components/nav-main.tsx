import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types'; // Assuming NavItem is defined here
import { Link, usePage } from '@inertiajs/react';

// Define the NavGroup type (assuming it's similar to this)
// If you have this defined elsewhere, you can import it instead.
export interface NavGroup {
    title?: string; // Optional title for the group
    items: NavItem[];
}

// Update NavMain to accept 'groups' prop
export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const page = usePage();
    const currentUrl = page.url;

    return (
        <>
            {/* Iterate over each group in the 'groups' array */}
            {groups.map((group, index) => (
                <SidebarGroup key={group.title || `group-${index}`} className="mb-2 px-2 py-0">
                    {/* Add margin-bottom */}
                    {/* Render group label only if a title exists */}
                    {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
                    <SidebarMenu>
                        {/* Iterate over items within the current group */}
                        {group.items.map((item) => {
                            // Determine if the current item's link is active
                            // Checks if the current URL starts with the item's href
                            const isActive = currentUrl.startsWith(item.href);

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={isActive}>
                                        {/* Use Inertia Link for navigation */}
                                        <Link href={item.href} prefetch={item.prefetch ?? false}>
                                            {/* Render icon if provided */}
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />} {/* Add styling for icon */}
                                            {/* Render item title */}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
