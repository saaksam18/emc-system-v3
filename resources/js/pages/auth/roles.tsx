import { columns } from '@/components/auth/roles/columns';
import { DataTable } from '@/components/auth/roles/data-table';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import AppLayout from '@/layouts/app-layout';
import SubLayout from '@/layouts/auth/sub-layouts/admin-sub-layout';
import { NavItem, Permission, Role, type BreadcrumbItem } from '@/types';
import { Deferred, Head, usePage } from '@inertiajs/react';
import { KeySquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import RoleForm from './role-register';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Administrator',
        href: '/administrator/users',
    },
    {
        title: 'Role',
        href: '/administrator/roles',
    },
];

const sidebarNavItems: NavItem[] = [
    {
        title: 'User',
        href: '/administrator/users',
        icon: null,
    },
    {
        title: 'Role',
        href: '/administrator/roles',
        icon: null,
    },
];

interface Props {
    roles: Role[];
    permissions: Permission[] | null | undefined;
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any; // Add this index signature
}

function Roles({ roles, permissions }: Props) {
    const { flash } = usePage<Props>().props;

    // --- State Management ---
    // State to control the drawer's open/closed status
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // State to determine the drawer's mode ('create' or 'edit')
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
    // State to hold the user data when editing
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    // --- Event Handlers ---
    // Function to open the drawer in 'create' mode
    const handleCreateClick = () => {
        setDrawerMode('create');
        setEditingRole(null); // No user data needed for create
        setIsDrawerOpen(true); // Open the drawer
    };

    // Function to open the drawer in 'edit' mode (passed via table meta)
    const handleEditRole = (roleToEdit: Role) => {
        setDrawerMode('edit');
        setEditingRole(roleToEdit); // Store the user data
        setIsDrawerOpen(true); // Open the drawer
    };

    // Function to close the drawer (passed to UserForm)
    const handleFormSubmitSuccess = () => {
        setIsDrawerOpen(false); // Close the drawer on successful form submission
        // Optionally add a success toast message here if UserForm doesn't handle it
        toast.success(drawerMode === 'create' ? 'Role created successfully!' : 'Role updated successfully!');
    };

    useEffect(() => {
        if (flash?.success) {
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.errors && typeof flash.errors === 'object' && flash.errors !== null) {
            Object.values(flash.errors)
                .flat()
                .forEach((message) => {
                    if (message) {
                        toast.error(String(message));
                    }
                });
        }
    }, [flash]);
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role Administration" />
            <SubLayout sidebarNavItems={sidebarNavItems} title="Administrator" description="Manage system administration">
                <div className="mb-4 flex items-center justify-between space-y-2">
                    {' '}
                    {/* Adjusted layout for button */}
                    <div>
                        <HeadingSmall title="User Table Data" description="See all the registered users here." />
                    </div>
                    {/* Button to trigger Create User */}
                    <Button variant="default" onClick={handleCreateClick}>
                        {' '}
                        {/* Changed DrawerTrigger to Button with onClick */}
                        <KeySquare className="mr-2 h-4 w-4" /> Create
                    </Button>
                </div>
                {/* Create/Edit User Drawer - Now controlled */}
                <Drawer direction="right" open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerContent className="flex h-full w-[450px] flex-col">
                        <DrawerHeader className="text-left">
                            {/* Conditional Title and Description */}
                            <DrawerTitle>{drawerMode === 'create' ? 'Create New Role' : `Edit Role: ${editingRole?.name ?? ''}`}</DrawerTitle>
                            <DrawerDescription>
                                {drawerMode === 'create' ? 'Fill in the details to register a new user.' : 'Modify the user details below.'}
                            </DrawerDescription>
                        </DrawerHeader>

                        {/* Scrollable area for the form */}
                        <div className="flex-1 overflow-auto px-4">
                            {/* Render UserForm with appropriate props */}
                            <RoleForm
                                mode={drawerMode}
                                initialData={editingRole} // Pass null for create, user object for edit
                                permissions={permissions} // Pass available roles
                                onSubmitSuccess={handleFormSubmitSuccess} // Pass callback to close drawer
                            />
                        </div>

                        {/* Footer with Close Button */}
                        <DrawerFooter className="border-t pt-2">
                            <DrawerClose asChild>
                                <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                                    Cancel
                                </Button>
                            </DrawerClose>
                            {/* Submit button is now inside UserForm */}
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>

                <Deferred data="roles" fallback={<div className="p-4 text-center">Loading user data...</div>}>
                    <DataTable
                        columns={columns}
                        data={roles || []}
                        // Pass the edit handler function and roles via meta
                        // Ensure your DataTable component forwards meta to useReactTable
                        meta={{
                            editRole: handleEditRole,
                            permissions: permissions,
                        }}
                    />
                </Deferred>
            </SubLayout>
        </AppLayout>
    );
}

export default Roles;
