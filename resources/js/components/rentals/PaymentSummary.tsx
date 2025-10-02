// resources/js/components/rentals/PaymentSummary.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface PaymentSummaryProps {
    subTotal: number;
    tax: number;
    discount: number;
    totalPayable: number;
    onSubTotalChange: (value: number) => void;
    onTaxChange: (value: number) => void;
    onDiscountChange: (value: number) => void;
}

export function PaymentSummary({ subTotal, tax, discount, totalPayable, onSubTotalChange, onTaxChange, onDiscountChange }: PaymentSummaryProps) {
    return (
        <div className="mt-auto space-y-2 pt-4">
            <h5 className="text-md font-bold">Payment Summary</h5>
            <div className="flex items-center justify-between">
                <span>Sub Total</span>
                <div className="relative">
                    <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">$</span>
                    <Input
                        type="number"
                        value={subTotal}
                        onChange={(e) => onSubTotalChange(parseFloat(e.target.value) || 0)}
                        className="w-32 pr-4 pl-7 text-right"
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span>Tax</span>
                <div className="relative">
                    <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">$</span>
                    <Input
                        type="number"
                        value={tax}
                        onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
                        className="w-32 pr-4 pl-7 text-right"
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span>Discount</span>
                <div className="relative">
                    <span className="text-muted-foreground absolute inset-y-0 left-0 flex items-center pl-3">-$</span>
                    <Input
                        type="number"
                        value={discount}
                        onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                        className="w-32 pr-4 pl-8 text-right"
                    />
                </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
                <span>Total Payable</span>
                <span>${totalPayable.toLocaleString()}</span>
            </div>
            <Button className="mt-4 w-full">Proceed to Payment</Button>
        </div>
    );
}
