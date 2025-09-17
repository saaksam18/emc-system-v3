import { columns } from '@/components/auth/users/columns';
import { DataTable } from '@/components/auth/users/data-table';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import AppLayout from '@/layouts/app-layout';
import SubLayout from '@/layouts/auth/sub-layouts/admin-sub-layout';
// Use RoleObject if it matches the type definition used in UserForm and columns
// Or keep Role if that's the correct type throughout your app. Ensure consistency.
import { NavItem, Role, User, type BreadcrumbItem } from '@/types';
import { Deferred, Head, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
// Import useState for managing component state
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- Import the User Form Component ---
// Make sure the path is correct for your project structure
import { Input } from '@/components/ui/input';
import UserForm from './register'; // Changed import from RoleRegisterForm to UserForm

// --- Breadcrumbs Configuration ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Administrator',
        href: '/administrator/users',
    },
    {
        title: 'User',
        href: '/administrator/users',
    },
];

// --- Sidebar Navigation Items ---
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

// --- Component Props Interface ---
interface Props {
    users: User[];
    roles: Role[] | null | undefined; // Expect roles prop for the form
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: unknown;
}

// --- UserIndex Component ---
function UserIndex({ users, roles }: Props) {
    const { flash } = usePage<Props>().props;

    // --- State Management ---
    // State to control the drawer's open/closed status
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // State to determine the drawer's mode ('create' or 'edit')
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
    // State to hold the user data when editing
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // --- State for the global filter input ---
    const [globalFilter, setGlobalFilter] = useState('');

    // --- Event Handlers ---
    const handleCreateClick = () => {
        setDrawerMode('create');
        setEditingUser(null);
        setIsDrawerOpen(true);
    };

    const handleEditUser = (userToEdit: User) => {
        setDrawerMode('edit');
        setEditingUser(userToEdit);
        setIsDrawerOpen(true);
    };

    const handleFormSubmitSuccess = () => {
        setIsDrawerOpen(false);
        toast.success(drawerMode === 'create' ? 'User created successfully!' : 'User updated successfully!');
    };

    // Effect for flash messages (remains the same)
    useEffect(() => {
        if (flash?.success) {
            // Avoid double toast if form success already shows one
            // Consider coordinating toast messages between parent and form
            // toast.success(flash.success);
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

    // --- Render Logic ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Administration" />
            <SubLayout sidebarNavItems={sidebarNavItems} title="Administrator" description="Manage system administration">
                <div className="mb-4 flex items-center justify-between space-y-2">
                    {/* Adjusted layout for button */}
                    <div>
                        <HeadingSmall title="User Table Data" description="See all the registered users here." />
                    </div>
                    {/* Button to trigger Create User */}
                    {/* Filter Input and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {/* --- Global Filter Input --- */}
                        <Input
                            placeholder="Filter user..."
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs" // Adjust width as needed
                        />
                        <Button variant="default" onClick={handleCreateClick} className="w-full sm:w-auto">
                            <UserPlus className="mr-2 h-4 w-4" /> Create
                        </Button>
                    </div>
                </div>

                {/* Create/Edit User Drawer - Now controlled */}
                <Drawer direction="right" open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerContent className="flex h-full w-[450px] flex-col">
                        <DrawerHeader className="text-left">
                            {/* Conditional Title and Description */}
                            <DrawerTitle>{drawerMode === 'create' ? 'Create New User' : `Edit User: ${editingUser?.name ?? ''}`}</DrawerTitle>
                            <DrawerDescription>
                                {drawerMode === 'create' ? 'Fill in the details to register a new user.' : 'Modify the user details below.'}
                            </DrawerDescription>
                        </DrawerHeader>

                        {/* Scrollable area for the form */}
                        <div className="flex-1 overflow-auto px-4">
                            {/* Render UserForm with appropriate props */}
                            <UserForm
                                mode={drawerMode}
                                initialData={editingUser} // Pass null for create, user object for edit
                                roles={roles} // Pass available roles
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

                {/* User Data Table */}
                <Deferred data="users" fallback={<div className="p-4 text-center">Loading user data...</div>}>
                    <DataTable
                        columns={columns}
                        data={users || []}
                        // Pass the edit handler function and roles via meta
                        // Ensure your DataTable component forwards meta to useReactTable
                        meta={{
                            editUser: handleEditUser,
                            roles: roles,
                            globalFilter: globalFilter, // Pass the filter value
                            onGlobalFilterChange: setGlobalFilter, // Pass the state setter function
                        }}
                    />
                </Deferred>
            </SubLayout>
        </AppLayout>
    );
}

export default UserIndex;
