import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import DepositAndOverdue from './utils/deposit-and-overdue';

interface DepositAndOverdueCountSectionProps {
    depositAndOverdueData?: {
        overdueRentalsCount: number;
        numericDepositSum: number;
        textDepositCount: number;
    };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function DepositAndOverdueCountSection({ depositAndOverdueData }: DepositAndOverdueCountSectionProps) {
    // Provide a default object if depositAndOverdueData is undefined
    const initialDepositAndOverdueData = depositAndOverdueData || {
        overdueRentalsCount: 0,
        numericDepositSum: 0,
        textDepositCount: 0,
    };

    const overdueRentorsLabel = 'Overdue Rentors';
    const overdueRentorsCount = `${initialDepositAndOverdueData.overdueRentalsCount} Customers`;

    const moneyDepositLabel = 'Money Deposit';
    const moneyDepositCount = `$ ${initialDepositAndOverdueData.numericDepositSum}`;

    const depositLabel = 'Other Deposit';
    const depositCount = String(initialDepositAndOverdueData.textDepositCount);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rental Deposits & Overdue</CardTitle>
                <CardDescription>Overview of scooter rental deposits. Included any currencies other than USD, Passport, etc...</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <DepositAndOverdue label={overdueRentorsLabel} content={overdueRentorsCount} />
                <DepositAndOverdue label={moneyDepositLabel} content={moneyDepositCount} />
                <DepositAndOverdue label={depositLabel} content={depositCount} />
            </CardContent>
        </Card>
    );
}
