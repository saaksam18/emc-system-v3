import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ChartOfAccountTypes, Vehicle } from '@/types';
import { EnhancedPayment, FormErrors, InitialFormValues, SetDataFunction } from '@/types/transaction-types';
import { Banknote, Check, ChevronsUpDown, CreditCard, DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

// --- Copied from sales-entry.tsx ---
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
// --- End of copied components ---

// --- Type Definitions ---
type PaymentType = 'cash' | 'bank' | 'credit';

interface PageProps {
    data: InitialFormValues;
    setData: SetDataFunction;
    selectedVehicleData: Vehicle | undefined;
    formErrors: FormErrors;
    chartOfAccounts: ChartOfAccountTypes[];
}

// --- Helper Components from sales-entry.tsx ---
const FormItem = ({ label, children, error, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) => (
    <div>
        <Label className="mb-1">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        {children}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

interface AccountComboboxProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onSelect: (value: string) => void;
    accounts: ChartOfAccountTypes[];
    getAccountName: (accountId: string, accounts: ChartOfAccountTypes[]) => string;
    placeholder: string;
    searchPlaceholder: string;
    error: boolean;
}

const AccountCombobox: React.FC<AccountComboboxProps> = ({
    open,
    onOpenChange,
    value,
    onSelect,
    accounts,
    getAccountName,
    placeholder,
    searchPlaceholder,
    error,
}) => (
    <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                    'dark:bg-background w-full justify-between overflow-auto',
                    !value && 'text-muted-foreground',
                    error && 'border-red-500',
                )}
            >
                {value ? getAccountName(value, accounts) : placeholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                    <CommandEmpty>No account found.</CommandEmpty>
                    <CommandGroup>
                        {accounts.map((account) => (
                            <CommandItem key={account.id} value={`${account.name} (${account.type})`} onSelect={() => onSelect(String(account.id))}>
                                <Check className={cn('mr-2 h-4 w-4', value === String(account.id) ? 'opacity-100' : 'opacity-0')} />
                                {account.name} ({account.type})
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
);
// --- End of Helper Components ---

function PaymentDetails({ data, setData, selectedVehicleData, formErrors, chartOfAccounts }: PageProps) {
    const [open, setOpen] = useState<Record<string, boolean>>({});
    console.log('selectedVehicleData', selectedVehicleData);
    useEffect(() => {
        const originalPayments = Array.isArray(data.payments) ? data.payments : [];

        // Start with manual payments, preserving their order.
        let newPayments = originalPayments.filter(
            (p) => p.description !== 'Extra helmet fee' && p.description !== 'Customer deposit',
        );

        // --- Manage Rental Payment Description ---
        if (selectedVehicleData && data.period > 0) {
            const dayText = data.period > 1 ? 'days' : 'day';
            const rentalDescription = `${selectedVehicleData.make} ${selectedVehicleData.model} New Rental ${data.period} ${dayText}`;
            // Update the first manual payment's description.
            if (newPayments.length > 0 && newPayments[0].description !== rentalDescription) {
                newPayments[0] = { ...newPayments[0], description: rentalDescription };
            }
        }

        // --- Manage Helmet Payment (Update, Add, or Remove) ---
        const helmetAmount = Number(data.helmet_amount);
        const helmetFee = 3 * (helmetAmount - 1);
        if (helmetAmount > 1) {
            const existingHelmetPayment = originalPayments.find((p) => p.description === 'Extra helmet fee');
            newPayments.push({
                // Preserve existing fields like accounts and payment type if user changed them
                ...(existingHelmetPayment || {}),
                id: existingHelmetPayment?.id || `helmet_${new Date().getTime()}`,
                description: 'Extra helmet fee',
                amount: String(helmetFee),
                credit_account_id: existingHelmetPayment?.credit_account_id || '',
                payment_type: existingHelmetPayment?.payment_type || 'cash',
                debit_target_account_id: existingHelmetPayment?.debit_target_account_id || '',
            });
        }

        // --- Manage Deposit Payment (Update, Add, or Remove) ---
        const depositValue = data.activeDeposits && data.activeDeposits.length > 0 ? Number(data.activeDeposits[0].deposit_value) : 0;
        if (depositValue > 0) {
            const existingDepositPayment = originalPayments.find((p) => p.description === 'Customer deposit');
            newPayments.push({
                ...(existingDepositPayment || {}),
                id: existingDepositPayment?.id || `deposit_${new Date().getTime()}`,
                description: 'Customer deposit',
                amount: String(depositValue),
                credit_account_id: existingDepositPayment?.credit_account_id || '',
                payment_type: existingDepositPayment?.payment_type || 'cash',
                debit_target_account_id: existingDepositPayment?.debit_target_account_id || '',
            });
        }

        // --- Compare and set data to avoid infinite loops ---
        if (JSON.stringify(originalPayments) !== JSON.stringify(newPayments)) {
            setData('payments', newPayments);
        }
    }, [data.payments, data.helmet_amount, data.activeDeposits, data.period, selectedVehicleData, setData]);

    const handleOpenChange = (name: string, value: boolean) => setOpen((prev) => ({ ...prev, [name]: value }));

    const handlePaymentChange = (index: number, key: keyof EnhancedPayment, value: string | PaymentType) => {
        const payments = Array.isArray(data.payments) ? data.payments : [];
        const updatedPayments = [...payments];
        updatedPayments[index] = {
            ...(updatedPayments[index] || {}),
            [key]: value,
        };
        setData('payments', updatedPayments);
    };

    const handleAmountChange = (index: number, value: string) => {
        // Allow only numbers and one decimal point.
        const numericValue = value.replace(/[^0-9.]/g, '');
        if (numericValue.split('.').length > 2) {
            return;
        }
        handlePaymentChange(index, 'amount', numericValue);
    };

    const addPayment = () => {
        const newPayment: EnhancedPayment = {
            id: `manual_${new Date().getTime()}`,
            description: '',
            amount: '',
            credit_account_id: '',
            payment_type: 'cash',
            debit_target_account_id: '',
        };
        setData('payments', [...(Array.isArray(data.payments) ? data.payments : []), newPayment]);
    };

    const removePayment = (index: number) => {
        const updatedPayments = [...(Array.isArray(data.payments) ? data.payments : [])];
        updatedPayments.splice(index, 1);
        setData('payments', updatedPayments);
    };

    const { incomeAccounts, specificBankAccounts, liabilityAccounts, getAccountName } = useMemo(() => {
        const incomeAccounts = (chartOfAccounts || []).filter((acc) => acc.type === 'Revenue');
        const specificBankAccounts = (chartOfAccounts || []).filter((acc) => acc.type === 'Asset' && acc.name.includes('Bank'));
        const liabilityAccounts = (chartOfAccounts || []).filter((acc) => acc.type === 'Liability');

        const getAccountName = (accountId: string, accounts: ChartOfAccountTypes[]) => {
            const account = accounts.find((acc) => String(acc.id) === accountId);
            return account ? `${account.name} (${account.type})` : 'Select account';
        };

        return { incomeAccounts, specificBankAccounts, liabilityAccounts, getAccountName };
    }, [chartOfAccounts]);
    console.log(data);
    return (
        <div className="space-y-6 rounded-xl">
            {selectedVehicleData && (
                <Card className="dark:bg-sidebar border-green-200 bg-green-50 dark:border-green-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-col">
                            <CardTitle className="flex items-center">
                                <DollarSign className="mr-2 h-5 w-5 text-green-500" />
                                Sales Record
                            </CardTitle>
                            <CardDescription className="w-full">Manually add and manage payment records for this transaction.</CardDescription>
                        </div>
                        <Button onClick={addPayment} size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Payment
                        </Button>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-6 p-6">
                        {(Array.isArray(data.payments) ? data.payments : []).map((payment, index) => (
                            <div key={payment.id || index} className="relative space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                                <FormItem label="Description" required>
                                    <Input
                                        type="text"
                                        placeholder="e.g., Rental Fee, Helmet Fee"
                                        value={payment.description}
                                        onChange={(e) => handlePaymentChange(index, 'description', e.target.value)}
                                        className="bg-white"
                                    />
                                </FormItem>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <FormItem label="Sale Amount ($)" required>
                                        <Input
                                            type="text"
                                            placeholder="e.g., 150.00"
                                            value={payment.amount}
                                            onChange={(e) => handleAmountChange(index, e.target.value)}
                                            className="bg-white"
                                        />
                                    </FormItem>
                                    <FormItem label="Income Account" required>
                                        <AccountCombobox
                                            open={open[`credit-${index}`] || false}
                                            onOpenChange={(v) => handleOpenChange(`credit-${index}`, v)}
                                            value={payment.credit_account_id || ''}
                                            onSelect={(v) => {
                                                handlePaymentChange(index, 'credit_account_id', v);
                                                handleOpenChange(`credit-${index}`, false);
                                            }}
                                            accounts={payment.description.toLowerCase().includes('deposit') ? liabilityAccounts : incomeAccounts}
                                            getAccountName={(id, accs) => getAccountName(id, accs)}
                                            placeholder="Select an Income Account"
                                            searchPlaceholder="Search income account..."
                                            error={false}
                                        />
                                    </FormItem>
                                </div>
                                <Separator />
                                <FormItem label="Payment Type">
                                    <RadioGroup
                                        value={payment.payment_type}
                                        onValueChange={(v: PaymentType) => handlePaymentChange(index, 'payment_type', v)}
                                        className="mt-1 flex flex-col justify-start space-x-4 lg:h-[38px] lg:flex-row"
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
                                </FormItem>

                                {['bank', 'credit'].includes(payment.payment_type) && (
                                    <FormItem label="Target Bank Account" required>
                                        <AccountCombobox
                                            open={open[`debit-${index}`] || false}
                                            onOpenChange={(v) => handleOpenChange(`debit-${index}`, v)}
                                            value={payment.debit_target_account_id || ''}
                                            onSelect={(v) => {
                                                handlePaymentChange(index, 'debit_target_account_id', v);
                                                handleOpenChange(`debit-${index}`, false);
                                            }}
                                            accounts={specificBankAccounts}
                                            getAccountName={(id, accs) => getAccountName(id, accs)}
                                            placeholder="Select Bank Account"
                                            searchPlaceholder="Search bank account..."
                                            error={false}
                                        />
                                    </FormItem>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                                    onClick={() => removePayment(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {(Array.isArray(data.payments) ? data.payments : []).length === 0 && (
                            <div className="text-center text-gray-500">No payments added yet. Click "Add Payment" to get started.</div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default PaymentDetails;
