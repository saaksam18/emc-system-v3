import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useCallback, useEffect, useMemo } from 'react';

import InputError from '@/components/input-error'; // Assuming this path is correct
import { Button } from '@/components/ui/button'; // Assuming this path is correct
import { Checkbox } from '@/components/ui/checkbox'; // Assuming this path is correct
import { Input } from '@/components/ui/input'; // Assuming this path is correct
import { Label } from '@/components/ui/label'; // Assuming this path is correct
import { Separator } from '@/components/ui/separator'; // Assuming this path is correct
import { Role } from '@/types'; // Assuming this path is correct

// Define the structure for the form data
type RoleRegisterForm = {
    name: string;
    permissions: string[]; // Ensure this is an array of strings
};

// Define the structure of a Permission object coming from the backend
type PermissionObject = {
    id: number;
    name: string;
    guard_name: string;
    created_at?: string;
    updated_at?: string;
};

// Define the props for the Register component
type RegisterFormPageProps = {
    mode: 'create' | 'edit';
    initialData: Role | null;
    permissions: PermissionObject[] | null | undefined;
    onSubmitSuccess: () => void;
};

// Helper function to format group titles (e.g., 'user-list' -> 'User')
function formatGroupTitle(name: string): string {
    if (!name) return 'Other';
    const prefix = name.split(/[-_]/)[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

// Helper function to format permission action labels (e.g., 'user-list' -> 'List')
function formatPermissionLabel(name: string): string {
    if (!name) return '';
    const parts = name.split(/[-_]/);
    const action = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return action.charAt(0).toUpperCase() + action.slice(1);
}

export default function RoleRegister({ mode, initialData, onSubmitSuccess, permissions = [] }: RegisterFormPageProps) {
    const initialFormValues: RoleRegisterForm = useMemo(() => {
        const values = {
            name: mode === 'edit' && initialData ? initialData.name : '',
            permissions: mode === 'edit' && initialData?.permission_names ? [...initialData.permission_names] : [],
        };
        return values;
    }, [mode, initialData]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<RoleRegisterForm>(initialFormValues);

    useEffect(() => {
        clearErrors();
        reset(initialFormValues);
    }, [mode, initialData, reset, clearErrors, initialFormValues]);

    const validPermissions = useMemo(
        () => (permissions || []).filter((p): p is PermissionObject => p && typeof p.id === 'number' && typeof p.name === 'string' && p.name !== ''),
        [permissions],
    );

    const groupedPermissions = useMemo(() => {
        const groups: Record<string, PermissionObject[]> = {};
        validPermissions.forEach((permission) => {
            const groupKey = permission.name.split(/[-_]/)[0] || 'other';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(permission);
        });
        const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'other') return 1;
            if (b === 'other') return -1;
            return a.localeCompare(b);
        });
        return sortedGroupKeys.map((key) => [key, groups[key]]) as [string, PermissionObject[]][];
    }, [validPermissions]);

    const handlePermissionChange = useCallback(
        (checked: boolean | string, permissionName: string) => {
            let updatedPermissions: string[];
            if (checked === true) {
                updatedPermissions = [...new Set([...data.permissions, permissionName])];
            } else {
                updatedPermissions = data.permissions.filter((p) => p !== permissionName);
            }
            setData('permissions', updatedPermissions);
        },
        [data.permissions, setData],
    );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const options = {
            preserveScroll: true,
            preserveState: (pageErrors: any) => Object.keys(pageErrors).length > 0,
            onSuccess: () => {
                onSubmitSuccess();
            },
            onError: (pageErrors: any) => {
                console.error('[RoleRegister Debug] Form submission error:', pageErrors);
            },
        };

        if (mode === 'edit' && initialData) {
            put(route('administrator.roles.update', initialData.id), options);
        } else {
            post(route('administrator.roles.register.store'), options);
        }
    };

    return (
        <form className="mt-6 flex flex-col gap-6" onSubmit={submit}>
            <div className="grid gap-6">
                {/* Role Name Input Field */}
                <div className="grid gap-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                        id="name"
                        type="text"
                        required
                        autoFocus
                        tabIndex={1}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing}
                        placeholder="e.g., Administrator, Editor"
                    />
                    <InputError message={errors.name} className="mt-1" />
                </div>

                {/* Permissions Checkbox Groups Section */}
                <div className="grid gap-2">
                    <Label>Permissions</Label>
                    <p className="text-muted-foreground text-sm">Select the permissions to assign to this role.</p>
                    <div className="space-y-6 rounded-md border p-4">
                        {groupedPermissions.length > 0 ? (
                            groupedPermissions.map(([groupKey, permissionsInGroup], index) => (
                                <div key={groupKey} className="space-y-3">
                                    {index > 0 && <Separator />}
                                    <Label className="text-base font-semibold">{formatGroupTitle(groupKey)} Management</Label>
                                    <div className="flex flex-row flex-wrap items-center gap-x-12 gap-y-2">
                                        {permissionsInGroup.map((permission) => {
                                            // --- DEBUG LOG: Log checkbox check ---
                                            const isChecked = data.permissions.includes(permission.name);
                                            return (
                                                <div key={permission.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`permission-${permission.id}`}
                                                        checked={isChecked} // Use the calculated value
                                                        onCheckedChange={(checked) => handlePermissionChange(checked, permission.name)}
                                                        disabled={processing}
                                                        tabIndex={2}
                                                    />
                                                    <Label
                                                        htmlFor={`permission-${permission.id}`}
                                                        className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {formatPermissionLabel(permission.name)}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No permissions available.</p>
                        )}
                    </div>
                    <InputError message={errors.permissions} className="mt-1" />
                </div>

                {/* Submit Button */}
                <Button type="submit" className="mt-2 w-full gap-2" tabIndex={3} disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {mode === 'edit' ? 'Update Role' : 'Register Role'}
                </Button>
            </div>
        </form>
    );
}
