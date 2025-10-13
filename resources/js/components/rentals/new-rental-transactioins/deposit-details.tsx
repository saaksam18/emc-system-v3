import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Customers } from '@/types';
import { EnhancedDeposit, FormErrors, InitialFormValues, SetDataFunction } from '@/types/transaction-types'; // Adjusted to use the specific imports from your parent component context
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import CustomerDetailsCard from './customer-details-card';

// --- Component Props Type ---
interface DepositDetailsProps {
    data: InitialFormValues;
    setData: SetDataFunction;
    formErrors: FormErrors;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    // Other props from the parent are passed but not strictly needed for this form:
    selectedCustomerData?: Customers | null;
}

// --- Deposit Details Component ---
const DepositDetails: React.FC<DepositDetailsProps> = ({ data, setData, formErrors, selectedCustomerData }) => {
    // --- 1. Handlers for Deposit Array Manipulation ---

    /**
     * Adds a new deposit object to the activeDeposits array.
     * It ensures there is always one primary deposit.
     */
    const addDeposit = () => {
        const newId = `temp_${Date.now()}`; // Use a temporary, unique string ID for new front-end items

        const newDeposit: EnhancedDeposit = {
            id: newId,
            deposit_type: '',
            deposit_value: '',
            registered_number: null,
            expiry_date: null,
            description: '',
            is_primary: false, // All added deposits are secondary by default
        };

        // Use functional update for setData to append the new deposit
        setData('activeDeposits', [...data.activeDeposits, newDeposit]);
    };

    /**
     * Removes a deposit from the activeDeposits array by its index.
     * Prevents removal of the primary deposit (index 0 by default).
     */
    const removeDeposit = (indexToRemove: number) => {
        // Prevent removal of the primary deposit (assuming index 0 is always primary as per initialFormValues)
        if (indexToRemove === 0) {
            alert('The primary deposit must be present and cannot be removed.');
            return;
        }

        // Use functional update for setData to filter out the deposit at the given index
        setData(
            'activeDeposits',
            data.activeDeposits.filter((_, index) => index !== indexToRemove),
        );
    };

    /**
     * Handles changes for inputs within the nested activeDeposits array.
     * @param index - The index of the deposit in the array.
     * @param field - The field name to update (e.g., 'deposit_value').
     * @param value - The new value for the field.
     */
    const handleDepositChange = (index: number, field: keyof EnhancedDeposit, value: string | number | boolean | null) => {
        // Create a new array to avoid direct state mutation
        const updatedDeposits = data.activeDeposits.map((deposit, i) => {
            if (i === index) {
                // Return a new object for the specific deposit being updated
                return { ...deposit, [field]: value };
            }
            return deposit; // Return other deposits as they are
        });

        // Update the form data with the new array
        setData('activeDeposits', updatedDeposits);
    };

    // --- 2. Form Rendering ---

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-6">
                <p className="text-sm text-gray-500">
                    Configure the deposit(s) required for this rental. The first deposit is marked as **Primary**.
                </p>

                <div className="space-y-8">
                    {data.activeDeposits.map((deposit, index) => {
                        const isPrimary = index === 0;

                        return (
                            <Card key={deposit.id} className="relative shadow-lg ring-1 ring-gray-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-xl font-bold">
                                        {isPrimary ? 'Primary Deposit' : `Additional Deposit #${index}`}
                                    </CardTitle>
                                    {!isPrimary && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeDeposit(index)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove Deposit"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Error Display for Array Item */}
                                    {formErrors[`activeDeposits.${index}`] && (
                                        <div className="flex items-center space-x-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                            <span>{formErrors[`activeDeposits.${index}`]}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {/* Deposit Type */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`deposit_type_${deposit.id}`}>Deposit Type</Label>
                                            <Input
                                                id={`deposit_type_${deposit.id}`}
                                                type="text"
                                                value={deposit.deposit_type || ''}
                                                onChange={(e) => handleDepositChange(index, 'deposit_type', e.target.value)}
                                                placeholder="e.g., Security, Bond, Key"
                                                className={formErrors[`activeDeposits.${index}.deposit_type`] ? 'border-red-500' : ''}
                                            />
                                            {formErrors[`activeDeposits.${index}.deposit_type`] && (
                                                <p className="text-xs text-red-500">{formErrors[`activeDeposits.${index}.deposit_type`]}</p>
                                            )}
                                        </div>

                                        {/* Deposit Value */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`deposit_value_${deposit.id}`}>Value (Amount)</Label>
                                            <Input
                                                id={`deposit_value_${deposit.id}`}
                                                type="number"
                                                value={deposit.deposit_value}
                                                onChange={(e) => handleDepositChange(index, 'deposit_value', e.target.value)}
                                                placeholder="e.g., 50.00"
                                                className={formErrors[`activeDeposits.${index}.deposit_value`] ? 'border-red-500' : ''}
                                            />
                                            {formErrors[`activeDeposits.${index}.deposit_value`] && (
                                                <p className="text-xs text-red-500">{formErrors[`activeDeposits.${index}.deposit_value`]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {/* Registered Number (Optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`registered_number_${deposit.id}`}>Registered No. (Optional)</Label>
                                            <Input
                                                id={`registered_number_${deposit.id}`}
                                                type="text"
                                                value={deposit.registered_number || ''}
                                                onChange={(e) => handleDepositChange(index, 'registered_number', e.target.value)}
                                                placeholder="e.g., Receipt/Serial Number"
                                                className={formErrors[`activeDeposits.${index}.registered_number`] ? 'border-red-500' : ''}
                                            />
                                        </div>

                                        {/* Expiry Date (Optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`expiry_date_${deposit.id}`}>Expiry Date (Optional)</Label>
                                            <Input
                                                id={`expiry_date_${deposit.id}`}
                                                type="date"
                                                value={deposit.expiry_date || ''}
                                                onChange={(e) => handleDepositChange(index, 'expiry_date', e.target.value)}
                                                className={formErrors[`activeDeposits.${index}.expiry_date`] ? 'border-red-500' : ''}
                                            />
                                        </div>
                                    </div>

                                    {/* Description (Full Width) */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`description_${deposit.id}`}>Description (Optional)</Label>
                                        <Textarea
                                            id={`description_${deposit.id}`}
                                            value={deposit.description || ''}
                                            onChange={(e) => handleDepositChange(index, 'description', e.target.value)}
                                            placeholder="Detailed reason for this deposit..."
                                            rows={3}
                                            className={formErrors[`activeDeposits.${index}.description`] ? 'border-red-500' : ''}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Button type="button" onClick={addDeposit} className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Another Deposit
                </Button>

                {/* Top-level array error */}
                {formErrors.activeDeposits && (
                    <div className="mt-4 flex items-center space-x-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span>{formErrors.activeDeposits}</span>
                    </div>
                )}
            </div>
            <div>
                <CustomerDetailsCard selectedCustomerData={selectedCustomerData} />
            </div>
        </div>
    );
};

export default DepositDetails;
