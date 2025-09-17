import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

export interface NavGroup {
    title?: string;
    items: NavItem[];
}

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const page = usePage();
    const currentUrl = page.url;

    const [openGroups, setOpenGroups] = useState(() => {
        const activeGroup = groups.find(group => 
            group.items.some(item => currentUrl.startsWith(item.href))
        );
        return activeGroup && activeGroup.title ? [activeGroup.title] : [];
    });

    const handleOpenChange = (groupTitle: string | undefined, isOpen: boolean) => {
        if (!groupTitle) return;

        setOpenGroups(prevOpenGroups => {
            if (isOpen) {
                return [...prevOpenGroups, groupTitle];
            } else {
                return prevOpenGroups.filter(title => title !== groupTitle);
            }
        });
    };

    return (
        <>
            {groups.map((group, index) => {
                const groupTitle = group.title || `group-${index}`;
                const isOpen = openGroups.includes(groupTitle);
                
                // Check if any item in the group is active
                const isGroupActive = group.items.some(item => currentUrl.startsWith(item.href));

                return (
                    <Collapsible
                        key={groupTitle}
                        className='group/collapsible'
                        open={isOpen}
                        onOpenChange={(isOpen) => handleOpenChange(group.title, isOpen)}
                    >
                        <SidebarGroup className="mb-2 px-2 py-0">
                            <SidebarGroupLabel asChild className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm">
                                <CollapsibleTrigger
                                    className={`
                                        w-full
                                        ${
                                            !isOpen && !isGroupActive // Apply button styles only when closed AND not active
                                                ? 'rounded-md px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
                                                : ''
                                        }
                                        ${
                                            isGroupActive && !isOpen // Apply active-but-collapsed styles
                                                ? 'rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 font-semibold' 
                                                : ''
                                        }
                                    `}
                                >
                                    {group.title}
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {group.items.map((item) => {
                                        const isActive = currentUrl.startsWith(item.href);

                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton asChild isActive={isActive}>
                                                    <Link href={item.href} prefetch={item.prefetch ?? false}>
                                                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                );
            })}
        </>
    );
}