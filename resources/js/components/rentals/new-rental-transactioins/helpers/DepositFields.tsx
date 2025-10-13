import { EnhancedDeposit } from '@/types/transaction-types';

interface DepositFieldsProps {
    deposit: EnhancedDeposit;
    index: number;
    // Renamed to setDepositValue in the mock for easier use
    setDepositValue: (index: number, key: keyof EnhancedDeposit, value: string | boolean) => void;
    removeDeposit: (index: number) => void;
    hasMultiple: boolean;
    errors: Record<string, string>;
}

export const DepositFields: React.FC<DepositFieldsProps> = ({ deposit, index, setDepositValue, removeDeposit, hasMultiple, errors }) => {
    // Construct the error key path for nested validation errors
    const getError = (key: keyof EnhancedDeposit) => errors[`activeDeposits.${index}.${key}`];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const depositKey = name as keyof EnhancedDeposit;

        if (type === 'checkbox' && name === 'is_primary') {
            const isChecked = (e.target as HTMLInputElement).checked;
            setDepositValue(index, depositKey, isChecked);
        } else {
            setDepositValue(index, depositKey, value);
        }
    };

    return (
        <div
            className={`mb-6 rounded-xl border p-4 shadow-md transition-all ${deposit.is_primary ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-white'}`}
        >
            <div className="mb-4 flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-700">
                    Deposit #{index + 1}{' '}
                    {deposit.is_primary && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">Primary</span>}
                </h3>
                {/* Only show the remove button if there are multiple deposits AND the current one is NOT primary */}
                {hasMultiple && !deposit.is_primary && (
                    <button
                        type="button"
                        onClick={() => removeDeposit(index)}
                        className="rounded-full p-2 text-red-600 transition duration-150 hover:bg-red-50"
                        title="Remove Deposit"
                    >
                        {/* Trash Icon */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M15 2H9l-.5 1h7L15 2z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Deposit Type */}
                <div className="space-y-1">
                    <label htmlFor={`deposit_type_${index}`} className="block text-sm font-medium text-gray-700">
                        Deposit Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        id={`deposit_type_${index}`}
                        name="deposit_type"
                        value={deposit.deposit_type}
                        onChange={handleChange}
                        className={`w-full border p-2 ${getError('deposit_type') ? 'border-red-400' : 'border-gray-300'} rounded-lg transition duration-150 focus:border-indigo-500 focus:ring-indigo-500`}
                    >
                        <option value="">Select Type</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Guarantee">Bank Guarantee</option>
                        <option value="Securities">Securities</option>
                    </select>
                    {getError('deposit_type') && <p className="mt-1 text-xs text-red-500">{getError('deposit_type')}</p>}
                </div>

                {/* Deposit Value */}
                <div className="space-y-1">
                    <label htmlFor={`deposit_value_${index}`} className="block text-sm font-medium text-gray-700">
                        Value ($)
                    </label>
                    <input
                        id={`deposit_value_${index}`}
                        type="number"
                        name="deposit_value"
                        value={deposit.deposit_value}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 transition duration-150 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                {/* Registered Number */}
                <div className="space-y-1">
                    <label htmlFor={`registered_number_${index}`} className="block text-sm font-medium text-gray-700">
                        Registered Number
                    </label>
                    <input
                        id={`registered_number_${index}`}
                        type="text"
                        name="registered_number"
                        value={deposit.registered_number}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 transition duration-150 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                    <label htmlFor={`expiry_date_${index}`} className="block text-sm font-medium text-gray-700">
                        Expiry Date
                    </label>
                    <input
                        id={`expiry_date_${index}`}
                        type="date"
                        name="expiry_date"
                        value={deposit.expiry_date}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 transition duration-150 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Description */}
            <div className="mt-4 space-y-1">
                <label htmlFor={`description_${index}`} className="block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea
                    id={`description_${index}`}
                    name="description"
                    value={deposit.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 p-2 transition duration-150 focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>

            {/* Is Primary Checkbox */}
            <div className="mt-4 flex items-center">
                <input
                    id={`is_primary_${index}`}
                    type="checkbox"
                    name="is_primary"
                    checked={deposit.is_primary}
                    onChange={handleChange}
                    // Prevent users from unchecking the primary status (if required by business logic)
                    disabled={deposit.is_primary}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                    htmlFor={`is_primary_${index}`}
                    className={`ml-2 text-sm font-medium ${deposit.is_primary ? 'text-indigo-600' : 'text-gray-700'}`}
                >
                    This is the primary deposit record
                </label>
            </div>
        </div>
    );
};
