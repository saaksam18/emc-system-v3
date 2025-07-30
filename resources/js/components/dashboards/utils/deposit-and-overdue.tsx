import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';

interface DepositAndOverdueProps {
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    label: string;
    content: string;
    [key: string]: any;
}

export default function DepositAndOverdue({ title, description, label, content }: DepositAndOverdueProps) {
    return (
        <div className="mt-4 flex h-5 items-center justify-between space-x-4 text-sm">
            <div>{label}</div>
            <Separator orientation="vertical" />
            <Badge variant="secondary">{content}</Badge>
        </div>
    );
}
