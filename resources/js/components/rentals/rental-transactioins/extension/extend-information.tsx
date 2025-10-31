import { AccountCombobox } from '@/components/form/AccountCombobox';
import { EntityCombobox } from '@/components/form/entity-combobox';
import { FormField } from '@/components/form/FormField';
import { FormSection } from '@/components/form/FormSection';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChartOfAccountTypes, PaymentType, RentalsType, Vehicle } from '@/types';
import { ExtendContractFormValues, FormErrors, SaleItem, useAccountHelpers, useLookupName } from '@/types/transaction-types';
import { InertiaFormProps } from '@inertiajs/react';
import { addDays, differenceInDays, format, isValid, parseISO } from 'date-fns';
import { Banknote, CalendarIcon, CreditCard, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const parseDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    // Using parseISO is safer for 'yyyy-MM-dd' strings to avoid timezone issues.
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
};

const calculatePeriod = (startDateStr: string, endDateStr: string): number => {
    if (!startDateStr || !endDateStr) return 0;
    const startDate = parseDateString(startDateStr);
    const endDate = parseDateString(endDateStr);

    if (!startDate || !endDate || endDate < startDate) return 0;

    const diffDays = differenceInDays(endDate, startDate);
    return diffDays >= 0 ? diffDays : 0;
};

// --- Main Component ---
interface ExtendContractProps {
    data: ExtendContractFormValues;
    setData: InertiaFormProps<ExtendContractFormValues>['setData'];
    formErrors: FormErrors;
    clearErrors: (fields?: keyof ExtendContractFormValues | (keyof ExtendContractFormValues)[]) => void;
    selectedRow: RentalsType | null;
    selectedVehicle: Vehicle | null;
    chartOfAccounts: ChartOfAccountTypes[];
    users: { id: number; name: string }[];
    processing: boolean;
    handleComboboxChange: (field: keyof ExtendContractFormValues, value: string, id: number | null) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ExtendInformation({
    data,
    setData,
    formErrors,
    clearErrors,
    processing,
    selectedRow,
    chartOfAccounts,
    users,
    handleComboboxChange,
    handleInputChange,
}: ExtendContractProps) {
    const selectedInchargerName = useLookupName(users, data.incharger_id);
    const { incomeAccounts, specificBankAccounts, getAccountName } = useAccountHelpers({ chartOfAccounts });

    // State for Dialogs
    const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
    const [endDateDialogOpen, setEndDateDialogOpen] = useState(false);
    const [comingDateDialogOpen, setComingDateDialogOpen] = useState(false);
    const [openStates, setOpenStates] = useState([{ income: false, debit: false }]);

    useEffect(() => {
        if (data.payments.length !== openStates.length) {
            setOpenStates(data.payments.map(() => ({ income: false, debit: false })));
        }
    }, [data.payments.length, data.payments, openStates.length]);

    const handleOpenChange = (index: number, name: 'income' | 'debit', value: boolean) => {
        const newOpenStates = [...openStates];
        newOpenStates[index] = { ...newOpenStates[index], [name]: value };
        setOpenStates(newOpenStates);
    };

    const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const periodValue = e.target.value;

        setData((prev) => {
            const newData = { ...prev, period: periodValue };
            const periodDays = parseInt(periodValue, 10);
            const startDate = parseDateString(prev.start_date);

            if (startDate && isValid(startDate) && !isNaN(periodDays) && periodDays >= 0) {
                const newEndDate = addDays(startDate, periodDays);
                newData.end_date = format(newEndDate, 'yyyy-MM-dd');
            }
            return newData;
        });

        if (formErrors.period) clearErrors('period');
        if (formErrors.end_date) clearErrors('end_date');
    };

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

    const handleDateChange = (field: 'start_date' | 'end_date' | 'coming_date', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

        setData((prev) => {
            const newData = { ...prev };
            newData[field] = formattedDate;

            // If end_date or start_date changes, recalculate period
            if (field === 'end_date' || field === 'start_date') {
                const newPeriod = calculatePeriod(
                    field === 'start_date' ? formattedDate : prev.start_date,
                    field === 'end_date' ? formattedDate : prev.end_date,
                );
                newData.period = String(newPeriod);
            }

            // If start_date changes, clear dependent dates if they are now invalid
            if (field === 'start_date') {
                const newStartDate = parseDateString(formattedDate);
                if (newStartDate) {
                    const endDate = parseDateString(prev.end_date);
                    if (endDate && endDate < newStartDate) {
                        newData.end_date = '';
                        newData.period = '0'; // Also reset period
                    }
                    const comingDate = parseDateString(prev.coming_date);
                    if (comingDate && comingDate < newStartDate) {
                        newData.coming_date = '';
                    }
                }
            }

            return newData;
        });

        if (formErrors[field]) {
            clearErrors(field);
        }

        if (field === 'start_date') setStartDateDialogOpen(false);
        if (field === 'end_date') setEndDateDialogOpen(false);
        if (field === 'coming_date') setComingDateDialogOpen(false);
    };

    if (!selectedRow) {
        return <div className="text-muted-foreground flex h-40 items-center justify-center px-4">No rental selected for processing.</div>;
    }

    return (
        <div className="px-4">
            <form className="space-y-4">
                <FormSection title="Rental Details" description="Update the dates, period, cost, and responsible user.">
                    <FormField label="Start Date" htmlFor="start_date" error={formErrors.start_date} required>
                        <Popover open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="start_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.start_date && 'text-muted-foreground',
                                        formErrors.start_date && 'border-red-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.start_date && isValid(parseDateString(data.start_date)!) ? (
                                        format(parseDateString(data.start_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.start_date)}
                                    onSelect={(date) => handleDateChange('start_date', date)}
                                    initialFocus
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
                    </FormField>

                    <FormField label="End Date" htmlFor="end_date" error={formErrors.end_date} required>
                        <Popover open={endDateDialogOpen} onOpenChange={setEndDateDialogOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="end_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.end_date && 'text-muted-foreground',
                                        formErrors.end_date && 'border-red-500',
                                    )}
                                    disabled={!data.start_date || !isValid(parseDateString(data.start_date)!)}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.end_date && isValid(parseDateString(data.end_date)!) ? (
                                        format(parseDateString(data.end_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.end_date)}
                                    onSelect={(date) => handleDateChange('end_date', date)}
                                    disabled={(date) => {
                                        const startDate = parseDateString(data.start_date);
                                        return startDate ? date < startDate : false;
                                    }}
                                    initialFocus
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
                    </FormField>

                    <FormField label="Period (days)" htmlFor="period" error={formErrors.period} required>
                        <Input
                            id="period"
                            name="period"
                            type="number"
                            min="0"
                            value={data.period}
                            onChange={handlePeriodChange}
                            placeholder="e.g., 30"
                            className={cn(formErrors.period && 'border-red-500')}
                            disabled={!data.start_date}
                        />
                    </FormField>

                    <FormField label="Coming Date (Optional)" htmlFor="coming_date" error={formErrors.coming_date}>
                        <Popover open={comingDateDialogOpen} onOpenChange={setComingDateDialogOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    id="coming_date"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.coming_date && 'text-muted-foreground',
                                        formErrors.coming_date && 'border-red-500',
                                    )}
                                    disabled={!data.start_date || !isValid(parseDateString(data.start_date)!)}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.coming_date && isValid(parseDateString(data.coming_date)!) ? (
                                        format(parseDateString(data.coming_date)!, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={parseDateString(data.coming_date)}
                                    onSelect={(date) => handleDateChange('coming_date', date)}
                                    disabled={(date) => {
                                        const startDate = parseDateString(data.start_date);
                                        return startDate ? date < startDate : false;
                                    }}
                                    initialFocus
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
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
