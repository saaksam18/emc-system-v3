import { FormField } from '@/components/form/FormField';
import { SearchableCombobox } from '@/components/form/SearchableCombobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Customers, Vehicle } from '@/types';
import { EnhancedDeposit, FormErrors, InitialFormValues } from '@/types/transaction-types'; // Adjusted to use the specific imports from your parent component context
import { InertiaFormProps } from '@inertiajs/react';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { DepositDatePicker } from './helpers/DepositDatePicker';

const lookupName = (items: { id: number; name: string }[], id: number | string | null | undefined): string => {
    if (!id || typeof id !== 'number') {
        return '';
    }
    const foundItem = items.find((item) => item.id === id);
    return foundItem ? foundItem.name : '';
};
// --- Reusable Entity Combobox ---
interface EntityComboboxProps<T extends { id: number; name: string }> {
    items: T[] | null;
    value: string;
    onChange: (value: string, id: number | null) => void;
    processing: boolean;
    error?: string;
    entityName: string;
    id?: string;
}
function EntityCombobox<T extends { id: number; name: string }>({ items, value, onChange, processing, error, entityName }: EntityComboboxProps<T>) {
    const options = useMemo(
        () =>
            Array.isArray(items)
                ? items
                      .filter((item): item is T => !!item && !!item.id && typeof item.name === 'string' && item.name !== '')
                      .map((item) => ({ value: item.name, label: item.name }))
                : [],
        [items],
    );

    const handleSelect = (selectedName: string) => {
        // Find the corresponding item/ID
        const selectedItem = items?.find((item) => item.name === selectedName);
        const selectedId = selectedItem?.id ?? null;

        // Call the new onChange with both name and ID
        onChange(selectedName, selectedId);
    };

    return (
        <>
            <SearchableCombobox
                options={options}
                value={value}
                onChange={handleSelect}
                placeholder={`Select ${entityName}...`}
                searchPlaceholder={`Search ${entityName}...`}
                emptyMessage={`No ${entityName} found.`}
                disabled={processing || options.length === 0}
                error={!!error}
            />
            {options.length === 0 && !processing && <p className="text-muted-foreground mt-1 text-sm">No {entityName}s available.</p>}
        </>
    );
}

// --- Component Props Type ---
interface DepositDetailsProps {
    data: InitialFormValues;
    formErrors: FormErrors;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    // Other props from the parent are passed but not strictly needed for this form:
    selectedCustomerData: Customers | null;
    selectedVehicleData: Vehicle | undefined;
    depositTypes: { id: number; name: string }[];
    processing: boolean;

    // Handlers
    setData: InertiaFormProps<InitialFormValues>['setData'];
}

// --- Deposit Details Component ---
const DepositDetails: React.FC<DepositDetailsProps> = ({
    data,
    setData,
    formErrors,
    selectedCustomerData,
    selectedVehicleData,
    depositTypes,
    processing,
}) => {
    /**
     * Adds a new deposit object to the activeDeposits array.
     * It ensures there is always one primary deposit.
     */
    const addDeposit = () => {
        const newId = `temp_${Date.now()}`; // Use a temporary, unique string ID for new front-end items

        const newDeposit: EnhancedDeposit = {
            id: newId,
            deposit_type: '',
            deposit_type_name: '',
            deposit_value: '',
            visa_type: null,
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
    const handleDepositChange = (index: number, field: keyof EnhancedDeposit, value: string | number | boolean | null) => {
        const updatedDeposits = data.activeDeposits.map((deposit, i) => {
            if (i === index) {
                return { ...deposit, [field]: value };
            }
            return deposit;
        });
        setData('activeDeposits', updatedDeposits);
    };

    // --- 2. Form Rendering ---

    return (
        <div className="space-y-6">
            <div className="space-y-8">
                {data.activeDeposits.map((deposit, index) => {
                    const isPrimary = index === 0;

                    const currentDepositTypeName = lookupName(depositTypes, deposit.deposit_type);
                    const isPassport = currentDepositTypeName === 'Passport';

                    // Define a specific change handler for this combobox
                    const handleDepositTypeChange = (name: string, id: number | null) => {
                        const updatedDeposits = data.activeDeposits.map((d, i) => {
                            if (i === index) {
                                const isMoney = name === 'Money';
                                let newDepositValue = d.deposit_value;

                                if (!isMoney && selectedCustomerData?.nationality) {
                                    newDepositValue = selectedCustomerData.nationality;
                                } else if (isMoney) {
                                    newDepositValue = '';
                                }

                                const newDeposit = {
                                    ...d,
                                    deposit_type: id,
                                    deposit_type_name: name,
                                    deposit_value: newDepositValue,
                                };

                                if (name !== 'Passport') {
                                    newDeposit.visa_type = null;
                                    newDeposit.expiry_date = null;
                                }

                                return newDeposit;
                            }
                            return d;
                        });
                        setData('activeDeposits', updatedDeposits);
                    };

                    return (
                        <Card
                            key={deposit.id}
                            className={`${isPrimary ? 'dark:bg-sidebar border-green-200 bg-green-50 dark:border-green-950' : ''} relative space-y-0 shadow-lg ring-1 ring-gray-200`}
                        >
                            <CardHeader className="flex flex-col items-center justify-start space-y-0">
                                <div className="flex w-full justify-between">
                                    <CardTitle className="flex items-center">
                                        <CheckCircle className="mr-2 h-5 w-5 text-indigo-500" />
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
                                </div>
                                <CardDescription className="w-full">
                                    {isPrimary
                                        ? 'Define the primary deposit for this transaction.'
                                        : 'Define the additional deposit for this transaction.'}
                                </CardDescription>
                            </CardHeader>
                            <Separator />
                            <CardContent className="space-y-6">
                                {/* Error Display for Array Item */}
                                {formErrors[`activeDeposits.${index}`] && (
                                    <div className="flex items-center space-x-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <span>{formErrors[`activeDeposits.${index}`]}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    {/* Deposit Type */}
                                    <FormField
                                        label="Kind of Deposit"
                                        htmlFor={`deposit_type_${deposit.id}`}
                                        error={formErrors.deposit_type}
                                        required
                                    >
                                        {/* Customer Combobox */}
                                        <EntityCombobox
                                            id={`deposit_type_${deposit.id}`}
                                            items={depositTypes}
                                            value={currentDepositTypeName}
                                            onChange={handleDepositTypeChange}
                                            processing={processing}
                                            error={formErrors.deposit_type}
                                            entityName="kind"
                                        />
                                    </FormField>

                                    {/* Deposit Value */}
                                    <FormField label="Value" htmlFor={`deposit_value_${deposit.id}`} error={formErrors.deposit_type} required>
                                        <Input
                                            id={`deposit_value_${deposit.id}`}
                                            type="text"
                                            value={deposit.deposit_value}
                                            onChange={(e) => handleDepositChange(index, 'deposit_value', e.target.value)}
                                            placeholder="e.g., 50.00"
                                            className={formErrors[`activeDeposits.${index}.deposit_value`] ? 'border-red-500' : 'bg-white'}
                                        />
                                        {formErrors[`activeDeposits.${index}.deposit_value`] && (
                                            <p className="text-xs text-red-500">{formErrors[`activeDeposits.${index}.deposit_value`]}</p>
                                        )}
                                    </FormField>
                                </div>

                                {isPassport && (
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        {/* Registered Number (Optional) */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`visa_type_${deposit.id}`}>Visa Type. (Optional)</Label>
                                            <Input
                                                id={`visa_type_${deposit.id}`}
                                                type="text"
                                                value={deposit.visa_type || ''}
                                                onChange={(e) => handleDepositChange(index, 'visa_type', e.target.value)}
                                                placeholder="e.g., EB, EG"
                                                className={formErrors[`activeDeposits.${index}.visa_type`] ? 'border-red-500' : 'bg-white'}
                                            />
                                        </div>

                                        {/* Expiry Date (Optional) */}
                                        <FormField
                                            label="Visa Expiry Date (Optional)"
                                            htmlFor={`expiry_date_${deposit.id}`}
                                            error={formErrors[`activeDeposits.${index}.expiry_date`]} // Use array-specific error
                                        >
                                            <DepositDatePicker
                                                id={`expiry_date_${deposit.id}`}
                                                value={deposit.expiry_date}
                                                // Pass the handler to update the correct field in the correct deposit object
                                                onChange={(dateString) => handleDepositChange(index, 'expiry_date', dateString)}
                                                error={formErrors[`activeDeposits.${index}.expiry_date`]}
                                            />
                                        </FormField>
                                    </div>
                                )}

                                {/* Description (Full Width) */}
                                <div className="space-y-2">
                                    <Label htmlFor={`description_${deposit.id}`}>Description (Optional)</Label>
                                    <Textarea
                                        id={`description_${deposit.id}`}
                                        value={deposit.description || ''}
                                        onChange={(e) => handleDepositChange(index, 'description', e.target.value)}
                                        placeholder="Detailed reason for this deposit..."
                                        rows={3}
                                        className={formErrors[`activeDeposits.${index}.description`] ? 'border-red-500' : 'bg-white'}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Button type="button" onClick={addDeposit} className="mt-4" variant="default">
                <Plus className="mr-2 h-4 w-4" /> Add Additional Deposit
            </Button>

            {/* Top-level array error */}
            {formErrors.activeDeposits && (
                <div className="mt-4 flex items-center space-x-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{formErrors.activeDeposits}</span>
                </div>
            )}
        </div>
    );
};

export default DepositDetails;
