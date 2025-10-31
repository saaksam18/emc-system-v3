import { AccountCombobox } from '@/components/form/AccountCombobox';
import { EntityCombobox } from '@/components/form/entity-combobox';
import { FormField } from '@/components/form/FormField';
import { FormSection } from '@/components/form/FormSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChartOfAccountTypes } from '@/types';
import { FormErrors, InitialChangeVehicleFormValues, PaymentType, SaleItem, useAccountHelpers, useLookupName } from '@/types/transaction-types';
import { InertiaFormProps } from '@inertiajs/react';
import { Banknote, CreditCard, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ChangeVehicleProps {
    data: InitialChangeVehicleFormValues;
    setData: InertiaFormProps<InitialChangeVehicleFormValues>['setData'];
    formErrors: FormErrors;
    clearErrors: (fields?: keyof InitialChangeVehicleFormValues | (keyof InitialChangeVehicleFormValues)[]) => void;
    vehicleStatuses: { id: number; name: string }[];
    availableVehicles: { id: number; name: string }[];
    chartOfAccounts: ChartOfAccountTypes[];
    users: { id: number; name: string }[];
    processing: boolean;
    handleComboboxChange: (field: keyof InitialChangeVehicleFormValues, value: string, id: number | null) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function ChangeVehicleInformation({
    data,
    setData,
    formErrors,
    clearErrors,
    vehicleStatuses,
    availableVehicles,
    chartOfAccounts,
    users,
    handleComboboxChange,
    handleInputChange,
    processing,
}: ChangeVehicleProps) {
    const pVehicleStatusName = useLookupName(vehicleStatuses, data.p_vehicle_status_id);
    const nVehicleStatusName = useLookupName(vehicleStatuses, data.n_vehicle_status_id);
    const nVehicleStatusNo = useLookupName(availableVehicles, data.n_vehicle_id);
    const selectedInchargerName = useLookupName(users, data.incharger_id);

    const { incomeAccounts, specificBankAccounts, getAccountName } = useAccountHelpers({ chartOfAccounts });

    const [openStates, setOpenStates] = useState([{ income: false, debit: false }]);

    const addPayment = () => {
        setData((prev) => ({
            ...prev,
            payments: [
                ...prev.payments,
                {
                    id: `new-payment-${prev.payments.length}-${Date.now()}`,
                    description: 'Contract Extension Payment',
                    amount: '',
                    credit_account_id: '',
                    payment_type: 'cash',
                    debit_target_account_id: '',
                },
            ],
        }));
    };

    const removePayment = (index: number) => {
        setData((prev) => ({
            ...prev,
            payments: prev.payments.filter((_, i) => i !== index),
        }));
    };

    const handlePaymentChange = (index: number, key: keyof SaleItem, value: string | number | boolean) => {
        setData((prev) => {
            const newPayments = [...prev.payments];
            const payment = { ...newPayments[index], [key]: value };

            if (key === 'payment_type') {
                if (value === 'cash') {
                    payment.debit_target_account_id = '';
                } else if (['bank', 'credit'].includes(value as string) && specificBankAccounts.length > 0) {
                    const hasValidAccount = specificBankAccounts.some((acc) => String(acc.id) === payment.debit_target_account_id);
                    if (!hasValidAccount) {
                        payment.debit_target_account_id = String(specificBankAccounts[0].id);
                    }
                }
            }
            newPayments[index] = payment;

            const errorKey = `payments.${index}.${key}`;
            if (formErrors[errorKey]) {
                clearErrors(errorKey as keyof FormErrors);
            }

            return {
                ...prev,
                payments: newPayments,
            };
        });
    };

    const handleOpenChange = (index: number, name: 'income' | 'debit', value: boolean) => {
        const newOpenStates = [...openStates];
        newOpenStates[index] = { ...newOpenStates[index], [name]: value };
        setOpenStates(newOpenStates);
    };

    return (
        <div className="px-4">
            <form className="space-y-4">
                <FormSection title="Customer & Previous Vehicle" description="Details of the previous vehicle related to customer.">
                    {/* Previous Vehicle Status Combobox */}
                    <FormField label="Previous Vehicle Status" htmlFor="p_vehicle_status_id" error={formErrors.p_vehicle_status_id} required>
                        <EntityCombobox
                            items={vehicleStatuses}
                            value={pVehicleStatusName}
                            onChange={(name, id) => handleComboboxChange('p_vehicle_status_id', name, id)}
                            processing={processing}
                            error={formErrors.p_vehicle_status_id}
                            entityName="status"
                        />
                    </FormField>
                </FormSection>

                <FormSection title="New Vehicle Details" description="Select the new vehicle, update statuses, and assign the user in charge.">
                    <FormField label="New Vehicle No" htmlFor="n_vehicle_id" error={formErrors.n_vehicle_id} required>
                        <EntityCombobox
                            items={availableVehicles}
                            value={nVehicleStatusNo}
                            onChange={(name, id) => handleComboboxChange('n_vehicle_id', name, id)}
                            processing={processing}
                            error={formErrors.n_vehicle_id}
                            entityName="vehicle no"
                        />
                    </FormField>
                    <FormField label="New Vehicle Status" htmlFor="n_vehicle_status_id" error={formErrors.n_vehicle_status_id} required>
                        <EntityCombobox
                            items={vehicleStatuses}
                            value={nVehicleStatusName}
                            onChange={(name, id) => handleComboboxChange('n_vehicle_status_id', name, id)}
                            processing={processing}
                            error={formErrors.n_vehicle_status_id}
                            entityName="status"
                        />
                    </FormField>
                </FormSection>
                <FormSection title="Payment Details" description="Record the payment for this contract extension.">
                    {data.payments.map((payment, index) => (
                        <div
                            key={payment.id}
                            className="relative space-y-4 rounded-lg border bg-white p-4 pr-10 dark:border-gray-700 dark:bg-gray-800"
                        >
                            {data.payments.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                                    onClick={() => removePayment(index)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            )}
                            <FormField
                                label={`Rental Cost #${index + 1}`}
                                htmlFor={`amount-${index}`}
                                error={formErrors[`payments.${index}.amount`]}
                                required
                            >
                                <Input
                                    id={`amount-${index}`}
                                    name="amount"
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={payment.amount}
                                    onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                                    placeholder="e.g., 1200.50"
                                    className={cn(formErrors[`payments.${index}.amount`] && 'border-red-500')}
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Income Account"
                                htmlFor={`credit_account_id-${index}`}
                                error={formErrors[`payments.${index}.credit_account_id`]}
                                required
                            >
                                <AccountCombobox
                                    open={openStates[index]?.income ?? false}
                                    onOpenChange={(v) => handleOpenChange(index, 'income', v)}
                                    value={payment.credit_account_id}
                                    onSelect={(v) => {
                                        handlePaymentChange(index, 'credit_account_id', v);
                                        handleOpenChange(index, 'income', false);
                                    }}
                                    accounts={incomeAccounts}
                                    getAccountName={getAccountName}
                                    placeholder="Select an Income Account"
                                    searchPlaceholder="Search income account..."
                                    error={!!formErrors[`payments.${index}.credit_account_id`]}
                                />
                            </FormField>
                            <Separator />
                            <FormField
                                label="Payment Type"
                                htmlFor={`payment_type-${index}`}
                                error={formErrors[`payments.${index}.payment_type`]}
                                required
                            >
                                <RadioGroup
                                    value={payment.payment_type}
                                    onValueChange={(v: PaymentType) => handlePaymentChange(index, 'payment_type', v)}
                                    className={cn(
                                        'border-input mt-1 flex h-[38px] items-center space-x-4 rounded-md border px-2',
                                        formErrors[`payments.${index}.payment_type`] && 'border-red-500',
                                    )}
                                >
                                    {(['cash', 'bank', 'credit'] as const).map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <RadioGroupItem value={type} id={`paymentType-${index}-${type}`} />
                                            <Label htmlFor={`paymentType-${index}-${type}`} className="flex items-center text-sm capitalize">
                                                {type === 'cash' && <Banknote className="mr-1 text-green-500" size={16} />}
                                                {type === 'bank' && <CreditCard className="mr-1 text-indigo-500" size={16} />}
                                                {type === 'credit' && <CreditCard className="mr-1 text-blue-500" size={16} />}
                                                {type === 'credit' ? 'On Credit' : type}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </FormField>

                            {['bank', 'credit'].includes(payment.payment_type) && (
                                <FormField
                                    label="Target Bank Account"
                                    htmlFor={`debit_target_account_id-${index}`}
                                    error={formErrors[`payments.${index}.debit_target_account_id`]}
                                    required
                                >
                                    <AccountCombobox
                                        open={openStates[index]?.debit ?? false}
                                        onOpenChange={(v) => handleOpenChange(index, 'debit', v)}
                                        value={payment.debit_target_account_id}
                                        onSelect={(v) => {
                                            handlePaymentChange(index, 'debit_target_account_id', v);
                                            handleOpenChange(index, 'debit', false);
                                        }}
                                        accounts={specificBankAccounts}
                                        getAccountName={getAccountName}
                                        placeholder="Select Bank Account"
                                        searchPlaceholder="Search bank account..."
                                        error={!!formErrors[`payments.${index}.debit_target_account_id`]}
                                    />
                                </FormField>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addPayment} className="mt-4">
                        Add Payment
                    </Button>
                </FormSection>

                <FormSection title="Additional Notes" description="Add any relevant notes about this contract extension.">
                    <FormField label="Notes (Optional)" htmlFor="notes" error={formErrors.notes} labelClassName="pt-2" className="md:items-start">
                        <textarea
                            id="notes"
                            name="notes"
                            value={data.notes || ''}
                            onChange={handleInputChange}
                            rows={4}
                            className={cn(
                                'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                formErrors.notes && 'border-red-500',
                            )}
                            placeholder="Enter any rental-specific notes here..."
                            disabled={processing}
                        />
                    </FormField>

                    {/* Incharger Combobox */}
                    <FormField label="Staff Incharge" htmlFor="incharger_id" error={formErrors.incharger_id} required>
                        <EntityCombobox
                            items={users}
                            value={selectedInchargerName}
                            onChange={(name, id) => handleComboboxChange('incharger_id', name, id)}
                            processing={processing}
                            error={formErrors.incharger_id}
                            entityName="staff"
                        />
                    </FormField>
                </FormSection>
            </form>
        </div>
    );
}

export default ChangeVehicleInformation;
