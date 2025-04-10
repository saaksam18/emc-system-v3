import { Role, User } from '@/types'; // Use RoleObject if that's the type from backend, adjust if needed
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo } from 'react';

import InputError from '@/components/input-error'; // Assuming path is correct
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the structure for the form data
type UserFormData = {
    name: string;
    email: string;
    password?: string; // Password is optional for edit
    password_confirmation?: string;
    roles: string; // Stores the selected role NAME (single string)
};

// Define the props for the UserForm component
type UserFormProps = {
    mode: 'create' | 'edit';
    initialData: User | null;
    roles: Role[] | null | undefined;
    onSubmitSuccess: () => void;
};

export default function UserForm({ mode, initialData, roles, onSubmitSuccess }: UserFormProps) {
    // --- Log received props for debugging if needed ---
    // console.log('UserForm props:', { mode, initialData, roles });

    // --- Step 1: Calculate Initial Values ---
    // This useMemo hook determines the starting values for the form fields.
    // In 'edit' mode, it uses the 'initialData' prop (the user object).
    const initialFormValues: UserFormData = useMemo(
        () => ({
            name: mode === 'edit' && initialData ? initialData.name : '', // <-- Pre-fills name
            email: mode === 'edit' && initialData ? initialData.email : '', // <-- Pre-fills email
            password: '', // Password always starts empty
            password_confirmation: '', // Password confirmation always starts empty
            // Pre-fills role with the first assigned role, if available
            roles: mode === 'edit' && initialData?.role_names && initialData.role_names.length > 0 ? initialData.role_names[0] : '',
        }),
        [mode, initialData],
    );

    // --- Step 2: Initialize useForm ---
    // Inertia's useForm hook is initialized with the calculated initialFormValues.
    // The 'data' object returned by useForm holds the current state of the form fields.
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<UserFormData>(initialFormValues);

    // --- Step 3: Reset Form on Prop Changes ---
    // This useEffect ensures the form resets to the correct initial values
    // if the component re-renders with different 'mode' or 'initialData'.
    useEffect(() => {
        clearErrors();
        reset(initialFormValues); // Reset form state based on potentially new props
    }, [mode, initialData, reset, clearErrors, initialFormValues]);

    // Process roles for the dropdown (no changes needed here for pre-filling)
    const validRoleNames = useMemo<string[]>(() => {
        if (!Array.isArray(roles)) {
            return [];
        }
        return roles.map((role) => role?.name).filter((name): name is string => typeof name === 'string' && name !== '');
    }, [roles]);

    // Handle form submission (no changes needed here for pre-filling)
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        const options = {
            preserveScroll: true,
            preserveState: (pageErrors: any) => Object.keys(pageErrors).length > 0,
            onSuccess: () => {
                reset('password', 'password_confirmation');
                onSubmitSuccess();
            },
            onError: (pageErrors: any) => {
                console.error('Form submission error:', pageErrors);
            },
        };

        if (mode === 'edit' && initialData) {
            put(route('administrator.users.update', initialData.id), options);
        } else {
            post(route('administrator.users.register.store'), options);
        }
    };

    return (
        <form className="flex flex-col gap-4 py-4" onSubmit={submit}>
            {/* --- Step 4: Bind Input Values --- */}
            {/* Each input's 'value' prop is bound to the corresponding field in the 'data' object from useForm. */}
            {/* This ensures the input displays the current form state, including the initial values. */}

            {/* Name Input Field */}
            <div className="grid gap-1.5">
                <Label htmlFor={`${mode}-name`}>Name</Label>
                <Input
                    id={`${mode}-name`}
                    type="text"
                    required
                    autoFocus={mode === 'create'}
                    tabIndex={1}
                    autoComplete="name"
                    value={data.name} // <-- Displays data.name
                    onChange={(e) => setData('name', e.target.value)}
                    disabled={processing}
                    placeholder="Full name"
                    className={errors.name ? 'border-red-500' : ''}
                />
                <InputError message={errors.name} />
            </div>

            {/* Email Input Field */}
            <div className="grid gap-1.5">
                <Label htmlFor={`${mode}-email`}>Email address</Label>
                <Input
                    id={`${mode}-email`}
                    type="email"
                    required
                    tabIndex={2}
                    autoComplete="email"
                    value={data.email} // <-- Displays data.email
                    onChange={(e) => setData('email', e.target.value)}
                    disabled={processing}
                    placeholder="email@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                />
                <InputError message={errors.email} />
            </div>

            {/* Password Input Field */}
            <div className="grid gap-1.5">
                <Label htmlFor={`${mode}-password`}>Password</Label>
                <Input
                    id={`${mode}-password`}
                    type="password"
                    required={mode === 'create'}
                    tabIndex={3}
                    autoComplete="new-password"
                    value={data.password ?? ''} // <-- Displays data.password (starts empty)
                    onChange={(e) => setData('password', e.target.value)}
                    disabled={processing}
                    placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Password'}
                    className={errors.password ? 'border-red-500' : ''}
                />
                {mode === 'edit' && <p className="text-muted-foreground text-xs">Leave blank to keep the current password.</p>}
                <InputError message={errors.password} />
            </div>

            {/* Confirm Password Input Field */}
            <div className="grid gap-1.5">
                <Label htmlFor={`${mode}-password_confirmation`}>Confirm password</Label>
                <Input
                    id={`${mode}-password_confirmation`}
                    type="password"
                    required={mode === 'create' || !!data.password}
                    tabIndex={4}
                    autoComplete="new-password"
                    value={data.password_confirmation ?? ''} // <-- Displays data.password_confirmation (starts empty)
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    disabled={processing || (mode === 'edit' && !data.password)}
                    placeholder={mode === 'edit' ? 'Confirm new password (if changed)' : 'Confirm password'}
                    className={errors.password_confirmation ? 'border-red-500' : ''}
                />
                <InputError message={errors.password_confirmation} />
            </div>

            {/* Role Selection Field */}
            <div className="grid gap-1.5">
                <Label htmlFor={`${mode}-roles`}>Role</Label>
                <Select
                    name="roles"
                    required
                    value={data.roles} // <-- Displays data.roles (pre-filled with first role in edit mode)
                    onValueChange={(value) => setData('roles', value)}
                    disabled={processing || validRoleNames.length === 0}
                >
                    <SelectTrigger className="w-full" id={`${mode}-roles`} aria-label="Select Role">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Assign Role</SelectLabel>
                            {validRoleNames.map((roleName) => (
                                <SelectItem key={roleName} value={roleName}>
                                    {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                                </SelectItem>
                            ))}
                            {validRoleNames.length === 0 && (
                                <SelectItem value="no-roles" disabled>
                                    No roles available
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <InputError message={errors.roles} />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="mt-4 w-full gap-2" tabIndex={5} disabled={processing}>
                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Register User' : 'Save Changes'}
            </Button>
        </form>
    );
}
