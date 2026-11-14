"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FilePlus2,
  Files,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/mock-store";
import { ROLE_LABELS, formatDateTimeID } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { SkeletonTable } from "./skeleton-table";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  mahasiswa: [
    {
      label: "Ringkasan",
      href: "/mahasiswa",
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Pengajuan Surat",
      href: "/mahasiswa/submissions",
      icon: <Files className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Ajukan Surat Baru",
      href: "/mahasiswa/submissions/new",
      icon: <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Katalog Jenis Surat",
      href: "/mahasiswa/catalog",
      icon: <FolderKanban className="w-4 h-4" strokeWidth={1.5} />,
    },
  ],
  ult: [
    {
      label: "Ringkasan ULT",
      href: "/ult",
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Antrean Pengajuan",
      href: "/ult/queue",
      icon: <ClipboardList className="w-4 h-4" strokeWidth={1.5} />,
    },
  ],
  superadmin: [
    {
      label: "Ringkasan Sistem",
      href: "/admin",
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Pengguna & Role",
      href: "/admin/users",
      icon: <Users className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Organisasi / Himpunan",
      href: "/admin/organizations",
      icon: <Building2 className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Katalog Jenis Surat",
      href: "/admin/letter-types",
      icon: <FileCheck2 className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Audit Log",
      href: "/admin/audit-logs",
      icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />,
    },
    {
      label: "Pengaturan Sistem",
      href: "/admin/settings",
      icon: <Settings className="w-4 h-4" strokeWidth={1.5} />,
    },
  ],
};

interface AppShellProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({
  children,
  allowedRoles,
  breadcrumbs = [],
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isHydrated,
    currentUser,
    organizations,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    logout,
  } = useAppStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && !currentUser) {
      router.replace("/login");
    }
  }, [isHydrated, currentUser, router]);

  const userOrg = useMemo(
    () =>
      organizations.find((o) => o.id === currentUser?.organization_id) ?? null,
    [organizations, currentUser]
  );

  const userNotifications = useMemo(
    () =>
      notifications.filter((n) => n.user_id === currentUser?.id).slice(0, 12),
    [notifications, currentUser]
  );

  const unreadCount = useMemo(
    () => userNotifications.filter((n) => !n.is_read).length,
    [userNotifications]
  );

  if (!isHydrated || !currentUser) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFFFF] p-6 lg:p-8 max-w-[1400px] mx-auto">
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const homeHref =
      currentUser.role === "mahasiswa"
        ? "/mahasiswa"
        : currentUser.role === "ult"
        ? "/ult"
        : "/admin";

    return (
      <div className="min-h-[100dvh] bg-[#FFFFFF] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-[#DCE6F7] rounded-xl p-6 bg-[#FFFFFF]">
          <h1 className="text-lg font-semibold text-[#091540]">
            Akses Tidak Diizinkan
          </h1>
          <p className="text-sm text-[#475577] mt-2 leading-relaxed">
            Halaman ini hanya dapat diakses oleh peran tertentu. Akun Anda saat
            ini masuk sebagai{" "}
            <span className="font-medium text-[#091540]">
              {ROLE_LABELS[currentUser.role]}
            </span>
            .
          </p>
          <Link
            href={homeHref}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const navItems = NAV_BY_ROLE[currentUser.role];

  const isNavActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/mahasiswa" || href === "/ult" || href === "/admin") {
      return false;
    }
    if (!pathname.startsWith(`${href}/`)) return false;
    return !navItems.some(
      (other) =>
        other.href !== href &&
        other.href.startsWith(`${href}/`) &&
        (pathname === other.href || pathname.startsWith(`${other.href}/`))
    );
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#F6F9FE]">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-[#DCE6F7]">
        <Image
          src="/logo-sipesat.png"
          alt="Logo SIPESAT"
          width={32}
          height={32}
          className="w-8 h-8 object-contain shrink-0"
        />
        <div className="min-w-0" title="SIPESAT : Sistem Informasi Pelayanan Surat Terpadu">
          <p className="text-sm font-semibold tracking-tight text-[#091540] truncate">
            SIPESAT
          </p>
          <p className="text-[11px] text-[#475577] truncate">
            Sistem Informasi Pelayanan Surat Terpadu
          </p>
        </div>
      </div>

      {/* User & Org Identity */}
      <div className="px-4 py-4 border-b border-[#DCE6F7]">
        <div className="px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[#DCE6F7]">
          <p className="text-xs font-semibold text-[#091540] truncate">
            {currentUser.name}
          </p>
          <p className="text-[11px] text-[#475577] mt-0.5 truncate">
            {userOrg ? `${userOrg.code} — ${userOrg.name}` : ROLE_LABELS[currentUser.role]}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigasi Utama">
        {navItems.map((item) => {
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[#ABD2FA]/40 text-[#091540] font-semibold border-l-[3px] border-[#1B2CC1] rounded-l-none"
                  : "text-[#475577] hover:bg-[#FFFFFF] hover:text-[#091540]"
              }`}
            >
              <span className={active ? "text-[#1B2CC1]" : "text-[#475577]"}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#DCE6F7] space-y-1">
        <Link
          href="/profile"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/profile"
              ? "bg-[#ABD2FA]/40 text-[#091540] font-semibold"
              : "text-[#475577] hover:bg-[#FFFFFF] hover:text-[#091540]"
          }`}
        >
          <UserIcon className="w-4 h-4" strokeWidth={1.5} />
          <span>Profil Saya</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#991B1B] hover:bg-[#FEE2E2]/50 transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-[#FFFFFF] text-[#091540]">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-[#DCE6F7] fixed inset-y-0 left-0 z-40 h-[100dvh]">
        {SidebarContent}
      </aside>

      {/* Mobile Slide-Over Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#091540]/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#F6F9FE] border-r border-[#DCE6F7] shadow-xl z-10 flex flex-col">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-3.5 right-3 p-1.5 rounded-lg text-[#475577] hover:bg-[#FFFFFF]"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Bar */}
        <header className="h-14 bg-[#FFFFFF] border-b border-[#DCE6F7] px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#091540] hover:bg-[#F6F9FE]"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-[#475577] hidden sm:inline">
                {ROLE_LABELS[currentUser.role]}
              </span>
              {breadcrumbs.map((bc, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-[#7692FF] shrink-0 hidden sm:inline"
                    strokeWidth={1.5}
                  />
                  {bc.href ? (
                    <Link
                      href={bc.href}
                      className="text-[#475577] hover:text-[#1B2CC1] truncate"
                    >
                      {bc.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#091540] truncate">
                      {bc.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setAccountOpen(false);
                }}
                aria-label="Notifikasi"
                className="relative p-2 rounded-lg border border-transparent hover:border-[#DCE6F7] hover:bg-[#F6F9FE] text-[#091540] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF]"
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1B2CC1] text-[#FFFFFF] text-[10px] font-mono-tabular font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#091540]">
                      Notifikasi ({unreadCount} belum dibaca)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-[#1B2CC1] hover:underline"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#DCE6F7]">
                    {userNotifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#475577]">
                        Belum ada notifikasi baru.
                      </div>
                    ) : (
                      userNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.submission_id) {
                              router.push(`/submissions/${n.submission_id}`);
                            }
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-[#F6F9FE] transition-colors ${
                            !n.is_read ? "bg-[#ABD2FA]/15" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#091540]">
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-[#1B2CC1] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-[#475577] mt-1 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[11px] font-mono-tabular text-[#475577] mt-1.5">
                            {formatDateTimeID(n.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF]"
              >
                <div className="w-6 h-6 rounded-md bg-[#ABD2FA] text-[#091540] flex items-center justify-center text-xs font-semibold">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden md:inline text-xs font-medium text-[#091540] max-w-[140px] truncate">
                  {currentUser.name}
                </span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#DCE6F7] bg-[#F6F9FE]">
                    <p className="text-xs font-semibold text-[#091540] truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-[#475577] truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/profile"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#091540] hover:bg-[#F6F9FE]"
                    >
                      <UserIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Profil & Kata Sandi
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/50"
                    >
                      <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Keluar dari Sesi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
