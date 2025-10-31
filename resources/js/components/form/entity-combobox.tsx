import { useMemo } from 'react';
import { SearchableCombobox } from './SearchableCombobox';

interface EntityComboboxProps<T extends { id: number; name: string }> {
    items: T[] | null;
    value: string;
    onChange: (value: string, id: number | null) => void;
    processing: boolean;
    error?: string;
    entityName: string;
}

export function EntityCombobox<T extends { id: number; name: string }>({
    items,
    value,
    onChange,
    processing,
    error,
    entityName,
}: EntityComboboxProps<T>) {
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
