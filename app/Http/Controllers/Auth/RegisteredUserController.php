<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

use Spatie\Permission\Models\Role;

class RegisteredUserController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        $this->authorize('user-create');
        $roles = Role::all();
        return Inertia::render('auth/register', [
            'roles' => Inertia::defer(fn () => $roles),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('user-create');
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'roles' => 'required'
        ]);

        $userId = Auth::id();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'inputer' => $userId,
        ]);
        $user->assignRole($request->input('roles'));

        event(new Registered($user));

        $success = $request->name . ' successfuly registered.';

        return to_route('administrator.users.index')->with('success', $success);
    }
}
