import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Bus, 
  QrCode, 
  ScanLine, 
  Check, 
  LogIn, 
  User, 
  Sparkles,
  ArrowRight,
  LogOut,
  Users
} from 'lucide-react';
import { UserRole, ROLE_DEFINITIONS, UserProfile } from '../types';
import { auth, googleProvider, saveUserProfile } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSelectRole: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser?.role || 'admin');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await saveUserProfile(result.user, selectedRole);
        onSelectRole(selectedRole);
        onClose();
      }
    } catch (err: unknown) {
      console.error('Google Sign In error:', err);
      // If popup was blocked or closed, give helpful guidance
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Sign-in could not be completed. You can also use Quick Role Activation below.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleQuickRoleActivate = (role: UserRole) => {
    onSelectRole(role);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
      <div className="relative w-full max-w-[94%] sm:max-w-xl bg-white border border-[#D5D9E0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D5D9E0] bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#000000] flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#0052F2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#000000]">Tripcelona Role Access</h3>
                <span className="text-xs font-mono text-[#0052F2]">
                  cloud rbac
                </span>
              </div>
              <p className="text-xs text-[#697077] mt-0.5">
                Select your designated role to enter the dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-[#FFF2F2] border border-[#FFCCD0] text-[#1E2024] text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Current Signed-in status */}
          {currentUser && (
            <div className="p-3.5 bg-[#F2F4F8] rounded-xl border border-[#D5D9E0] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#0052F2] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#000000] truncate">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[11px] text-[#697077] truncate">
                    {currentUser.email} • Active: <strong className="text-[#0052F2]">{ROLE_DEFINITIONS[currentUser.role]?.title}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="btn-secondary px-2.5 py-1 text-xs text-[#F23845] hover:bg-[#FFF2F2] shrink-0 flex items-center gap-1"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Role Cards Grid */}
          <div>
            <label className="block text-xs font-semibold text-[#000000] uppercase tracking-wider mb-2">
              Choose Your Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((roleKey) => {
                const def = ROLE_DEFINITIONS[roleKey];
                const isSelected = selectedRole === roleKey;

                return (
                  <div
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0052F2] bg-white ring-2 ring-[#0052F2] shadow-xs'
                        : 'border-[#D5D9E0] bg-white hover:border-[#9FA5AD] hover:bg-[#F2F4F8]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {roleKey === 'admin' && <ShieldCheck className="w-4 h-4 text-[#0052F2]" />}
                        {roleKey === 'driver' && <ScanLine className="w-4 h-4 text-[#000000]" />}
                        {roleKey === 'ticketing_agent' && <QrCode className="w-4 h-4 text-[#0052F2]" />}
                        {roleKey === 'travel_creator' && <Bus className="w-4 h-4 text-[#50565B]" />}
                        <span className="font-semibold text-xs text-[#000000]">{def.title}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#0052F2] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-[#697077] mt-1.5 leading-relaxed">
                      {def.description}
                    </p>

                    <div className="mt-2 pt-2 border-t border-[#D5D9E0] flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#50565B]">{def.badge}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickRoleActivate(roleKey);
                        }}
                        className="text-[#0052F2] font-semibold hover:underline"
                      >
                        Enter As &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Activate Selected Role Button */}
          <div className="pt-2">
            <button
              onClick={() => handleQuickRoleActivate(selectedRole)}
              className="btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>Continue as {ROLE_DEFINITIONS[selectedRole]?.title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Google Sign-in Alternative */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D5D9E0]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-[#868D95]">Or authenticate with Google Cloud</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="btn-secondary w-full py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2 min-h-[42px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Connecting to Google...' : `Sign in & Assign "${ROLE_DEFINITIONS[selectedRole]?.title}"`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
