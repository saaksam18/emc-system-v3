// resources/js/components/rentals/RentalPopoverContent.tsx
import { SearchableCombobox } from '@/components/form/SearchableCombobox';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Customers, Vehicle } from '@/types';

interface RentalPopoverContentProps {
    customers: Customers[] | null;
    onOpenCreateRentalSheet: () => void;
    onOpenCreateCustomerSheet: () => void;
    onOpenChangeDepositSheet?: () => void; // Make the prop optional
    transactionType: string | null;
    onTransactionTypeChange: (type: string) => void;
    rentalPeriod: string | null;
    onRentalPeriodChange: (period: string) => void;
    selectedCustomerId: string;
    onSelectedCustomerIdChange: (id: string) => void;
    notes: string;
    onNotesChange: (notes: string) => void;
    customRentalPeriod: string;
    onCustomRentalPeriodChange: (period: string) => void;
    depositType: string | null;
    onDepositTypeChange: (type: string) => void;
    otherDeposit: string;
    onOtherDepositChange: (value: string) => void;
    availableVehicles: Vehicle[] | null;
    selectedVehicle: Vehicle | null;
    selectedAvailableVehicleId: string;
    onSelectedAvailableVehicleChange: (id: string) => void;
}

export function RentalPopoverContent({
    customers,
    onOpenCreateRentalSheet,
    onOpenCreateCustomerSheet,
    onOpenChangeDepositSheet,
    transactionType,
    onTransactionTypeChange,
    rentalPeriod,
    onRentalPeriodChange,
    selectedCustomerId,
    onSelectedCustomerIdChange,
    notes,
    onNotesChange,
    customRentalPeriod,
    onCustomRentalPeriodChange,
    depositType,
    onDepositTypeChange,
    otherDeposit,
    onOtherDepositChange,
    availableVehicles,
    selectedVehicle,
    selectedAvailableVehicleId,
    onSelectedAvailableVehicleChange,
}: RentalPopoverContentProps) {
    const customerOptions =
        customers?.map((customer) => ({
            value: customer.id.toString(),
            label: customer.name,
        })) || [];

    const isVehicleAvailable = availableVehicles?.some((v) => v.id === selectedVehicle?.id);

    return (
        <div className="space-y-6">
            {isVehicleAvailable && (
                <div>
                    <h4 className="text-sm leading-none font-medium">Customer</h4>
                    <div className="mt-2">
                        <SearchableCombobox
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={onSelectedCustomerIdChange}
                            placeholder="Select a customer"
                            onCreateClick={onOpenCreateCustomerSheet}
                        />
                    </div>
                </div>
            )}
            <div>
                <h4 className="text-sm leading-none font-medium">Transaction Type</h4>
                <div className="mt-2 grid grid-cols-2 gap-4">
                    {isVehicleAvailable && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="new-rental"
                                checked={transactionType === 'new-rental'}
                                onCheckedChange={() => onTransactionTypeChange('new-rental')}
                            />
                            <Label htmlFor="new-rental">New Rental</Label>
                        </div>
                    )}
                    {!isVehicleAvailable && (
                        <>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="extend-rental"
                                    checked={transactionType === 'extend-rental'}
                                    onCheckedChange={() => onTransactionTypeChange('extend-rental')}
                                />
                                <Label htmlFor="extend-rental">Extension</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="change-vehicle"
                                    checked={transactionType === 'change-vehicle'}
                                    onCheckedChange={() => onTransactionTypeChange('change-vehicle')}
                                />
                                <Label htmlFor="change-vehicle">Change Vehicle</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="change-deposit"
                                    checked={transactionType === 'change-deposit'}
                                    onCheckedChange={() => {
                                        onTransactionTypeChange('change-deposit');
                                        if (onOpenChangeDepositSheet) {
                                            onOpenChangeDepositSheet();
                                        }
                                    }}
                                />
                                <Label htmlFor="change-deposit">Change Deposit</Label>
                            </div>
                        </>
                    )}
                </div>
                {transactionType === 'change-vehicle' && (
                    <div className="mt-4">
                        <h4 className="text-sm leading-none font-medium">New Vehicle</h4>
                        <div className="mt-2">
                            <SearchableCombobox
                                options={
                                    availableVehicles?.map((v) => ({
                                        value: v.id.toString(),
                                        label: `NO-${v.vehicle_no}`,
                                    })) || []
                                }
                                value={selectedAvailableVehicleId}
                                onChange={onSelectedAvailableVehicleChange}
                                placeholder="Select a new vehicle"
                            />
                        </div>
                    </div>
                )}
            </div>
            {(transactionType === 'new-rental' || transactionType === 'extend-rental') && (
                <div>
                    <h4 className="text-sm leading-none font-medium">Period</h4>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="1w-rental"
                                checked={rentalPeriod === '1w-rental'}
                                onCheckedChange={() => onRentalPeriodChange('1w-rental')}
                            />
                            <Label htmlFor="1w-rental">1W Rental</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="2w-rental"
                                checked={rentalPeriod === '2w-rental'}
                                onCheckedChange={() => onRentalPeriodChange('2w-rental')}
                            />
                            <Label htmlFor="2w-rental">2W Rental</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="3w-rental"
                                checked={rentalPeriod === '3w-rental'}
                                onCheckedChange={() => onRentalPeriodChange('3w-rental')}
                            />
                            <Label htmlFor="3w-rental">3W Rental</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="1m-rental"
                                checked={rentalPeriod === '1m-rental'}
                                onCheckedChange={() => onRentalPeriodChange('1m-rental')}
                            />
                            <Label htmlFor="1m-rental">1M Rental</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="custom-rental"
                                checked={rentalPeriod === 'custom'}
                                onCheckedChange={() => onRentalPeriodChange('custom')}
                            />
                            <Label htmlFor="custom-rental">Custom</Label>
                        </div>
                    </div>
                    {rentalPeriod === 'custom' && (
                        <div className="mt-2">
                            <Input
                                placeholder="e.g., 3 days, 2 weeks"
                                value={customRentalPeriod}
                                onChange={(e) => onCustomRentalPeriodChange(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            )}
            {isVehicleAvailable && (
                <div>
                    <h4 className="text-sm leading-none font-medium">Rental Deposit</h4>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="deposit-passport"
                                checked={depositType === 'passport'}
                                onCheckedChange={() => onDepositTypeChange('passport')}
                            />
                            <Label htmlFor="deposit-passport">Passport</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="deposit-money"
                                checked={depositType === 'money'}
                                onCheckedChange={() => onDepositTypeChange('money')}
                            />
                            <Label htmlFor="deposit-money">Money</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="deposit-other"
                                checked={depositType === 'other'}
                                onCheckedChange={() => onDepositTypeChange('other')}
                            />
                            <Label htmlFor="deposit-other">Other</Label>
                        </div>
                    </div>
                    {(depositType === 'money' || depositType === 'other') && (
                        <div className="mt-2">
                            <Input
                                placeholder={depositType === 'money' ? 'Enter amount' : 'Specify other deposit'}
                                value={otherDeposit}
                                onChange={(e) => onOtherDepositChange(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            )}
            <div>
                <h4 className="text-sm leading-none font-medium">Notes</h4>
                <div className="mt-2">
                    <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="Add a note..." />
                </div>
            </div>
            <div>
                <Button variant="default" className="w-full" onClick={onOpenCreateRentalSheet}>
                    Proceed
                </Button>
            </div>
        </div>
    );
}