<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RegistrationOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated.',
                'errors' => [
                    'email' => ['Your account has been deactivated.'],
                ],
            ], 422);
        }

        if ($user->is_blocked) {
            return response()->json([
                'message' => 'Your account has been blocked. Please contact support for assistance.',
                'errors' => [
                    'email' => ['Your account has been blocked.'],
                ],
            ], 422);
        }

        if ($user->isPasswordExpired()) {
            return response()->json([
                'message' => 'Your password has expired. Please change it to continue.',
                'error_code' => 'PASSWORD_EXPIRED',
                'requires_password_change' => true,
                'email' => $user->email,
            ], 422);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $userData = $this->appendSessionFlagsToUserPayload($request, $user->fresh()->toArray(), $user);

        return response()->json([
            'user' => $userData,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->tokens()->delete();
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $data = $this->appendSessionFlagsToUserPayload($request, $user->toArray(), $user);

        return response()->json($data);
    }

    /**
     * Records server-side consent to open the main app while verification is still pending (onboarding UX).
     * Stored in session so it cannot be forged from another browser tab via client-only storage.
     */
    public function acknowledgeUnverifiedDashboard(Request $request)
    {
        $user = $request->user();
        $roles = ['ngo', 'donor_institution', 'donor_individual', 'requestor'];
        if (! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Not applicable for this account type.'], 422);
        }

        $request->session()->put('allow_unverified_dashboard', true);

        $data = $this->appendSessionFlagsToUserPayload($request, $user->fresh()->toArray(), $user);

        return response()->json(['user' => $data]);
    }

    /**
     * @param  array<string, mixed>  $userData
     * @return array<string, mixed>
     */
    private function appendSessionFlagsToUserPayload(Request $request, array $userData, User $user): array
    {
        $userData['is_super_admin'] = $user->isSuperAdmin();

        if ($user->is_verified) {
            $request->session()->forget('allow_unverified_dashboard');
        }

        $userData['allow_unverified_dashboard_access'] = (bool) $request->session()->get('allow_unverified_dashboard', false);

        return $userData;
    }

    /**
     * Change expired password (public - no auth required).
     * User must provide current password to verify identity.
     */
    public function changeExpiredPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        if (! $user->isPasswordExpired()) {
            return response()->json([
                'message' => 'Your password has not expired. Use the normal change password flow.',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ])->save();

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $userData = $this->appendSessionFlagsToUserPayload($request, $user->fresh()->toArray(), $user);

        return response()->json([
            'message' => 'Password changed successfully.',
            'user' => $userData,
        ]);
    }

    /**
     * Change password (protected - requires auth).
     * For users who want to change password from settings.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ])->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Send a 6-digit OTP for signup to the chosen channel (email or SMS).
     */
    public function sendRegistrationOtp(Request $request, RegistrationOtpService $otpService)
    {
        $validated = $request->validate([
            'email' => 'required|string|email|max:255|unique:users,email',
            'otp_channel' => 'required|in:email,sms',
            'phone' => 'required_if:otp_channel,sms|nullable|string|max:30',
        ]);

        $channel = $validated['otp_channel'];
        $email = $validated['email'];
        $phone = $validated['phone'] ?? null;

        if ($channel === 'sms') {
            $normalized = $otpService->normalizeGhanaPhone($phone ?? '');
            if (! $normalized) {
                throw ValidationException::withMessages([
                    'phone' => ['Enter a valid Ghana phone number (e.g. 0241234567 or +233241234567).'],
                ]);
            }
        }

        $otp = $otpService->generateAndStore($channel, $email, $phone);

        if ($channel === 'email') {
            $otpService->sendEmailOtp($email, $otp);
        } else {
            $normalized = $otpService->normalizeGhanaPhone($phone ?? '');
            try {
                $otpService->sendSmsOtp($normalized, $otp);
            } catch (\Throwable $e) {
                report($e);

                return response()->json([
                    'message' => $e->getMessage() !== ''
                        ? $e->getMessage()
                        : 'Could not send verification SMS. Please try again later.',
                ], 503);
            }
        }

        return response()->json([
            'message' => $channel === 'email'
                ? 'We sent a verification code to your email.'
                : 'We sent a verification code to your phone.',
            'otp_channel' => $channel,
        ]);
    }

    public function register(Request $request, RegistrationOtpService $otpService)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:requestor,ngo,donor_institution,donor_individual,angel_donor',
            'organization' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'otp_channel' => 'required|in:email,sms',
            'otp' => 'required|string|size:6|regex:/^[0-9]{6}$/',
        ]);

        $channel = $request->otp_channel;
        $phone = $request->phone;

        if ($channel === 'sms') {
            $request->validate([
                'phone' => 'required|string|max:30',
            ]);
            if (! $otpService->normalizeGhanaPhone($phone)) {
                throw ValidationException::withMessages([
                    'phone' => ['Enter a valid Ghana phone number (e.g. 0241234567 or +233241234567).'],
                ]);
            }
        }

        if (! $otpService->verify($channel, $request->email, $phone, $request->otp)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired verification code. Request a new code and try again.'],
            ]);
        }

        $role = $request->role;
        $isAngelDonor = $role === 'angel_donor';

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
            'role' => $role,
            'organization' => $request->organization,
            'phone' => $request->phone,
            'is_active' => true,
            'is_verified' => $isAngelDonor,
            'verified_at' => $isAngelDonor ? now() : null,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $userData = $this->appendSessionFlagsToUserPayload($request, $user->fresh()->toArray(), $user);

        return response()->json([
            'user' => $userData,
        ], 201);
    }
}
