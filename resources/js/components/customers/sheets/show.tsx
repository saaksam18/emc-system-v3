import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// Assuming Contact and Deposits types are correctly defined in @/types
// Make sure the definitions in @/types match the actual data structure
import { Customers } from '@/types';
import { Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';

// --- Interface Definitions ---
// Ensure these accurately reflect your data structure, especially nested objects.

// Example: Define what the Contact Type object looks like if it's nested
interface ContactTypeObject {
    id: number | string;
    name?: string; // Assuming it might have a name property
    // Add other potential properties
}

// Example: Define what the Deposit Type object looks like
interface DepositType {
    id: number | string;
    name: string;
    // Add other potential properties
}
// --- Component Props Interface ---
interface Props {
    selectedCustomer: Customers;
}

// --- Component Implementation ---
export function Show({ selectedCustomer }: Props) {
    // Function to safely render contact type
    const renderContactType = (contactType: string | ContactTypeObject | null): string => {
        if (typeof contactType === 'object' && contactType !== null) {
            // If it's an object, try to display its name, then id, otherwise indicate it's an object
            return contactType.name || `ID: ${contactType.id}` || '[Object]';
        }
        // If it's a string, return it, otherwise return 'N/A'
        return contactType || 'N/A';
    };

    return (
        <div className="px-4 py-4 md:px-4 lg:px-4">
            <div className="flex flex-col gap-4">
                {/* --- Basic Information Card --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Basic information about the customer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p>
                            <strong>ID:</strong> {selectedCustomer.id}
                        </p>
                        <p>
                            <strong>Full Name:</strong> {selectedCustomer.full_name || 'N/A'}
                        </p>
                        <p>
                            <strong>Date of Birth:</strong> {selectedCustomer.date_of_birth || 'N/A'}
                        </p>
                        <p>
                            <strong>Gender:</strong> {selectedCustomer.gender || 'N/A'}
                        </p>
                        <p>
                            <strong>Nationality:</strong> {selectedCustomer.nationality || 'N/A'}
                        </p>
                        <p>
                            <strong>Address:</strong> {selectedCustomer.address || 'N/A'}
                        </p>
                    </CardContent>
                </Card>

                {/* --- Contact Information Card --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                        <CardDescription>Customer contact information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p>
                                <strong>Primary Contact Type:</strong> {selectedCustomer.primary_contact_type || 'N/A'}
                            </p>
                            <p>
                                <strong>Primary Contact:</strong> {selectedCustomer.primary_contact || 'N/A'}
                            </p>
                            <p>
                                <strong>Total Active Contacts:</strong> {selectedCustomer.active_contacts_count ?? 'N/A'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <h4 className="mb-3 text-base font-semibold">All Active Contacts</h4>
                            <div className="space-y-3">
                                {selectedCustomer.activeContacts &&
                                Array.isArray(selectedCustomer.activeContacts) &&
                                selectedCustomer.activeContacts.length > 0 ? (
                                    selectedCustomer.activeContacts.map((contact, index) => (
                                        <div
                                            key={contact.id} // Use the number ID as key
                                            className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border p-3 transition-colors"
                                        >
                                            {/* Contact Type */}
                                            <div className="min-w-[100px] flex-1">
                                                <Label htmlFor={`contact_type_${index}`} className="text-muted-foreground text-xs">
                                                    Type
                                                </Label>
                                                {/* *** FIXED: Use the helper function for safer rendering *** */}
                                                <p id={`contact_type_${index}`} className="font-medium">
                                                    {renderContactType(contact.contact_type_name)}
                                                </p>
                                            </div>
                                            {/* Contact Value */}
                                            <div className="min-w-[150px] flex-1">
                                                <Label htmlFor={`contact_value_${index}`} className="text-muted-foreground text-xs">
                                                    Value
                                                </Label>
                                                <p id={`contact_value_${index}`} className="font-medium">
                                                    {contact.contact_value || 'N/A'}
                                                </p>
                                            </div>
                                            {/* Contact Description (Optional) */}
                                            {contact.description && (
                                                <div className="w-full min-w-[150px] flex-1">
                                                    <Label htmlFor={`contact_description_${index}`} className="text-muted-foreground text-xs">
                                                        Description
                                                    </Label>
                                                    <p id={`contact_description_${index}`} className="text-sm">
                                                        {contact.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm">No active contacts found.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- Identification Information Card --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Identification Information</CardTitle>
                        <CardDescription>Customer identification information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p>
                                <strong>Primary Identification Type:</strong> {selectedCustomer.primary_deposit_type || 'N/A'}
                            </p>
                            <p>
                                <strong>Primary Identification:</strong> {selectedCustomer.primary_deposit || 'N/A'}
                            </p>
                            <p>
                                <strong>Total Active Identifications:</strong> {selectedCustomer.active_deposits_count ?? 'N/A'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <h4 className="mb-3 text-base font-semibold">All Active Identifications</h4>
                            {selectedCustomer.activeDeposits &&
                            Array.isArray(selectedCustomer.activeDeposits) &&
                            selectedCustomer.activeDeposits.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedCustomer.activeDeposits.map((deposit) => (
                                        <div
                                            key={deposit.id}
                                            className="bg-muted/50 hover:bg-muted/70 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border p-3 transition-colors"
                                        >
                                            {/* Deposit Type */}
                                            <div className="min-w-[100px] flex-1">
                                                <Label className="text-muted-foreground text-xs">Type</Label>
                                                <p className="font-medium">{deposit.type_name || 'N/A'}</p>
                                            </div>
                                            {/* Deposit Value */}
                                            <div className="min-w-[100px] flex-1">
                                                <Label className="text-muted-foreground text-xs">Type</Label>
                                                <p className="font-medium">{deposit.deposit_value || 'N/A'}</p>
                                            </div>
                                            {/* Registered Number */}
                                            <div className="min-w-[150px] flex-1">
                                                <Label className="text-muted-foreground text-xs">Registered #</Label>
                                                <p className="font-medium">{deposit.visa_type || 'N/A'}</p>
                                            </div>
                                            {/* Expiry Date */}
                                            <div className="min-w-[100px] flex-1">
                                                <Label className="text-muted-foreground text-xs">Expiry Date</Label>
                                                <p className="font-medium">{deposit.expiry_date || 'N/A'}</p>
                                            </div>
                                            {/* Deposit Description (Optional) */}
                                            {deposit.description && (
                                                <div className="w-full min-w-[150px] flex-1">
                                                    <Label className="text-muted-foreground text-xs">Description</Label>
                                                    <p className="text-sm">{deposit.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No active identifications found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* --- Meta Information Card --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Meta Information</CardTitle>
                        <CardDescription>Customer meta information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p>
                            <strong>Registered At:</strong>{' '}
                            {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString('en-GB') : 'N/A'}
                        </p>
                        <p>
                            <strong>Notes:</strong> {selectedCustomer.notes || 'N/A'}
                        </p>
                        <p>
                            <strong>Inputer:</strong> {selectedCustomer.user_name || 'N/A'}
                        </p>
                        {/* Links Section */}
                        <div className="mt-6 border-t pt-4">
                            <h5 className="text-muted-foreground mb-3 text-center text-sm font-semibold">Related Histories</h5>
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link href={'#'} prefetch={false} className="text-primary flex items-center gap-1 text-sm hover:underline">
                                    <span>Rental Histories</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                                <Link href={'#'} prefetch={false} className="text-primary flex items-center gap-1 text-sm hover:underline">
                                    <span>Visa Extension Histories</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                                <Link href={'#'} prefetch={false} className="text-primary flex items-center gap-1 text-sm hover:underline">
                                    <span>Work Permit Histories</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// export default Show; // Uncomment if needed
