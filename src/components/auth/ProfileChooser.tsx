"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPlatform } from "@/adapters/platform";
import { useLearnUpTheme } from "@/lib/theme/ThemeProvider";
import { ProfileUnlockModal } from "./ProfileUnlockModal";
import { ProfileSecurityModal } from "./ProfileSecurityModal";
import { AddProfileModal } from "./AddProfileModal";
import {
  getStoredProfiles,
  saveStoredProfiles,
  addOrUpdateSavedProfile,
  type ProfileLockType,
  type SavedProfile,
} from "@/lib/auth/profileCookies";
import { getOrCreateGuestSessionId, isValidGuestSessionId } from "@/lib/auth/guest-session";
import styles from "./ProfileChooser.module.css";

// Re-export for compatibility with other modules and tests
export type { ProfileLockType, SavedProfile };

export interface ProfileChooserProps {
  onSelectSignIn: (email?: string) => void;
  onSelectSignUp: () => void;
  onSelectGuest: () => void;
  onSelectProfile?: (profileId: string) => void;
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
  "linear-gradient(135deg, #10B981 0%, #047857 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
  "linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)",
];

export function ProfileChooser({
  onSelectSignIn,
  onSelectSignUp,
  onSelectGuest,
  onSelectProfile,
}: ProfileChooserProps) {
  const router = useRouter();
  const { isDark, toggleTheme } = useLearnUpTheme();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  // Modals state
  const [unlockTargetProfile, setUnlockTargetProfile] =
    useState<SavedProfile | null>(null);
  const [securityEditProfile, setSecurityEditProfile] =
    useState<SavedProfile | null>(null);
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);

  useEffect(() => {
    try {
      const loaded = getStoredProfiles();
      setProfiles(loaded);
    } catch {
      // Ignore
    }

    // Sync from native desktop SQLite storage
    try {
      const platform = getPlatform();
      platform.storage.listProfiles().then((dbProfiles) => {
        if (dbProfiles && Array.isArray(dbProfiles) && dbProfiles.length > 0) {
          const current = getStoredProfiles();
          const merged = [...current];
          for (const p of dbProfiles) {
            if (!merged.some((m) => m.id === p.id)) {
              merged.push({
                id: p.id,
                name: p.name,
                email: p.email || '',
                color: p.color || AVATAR_COLORS[merged.length % AVATAR_COLORS.length],
                initials: p.initials || (p.name || 'User').slice(0, 2).toUpperCase(),
                lastActive: p.updatedAt || new Date().toISOString(),
                lockType: (p.lockType as any) || 'none',
              });
            }
          }
          setProfiles(merged);
          saveStoredProfiles(merged);
        }
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const saveProfilesToStorage = (updated: SavedProfile[]) => {
    setProfiles(updated);
    saveStoredProfiles(updated);
  };

  const activateLocalProfile = (profile: SavedProfile) => {
    let guestSessionId = (profile as any).guestSessionId;
    if (!isValidGuestSessionId(guestSessionId)) {
      guestSessionId = crypto.randomUUID();
      (profile as any).guestSessionId = guestSessionId;
      addOrUpdateSavedProfile(profile);
    }

    document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=31536000; SameSite=Lax';
    document.cookie = `LearnUp_guest_session_id=${guestSessionId}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `LearnUp_active_profile_id=${profile.id}; path=/; max-age=31536000; SameSite=Lax`;

    try {
      localStorage.setItem('LearnUp_is_guest', 'true');
      localStorage.setItem('LearnUp_guest_session_id', guestSessionId);
      localStorage.setItem('LearnUp_active_profile_id', profile.id);
      localStorage.setItem('LearnUp_active_profile_name', profile.name);
      localStorage.setItem('LearnUp_active_profile_email', profile.email || '');
      localStorage.setItem('LearnUp_active_profile_color', profile.color || '');
    } catch {
      // Safe fallback
    }

    if (onSelectProfile) {
      onSelectProfile(profile.id);
    } else {
      router.push('/dashboard');
    }
  };

  const handleProfileClick = (profile: SavedProfile) => {
    if (profile.lockType && profile.lockType !== 'none') {
      setUnlockTargetProfile(profile);
    } else {
      activateLocalProfile(profile);
    }
  };

  const handleUnlockSuccess = (profile: SavedProfile) => {
    setUnlockTargetProfile(null);
    activateLocalProfile(profile);
  };

  const handleRemoveProfile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = profiles.filter((p) => p.id !== id);
    saveProfilesToStorage(updated);
    try {
      const platform = getPlatform();
      await (platform.storage as any).deleteProfile?.(id);
    } catch {
      // Safe fallback
    }
  };

  const handleOpenSecurityModal = (
    e: React.MouseEvent,
    profile: SavedProfile,
  ) => {
    e.stopPropagation();
    setSecurityEditProfile(profile);
  };

  const handleSaveSecurity = (updatedProfile: SavedProfile) => {
    const updated = profiles.map((p) =>
      p.id === updatedProfile.id ? updatedProfile : p,
    );
    saveProfilesToStorage(updated);
    setSecurityEditProfile(null);
  };

  const handleSaveNewProfile = async (newProf: {
    name: string;
    email: string;
  }) => {
    const created = addOrUpdateSavedProfile(newProf);
    try {
      const platform = getPlatform();
      await platform.storage.saveProfile({
        id: created.id,
        name: created.name,
        email: created.email || null,
        color: created.color,
        initials: created.initials,
        lockType: created.lockType && created.lockType !== 'none' ? (created.lockType === 'password' ? 'password' : 'pin') : 'none',
        updatedAt: new Date().toISOString(),
        isGuest: !created.email,
      });
    } catch {
      // Safe fallback
    }
    const updated = getStoredProfiles();
    setProfiles(updated);
    setIsAddProfileOpen(false);
    activateLocalProfile(created);
  };

  const handleStartGuestMode = () => {
    const guestId = getOrCreateGuestSessionId();
    document.cookie =
      'LearnUp_guest_mode=true; path=/; max-age=31536000; SameSite=Lax';
    document.cookie =
      `LearnUp_guest_session_id=${guestId}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem('LearnUp_is_guest', 'true');
      localStorage.setItem('LearnUp_guest_session_id', guestId);
      localStorage.setItem('LearnUp_active_profile_id', 'guest-default');
      localStorage.setItem('LearnUp_active_profile_name', 'Guest Learner');
    } catch {
      // Ignore
    }
    onSelectGuest();
  };

  const getLockBadgeText = (profile: SavedProfile) => {
    if (!profile.lockType || profile.lockType === "none") {
      return null;
    }
    if (profile.lockType === "pin-4") return "🔒 4-Digit PIN";
    if (profile.lockType === "pin-6") return "🔒 6-Digit PIN";
    if (profile.lockType === "pin-custom")
      return `🔒 ${profile.pinLength || 4}-Digit PIN`;
    if (profile.lockType === "password") return "🔒 Password";
    return "🔒 Protected";
  };

  return (
    <main className={styles.wrapper}>
      {/* Top Bar with Theme Toggle */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.themeToggleBtn}
          onClick={toggleTheme}
          aria-label={
            mounted
              ? isDark
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
              : "Toggle theme"
          }
        >
          {mounted ? (
            <span>{isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          ) : (
            <span style={{ opacity: 0 }}>☀️ Light Mode</span>
          )}
        </button>
      </div>

      {/* Main Card Window */}
      <div className={styles.cardWindow}>
        {/* Brand & Heading */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLogo}>
            <div className={styles.logoIcon}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
                <path d="m10 14 5 3-5 3v-6Z" />
              </svg>
            </div>
            <span className={styles.brandText}>LearnUp</span>
          </div>

          <h1 className={styles.title}>Who&apos;s learning today?</h1>
          <p className={styles.subtitle}>
            Select your profile to continue learning, or add a new account.
          </p>
        </div>

        {/* Profile Chooser Grid */}
        <div
          className={styles.profilesGrid}
          role="list"
          aria-label="Available LearnUp Profiles"
        >
          {/* Saved Profiles */}
          {profiles.map((p, idx) => {
            const lockBadge = getLockBadgeText(p);
            return (
              <div
                key={p.id}
                className={styles.profileCard}
                onClick={() => handleProfileClick(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleProfileClick(p);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open profile for ${p.name}`}
              >
                <div className={styles.cardTopControls}>
                  <button
                    type="button"
                    className={styles.cardIconBtn}
                    onClick={(e) => handleOpenSecurityModal(e, p)}
                    title="Configure PIN / Password lock"
                    aria-label={`Configure security lock for ${p.name}`}
                  >
                    🔒
                  </button>
                  <button
                    type="button"
                    className={`${styles.cardIconBtn} ${styles.cardDeleteBtn}`}
                    onClick={(e) => handleRemoveProfile(e, p.id)}
                    title="Remove profile from this device"
                    aria-label={`Remove profile ${p.name}`}
                  >
                    &times;
                  </button>
                </div>

                <div
                  className={styles.avatarCircle}
                  style={{
                    background:
                      p.color || AVATAR_COLORS[idx % AVATAR_COLORS.length],
                  }}
                >
                  {p.initials || p.name.charAt(0).toUpperCase()}
                </div>
                <h2 className={styles.profileName}>{p.name}</h2>
                {p.email && <p className={styles.profileMeta}>{p.email}</p>}

                {lockBadge && (
                  <span className={styles.lockBadge}>{lockBadge}</span>
                )}
              </div>
            );
          })}

          {/* Add Profile / Create Account Card */}
          <div
            className={`${styles.profileCard} ${styles.addCard}`}
            onClick={() => setIsAddProfileOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsAddProfileOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Create a new profile or sign up"
          >
            <div className={styles.addCircle}>+</div>
            <h2 className={styles.profileName}>Add profile</h2>
            <p className={styles.profileMeta}>Create or sign in</p>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.guestLink}
            onClick={handleStartGuestMode}
            aria-label="Browse as guest without signing in"
          >
            <span>🕶️</span>
            <span>+ Create New Guest Profile</span>
          </button>

          <div className={styles.actionButtonsRight}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onSelectSignIn()}
            >
              Sign In with Password
            </button>
            <button
              type="button"
              className={styles.primaryLink}
              onClick={onSelectSignUp}
            >
              Create Account &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Add Profile Modal */}
      <AddProfileModal
        isOpen={isAddProfileOpen}
        onClose={() => setIsAddProfileOpen(false)}
        onSaveProfile={handleSaveNewProfile}
        onGoToSignUp={onSelectSignUp}
      />

      {/* Profile Unlock Modal */}
      <ProfileUnlockModal
        profile={unlockTargetProfile}
        isOpen={Boolean(unlockTargetProfile)}
        onClose={() => setUnlockTargetProfile(null)}
        onUnlock={handleUnlockSuccess}
        onFallbackSignIn={(email) => {
          setUnlockTargetProfile(null);
          onSelectSignIn(email);
        }}
      />

      {/* Profile Security Config Modal */}
      <ProfileSecurityModal
        profile={securityEditProfile}
        isOpen={Boolean(securityEditProfile)}
        onClose={() => setSecurityEditProfile(null)}
        onSave={handleSaveSecurity}
      />
    </main>
  );
}
