<?php

namespace App\Http\Controllers\Internals;

// Model
use App\Models\User;
use App\Models\Role as RoleModel;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password; // For more robust password rules
use Illuminate\Support\Facades\Validator; // Using Validator facade
use Illuminate\Support\Arr;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
// Optional: Import Collection for type hinting
use Illuminate\Database\Eloquent\Collection;

class UserController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('user-list');

        // Eager load the 'creator' relationship to avoid N+1 queries
        $users = User::with('creator')->get(); // Use get() to fetch the collection
        $roles = Role::all();

        // Map the collection to the desired format for the view
        $formattedUsers = $users->map(function (User $user) { // Map the retrieved collection
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                // Access the creator's name via the relationship
                // Use the nullsafe operator (?->) to safely access 'name'
                // Provide a default 'N/A' if 'creator' is null or doesn't exist
                'user_name' => $user->creator?->name ?? 'Initial',
                'role_names' => $user->roles->pluck('name')->all() ?? [],
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];
        }); // Add semicolon here

        return Inertia::render('auth/user-index', [
            'users' => Inertia::defer(fn () => $formattedUsers),
            'roles' => Inertia::defer(fn () => $roles),
        ]);
    }

    public function updateUser(Request $request, $id)
    {
        // 1. Authorization (Keep as is)
        $this->authorize('user-edit');

        // 2. Find the user or fail
        $user = User::findOrFail($id);

        // 3. Validation Rules
        $request->validate([
            'name' => 'required|string|max:255',
            // Email unique check ignores the current user ID - this is correct!
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            // Password validation:
            // - 'nullable': Makes it optional
            // - 'confirmed': Requires password_confirmation field if password is not empty
            // - Optional: Use Password::defaults() for default complexity rules
            'password' => ['nullable', 'confirmed', Password::defaults()],
            // Role validation:
            // - 'required': Ensure a role is selected
            // - 'string': Ensure it's a string (role name)
            // - 'exists:roles,name': Check if the role name exists in the 'roles' table 'name' column
            //   (Adjust 'roles,name' if using IDs or different table/column names)
            'roles' => 'required|string|exists:roles,name'
        ]);

        // 4. Prepare Input Data
        $input = $request->except(['password', 'password_confirmation']); // Exclude password fields initially

        // Hash password only if a new one is provided
        if ($request->filled('password')) {
            $input['password'] = Hash::make($request->input('password'));
        }
        // Note: If password was not filled, it's already excluded from $input

        // 5. Update User Model
        $user->update($input);

        // 6. Sync Roles (Recommended if using Spatie Permissions)
        // This automatically handles attaching the new role(s) and detaching old ones.
        // Assumes 'roles' input is a single role name string (as per UserForm)
        // If 'roles' could be an array, syncRoles handles that too.
        $user->syncRoles($request->input('roles'));

        /* --- Alternative: Manual Role Handling (if not using Spatie syncRoles) ---
        if ($request->filled('roles')) { // Check if roles input is present
             DB::table('model_has_roles')->where('model_id', $user->id)->delete(); // Delete old roles
             $user->assignRole($request->input('roles')); // Assign new role(s)
        }
        */


        // 7. Redirect with Success Message
        return redirect()->route('administrator.users.index') // Consider redirecting to user show page? ('users.show', $user->id)
                        ->with('success', 'User updated successfully');
    }

    public function destroyAdmin(Request $request, User $user): RedirectResponse
    {
        // 1. Authorize: Ensure the authenticated user has permission to delete users.
        //    Throws AuthorizationException if fails.
        $this->authorize('user-delete'); // Assumes 'user-delete' policy or gate exists

        // 2. Optional: Prevent admin from deleting their own account via this method.
        if (Auth::id() === $user->id) {
            // Redirect back with a general error message.
            // Using 'password' key might be confusing here, so use a different one or a general flash message.
             return back()->withErrors(['password' => 'Administrators cannot delete their own account through this interface.']);
            // Or use a general flash message:
            // return redirect()->back()->with('error', 'Administrators cannot delete their own account through this interface.');
        }

        // 3. Validate Input: Check if the password field exists.
        //    Using Validator facade for more control over the response.
        $validator = Validator::make($request->all(), [
            'password' => 'required|string', // Ensure password is required
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            // Redirect back with validation errors. Inertia's useForm will automatically
            // populate the `errors` object based on the keys in the error bag.
            return back()->withErrors($validator)->withInput();
        }

        // 4. Verify Administrator Password: Check the submitted password against the logged-in admin's hash.
        $admin = Auth::user(); // Get the currently authenticated administrator user.

        // Ensure we have an authenticated admin user
        if (!$admin) {
             return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
        }

        // Check the provided password against the admin's stored hashed password.
        if (!Hash::check($request->input('password'), $admin->password)) {
            // If the password doesn't match, redirect back with a specific error
            // message attached to the 'password' field. Inertia's useForm `onError`
            // callback will receive this error under the `password` key.
            return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
        }

        // 5. Delete User: If authorization and password verification pass, delete the user.
        try {
            $user->delete();
        } catch (\Exception $e) {
            // Handle potential deletion errors (e.g., database constraints)
            report($e); // Log the exception
            return back()->withErrors(['password' => 'Could not delete the user due to a server error.']);
        }


        // 6. Redirect Back on Success:
        //    Inertia's `onSuccess` callback in the frontend component will be triggered.
        //    No specific success message needed here via `with()`, as the frontend handles it.
        return redirect()->back();

        // Optionally, you could add a generic success message if needed for non-Inertia requests
        // or other parts of your application:
        // return redirect()->back()->with('success', "User '{$user->name}' deleted successfully.");
    }

    // Roles
    public function roleIndex(Request $request): Response
    {
        $this->authorize('role-list');

        // Fetch roles with their permissions eager-loaded
        $roles = RoleModel::with('permissions')->get(); // Use with() for eager loading and get()
        $permissions = Permission::all();

        // Map the collection to the desired format for the view
        $formattedRoles = $roles->map(function (RoleModel $role) { // Map the retrieved collection
            return [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'user_name' => $role->creator?->name ?? 'Initial',
                'permission_names' => $role->permissions->pluck('name')->all() ?? [],
                'created_at' => $role->created_at,
                'updated_at' => $role->updated_at,
            ];
        });
        return Inertia::render('auth/roles', [
            'roles' => Inertia::defer(fn () => $formattedRoles),
            'permissions' => Inertia::defer(fn () => $permissions),
        ]);
    }

    public function roleCreate(): Response
    {
        $this->authorize('role-create');
        $permissions = Permission::all();
        return Inertia::render('auth/role-register', [
            'permissions' => Inertia::defer(fn () => $permissions),
        ]);
    }

    public function roleStore(Request $request): RedirectResponse
    {
        // 1. Authorize the action
        $this->authorize('role-create'); // Good practice to authorize first

        // 2. Validate the incoming request data
        $validatedData = $this->validate($request, [
            'name' => 'required|unique:roles,name',
            'permissions' => ['required', 'array'], // Ensure 'permissions' is an array
            'permissions.*' => [ // Validate each item within the 'permissions' array
                'required',
                'string',
                Rule::exists(Permission::class, 'name') // Ensure each string exists as a permission name
            ],
        ]);

        // 3. Create the role, including the creator's ID
        $role = Role::create([
            'name' => $validatedData['name'],
            'guard_name' => 'web', // Default guard, adjust if necessary
            'user_id' => Auth::id(), // <-- Get the authenticated user's ID
        ]);

        // 4. Sync permissions using the validated data
        // syncPermissions accepts an array of permission names
        $role->syncPermissions($validatedData['permissions']);

        // 5. Prepare success message (corrected typo)
        $success = 'Role ' . $validatedData['name'] . ' successfully registered.';

        // 6. Redirect back to the index page with success message
        return to_route('administrator.roles.index')->with('success', $success);
    }
    
    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function updateRole(Request $request, Role $role)
    {
        // 1. Authorize the action
        $this->authorize('role-edit');

        // 2. Validate the incoming request data
        $validatedData = $this->validate($request, [
            // Correct unique rule: ignore the current role's ID
            'name' => [
                'required',
                'string',
                Rule::unique('roles', 'name')->ignore($role->id)
            ],
            'permissions' => ['required', 'array'],
            'permissions.*' => [
                'required',
                'string',
                Rule::exists(Permission::class, 'name')
            ],
        ]);

        // 3. Update Role Name (Role model already found by Route Model Binding)
        // Ensure 'name' is in the $fillable array in your Role model for update()
        $role->update([
            'name' => $validatedData['name']
        ]);

        // 4. Sync Permissions
        $role->syncPermissions($validatedData['permissions']);

        // 5. Redirect
        return to_route('administrator.roles.index')->with('success', 'Role updated successfully');
    }

    public function destroyRole(Request $request, Role $role): RedirectResponse
    {

        $this->authorize('role-delete'); 

        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $admin = Auth::user();

        if (!$admin) {
             return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
        }

        if (!Hash::check($request->input('password'), $admin->password)) {
            return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
        }

        try {
            $role->delete();
        } catch (\Exception $e) {
            report($e);
            return back()->withErrors(['password' => 'Could not delete the user due to a server error.']);
        }

        return redirect()->back();
    }
}
