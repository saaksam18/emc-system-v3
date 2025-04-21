import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Customers, Deposits } from '@/types';
import { Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';

interface Props {
    selectedCustomer: Customers;
}

export function Show({ selectedCustomer }: Props) {
    return (
        <div className="px-4">
            <div className="relative flex flex-col gap-4 overflow-hidden">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Informations</CardTitle>
                        <CardDescription>Basic informations about customer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Basic Info */}
                        <p>
                            <strong>ID: {selectedCustomer.id}</strong>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Informations</CardTitle>
                        <CardDescription>Customer contacts informations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Contact Info */}
                        <h4 className="pt-2 font-semibold">Contact Information</h4>
                        <p>
                            <strong>Primary Contact Type:</strong> {selectedCustomer.primary_contact_type || 'N/A'}
                        </p>
                        <p>
                            <strong>Primary Contact:</strong> {selectedCustomer.primary_contact || 'N/A'}
                        </p>
                        <p>
                            <strong>Total Active Contacts:</strong> {selectedCustomer.active_contacts_count ?? 'N/A'}
                        </p>

                        {/* --- FIXED: Rendering Active Contacts --- */}
                        <h4 className="text-base font-semibold">All Active Contacts</h4>
                        {/* Check if activeContacts exists and is an array */}

                        <div className="space-y-3">
                            {selectedCustomer.activeContacts &&
                            Array.isArray(selectedCustomer.activeContacts) &&
                            selectedCustomer.activeContacts.length > 0 ? (
                                selectedCustomer.activeContacts.map((contact, index) => (
                                    <div
                                        key={contact.id}
                                        className="bg-muted/50 hover:bg-muted/70 flex items-center space-x-2 rounded-md border p-3 transition-colors"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <Label htmlFor={`contact_type_${index}`} className="sr-only">
                                                Type
                                            </Label>
                                            <ul className="list-none space-y-1 pl-5">
                                                <li key={contact.id}>{contact.contact_type}</li>
                                            </ul>
                                        </div>
                                        <div className="w-14 min-w-0 flex-auto">
                                            <Label htmlFor={`contact_value_${index}`} className="sr-only">
                                                Value
                                            </Label>
                                            <ul className="list-none space-y-1 pl-5">
                                                <li key={contact.id}>
                                                    {contact.contact_value}
                                                    {/* Optionally add more details like description */}
                                                    {contact.description && ` (${contact.description})`}
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Label htmlFor={`contact_description_${index}`} className="sr-only">
                                                Description
                                            </Label>
                                            <ul className="list-none space-y-1 pl-5">
                                                <li key={contact.id}>{contact.description && ` (${contact.description})`}</li>
                                            </ul>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Display message if no active contacts
                                <p className="text-muted-foreground text-sm">No active contacts found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Identification Informations</CardTitle>
                        <CardDescription>Customer identification informations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Deposit Info */}
                        <h4 className="pt-2 font-semibold">Contact Information</h4>
                        <p>
                            <strong>Primary Identification Type:</strong> {selectedCustomer.primary_deposit_type || 'N/A'}
                        </p>
                        <p>
                            <strong>Primary Identification:</strong> {selectedCustomer.primary_deposit || 'N/A'}
                        </p>
                        <p>
                            <strong>Total Active Identifications:</strong> {selectedCustomer.active_deposits_count ?? 'N/A'}
                        </p>

                        {/* --- FIXED: Rendering Active Contacts --- */}
                        <h4 className="pt-2 font-semibold">All Active Contacts</h4>
                        {/* Check if activeContacts exists and is an array */}
                        {selectedCustomer.activeContacts &&
                        Array.isArray(selectedCustomer.activeDeposits) &&
                        selectedCustomer.activeDeposits.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-5">
                                {/* Map over the array */}
                                {selectedCustomer.activeDeposits.map((deposit: Deposits) => (
                                    // Use contact.id as the key
                                    <li key={deposit.id}>
                                        Type: {deposit.type}: Registered: {deposit.registered_number}: Expiry Date: {deposit.expiry_date}
                                        {/* Optionally add more details like description */}
                                        {deposit.description && ` (${deposit.description})`}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            // Display message if no active contacts
                            <p className="text-muted-foreground text-sm">No active contacts found.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Meta Informations</CardTitle>
                        <CardDescription>Customer meta informations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Meta Info */}
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
                        <div className="mt-8">
                            <p className="hover:underline">
                                <Link href={''} prefetch className="item-center flex justify-center gap-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Rental Histories</span>
                                    <ExternalLink className="h-auto w-4" />
                                </Link>
                            </p>
                            <p className="hover:underline">
                                <Link href={''} prefetch className="item-center flex justify-center gap-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Visa Extension Histories</span>
                                    <ExternalLink className="h-auto w-4" />
                                </Link>
                            </p>
                            <p className="hover:underline">
                                <Link href={''} prefetch className="item-center flex justify-center gap-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Work Permit Histories</span>
                                    <ExternalLink className="h-auto w-4" />
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
