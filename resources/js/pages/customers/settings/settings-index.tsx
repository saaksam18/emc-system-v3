import { Create } from '@/components/customers/sheets/settings/create';
import { Edit } from '@/components/customers/sheets/settings/edit';
import { Show } from '@/components/customers/sheets/settings/show';
import { columns, TableMeta } from '@/components/customers/sheets/settings/tables/columns';
import { DataTable } from '@/components/customers/sheets/settings/tables/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ContactTypes, User } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { BookUser } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Customers',
        href: '/customers',
    },
    {
        title: 'Settings',
        href: '/customers/settings',
    },
];

interface PageProps {
    users: User[];
    contactTypes: ContactTypes[]; // Ensure this is always an array
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        // Make errors potentially undefined or an object
        errors?: Record<string, string | string[]> | undefined | null;
    };
    // Allow other props that might be passed
    [key: string]: any;
}

export default function SettingsIndex() {
    // Removed props destructuring here, use usePage instead
    const { props: pageProps } = usePage<PageProps>();
    const contactTypes = pageProps.contactTypes || []; // Ensure contactTypes is an array

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedContactType, setSelectedContactType] = useState<ContactTypes | null>(null);

    // Other UI State
    const [sheetMode, setSheetMode] = useState<'show' | 'create' | 'edit'>('create');
    // Removed editContactType state, use selectedContactType for edit mode as well
    const [globalFilter, setGlobalFilter] = useState('');

    // Effect for flash messages
    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
            // Clear flash message after showing (optional, depends on Inertia setup)
            // router.replace(window.location.pathname, { data: {}, preserveState: true });
        }
        if (flash?.error) {
            toast.error(flash.error);
            // router.replace(window.location.pathname, { data: {}, preserveState: true });
        }
        // Handle validation errors passed via flash (less common with useForm, but good fallback)
        if (flash?.errors && typeof flash.errors === 'object' && flash.errors !== null) {
            Object.values(flash.errors)
                .flat()
                .forEach((message) => {
                    if (message) {
                        // Avoid showing duplicate toasts if useForm already handles field errors
                        // toast.error(String(message));
                    }
                });
            // router.replace(window.location.pathname, { data: {}, preserveState: true });
        }
    }, [pageProps.flash]); // Dependency on flash object

    // --- Handlers for Sheet Actions ---
    const handleCreateClick = () => {
        setSheetMode('create');
        setSelectedContactType(null); // Clear selected type
        setIsSheetOpen(true);
    };

    const handleShowDetails = useCallback((contactType: ContactTypes) => {
        setSheetMode('show');
        setSelectedContactType(contactType);
        setIsSheetOpen(true);
    }, []);

    const handleEditContactType = useCallback((contactTypeToEdit: ContactTypes) => {
        setSheetMode('edit');
        setSelectedContactType(contactTypeToEdit); // Use selectedContactType for edit form data
        setIsSheetOpen(true);
    }, []);

    // Handler called by Create component when user confirms editing an existing type
    const handleSwitchToEdit = useCallback(
        (existingId: number) => {
            const contactTypeToEdit = contactTypes.find((ct) => ct.id === existingId);
            if (contactTypeToEdit) {
                handleEditContactType(contactTypeToEdit); // Reuse existing edit handler
            } else {
                console.error(`Contact type with ID ${existingId} not found.`);
                toast.error('Could not find the contact type to edit.');
                setIsSheetOpen(false); // Close sheet if type not found
            }
        },
        [contactTypes, handleEditContactType],
    ); // Dependencies

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Optionally reload data if needed, though Inertia might handle this
        // router.reload({ only: ['contactTypes'] });
        // Reset sheet state
        setSelectedContactType(null);
        setSheetMode('create'); // Or whatever default state you prefer
    };

    // Close sheet handler
    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            // Reset state when sheet closes
            setSelectedContactType(null);
            // Optionally reset mode, or let it persist
            // setSheetMode('create');
        }
    };

    // Create the meta object to pass to the table
    const tableMeta: TableMeta = {
        globalFilter: globalFilter,
        onGlobalFilterChange: setGlobalFilter,
        createContactTypes: handleCreateClick,
        showDetails: handleShowDetails,
        editContactTypes: handleEditContactType, // Pass the original edit handler
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contact Type Settings" /> {/* Updated title */}
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="relative overflow-hidden">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Types</CardTitle> {/* Simplified title */}
                            <CardDescription>View, create, and manage contact types.</CardDescription> {/* Simplified description */}
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    placeholder="Filter contact types..." // Updated placeholder
                                    value={globalFilter}
                                    onChange={(event) => setGlobalFilter(event.target.value)}
                                    className="w-full sm:max-w-xs"
                                />
                                <Button variant="outline" onClick={handleCreateClick} className="w-full sm:w-auto">
                                    <BookUser className="mr-2 h-4 w-4" /> Create {/* Updated button text */}
                                </Button>
                            </div>
                            {/* Use contactTypes directly from the destructured props */}
                            <DataTable columns={columns} data={contactTypes} meta={tableMeta} />
                            {/* Removed Deferred as Inertia handles loading states */}
                        </CardContent>
                    </Card>
                </div>

                {/* Updated Sheet logic */}
                <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {sheetMode === 'show' && selectedContactType && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{selectedContactType.name} Details</SheetTitle>
                                    <SheetDescription>Viewing details for contact type: {selectedContactType.name}</SheetDescription>
                                </SheetHeader>
                                <Show selectedContactType={selectedContactType} />
                                <SheetFooter>
                                    <SheetClose asChild>
                                        <Button type="button" variant="outline">
                                            Close
                                        </Button>
                                    </SheetClose>
                                </SheetFooter>
                            </>
                        )}

                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Create New Contact Type</SheetTitle>
                                    <SheetDescription>Enter the details for the new contact type.</SheetDescription>
                                </SheetHeader>
                                {/* Pass the new handler to Create component */}
                                <Create onSubmitSuccess={handleFormSubmitSuccess} onSwitchToEdit={handleSwitchToEdit} />
                            </>
                        )}

                        {/* Use selectedContactType for Edit mode */}
                        {sheetMode === 'edit' && selectedContactType && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Contact Type: {selectedContactType.name}</SheetTitle>
                                    <SheetDescription>Update the contact type's details.</SheetDescription>
                                </SheetHeader>
                                {/* Pass selectedContactType to Edit component */}
                                <Edit contactType={selectedContactType} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}
