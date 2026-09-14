"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { changePassword, updateProfile } from "../../lib/authApi";
import type { AuthUser } from "../../lib/authTypes";

export function ProfileView({ user }: { user: AuthUser }) {
  // Profile Details State
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Password Validation check
  const isPasswordFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    /\d/.test(newPassword) &&
    confirmPassword === newPassword;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (!displayName.trim()) {
      setProfileError("Display name cannot be empty.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await updateProfile(displayName.trim());
      setProfileSuccess(res.message || "Profile details updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : "Failed to update profile details.",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setPasswordError(
        "Password must be at least 8 characters long and contain at least one number.",
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordSuccess("Your password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Profile Details Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <UserIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
        </div>

        {profileSuccess && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs sm:text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs sm:text-sm font-medium text-rose-800">
            <AlertCircle className="h-4 h-4 text-rose-600 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-[#072F25] focus:outline-hidden focus:ring-1 focus:ring-[#072F25] transition-colors"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed select-none"
            />
            <p className="mt-1.5 text-xs text-slate-400 font-medium">
              Email changes must be done by an admin.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-[#072F25] hover:bg-[#0A3C2F] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUpdatingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <Lock className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
        </div>

        {passwordSuccess && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs sm:text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs sm:text-sm font-medium text-rose-800">
            <AlertCircle className="h-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 focus:border-[#072F25] focus:outline-hidden focus:ring-1 focus:ring-[#072F25] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 focus:border-[#072F25] focus:outline-hidden focus:ring-1 focus:ring-[#072F25] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 font-medium leading-relaxed">
              Min 8 characters, at least one number. Changing your password will
              update your security credentials.
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-11 text-sm text-slate-900 focus:border-[#072F25] focus:outline-hidden focus:ring-1 focus:ring-[#072F25] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isPasswordFormValid || isChangingPassword}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                isPasswordFormValid && !isChangingPassword
                  ? "bg-[#072F25] hover:bg-[#0A3C2F] text-white shadow-xs cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Lock
                  className={`w-4 h-4 ${isPasswordFormValid ? "text-white" : "text-slate-400"}`}
                />
              )}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
