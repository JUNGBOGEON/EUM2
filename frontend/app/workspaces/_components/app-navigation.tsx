'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogOut, LayoutGrid, Calendar, Inbox, Bell, Settings } from 'lucide-react';
import type { UserInfo } from '../_lib/types';
import type { WorkspaceInvitation } from '../_hooks/use-invitations';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvitationNotifications } from './invitation-notifications';

// Define the available tabs
export type TabType = 'workspaces' | 'calendar' | 'notifications' | 'settings';

interface AppNavigationProps {
    user: UserInfo | null;
    onLogout: () => void;
    invitations?: WorkspaceInvitation[];
    isLoadingInvitations?: boolean;
    onAcceptInvitation?: (invitationId: string) => Promise<void>;
    onRejectInvitation?: (invitationId: string) => Promise<void>;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const NAV_ITEMS = [
    { labelKey: 'workspaces.title', icon: LayoutGrid, id: 'workspaces' as TabType },
    { labelKey: 'menu.calendar', icon: Calendar, id: 'calendar' as TabType },
    { labelKey: 'archives.title', icon: Inbox, id: 'notifications' as TabType },
    { labelKey: 'menu.settings', icon: Settings, id: 'settings' as TabType },
];

export function AppNavigation({
    user,
    onLogout,
    invitations = [],
    isLoadingInvitations = false,
    onAcceptInvitation,
    onRejectInvitation,
    activeTab,
    onTabChange,
}: AppNavigationProps) {
    const { t } = useLanguage();

    return (
        <nav className="w-[80px] lg:w-[260px] h-screen bg-black flex flex-col border-r border-white/5 flex-shrink-0 transition-all duration-300">
            {/* 1. Header & Logo */}
            <div className="h-20 flex items-center justify-between px-4 lg:px-6">
                <Image
                    src="/logo/eum_black.svg"
                    alt="EUM"
                    width={32}
                    height={32}
                    className="invert opacity-90"
                    style={{ width: 'auto', height: '20px' }}
                />
                {/* Invitation Notifications */}
                {onAcceptInvitation && onRejectInvitation && (
                    <div className="hidden lg:block">
                        <InvitationNotifications
                            invitations={invitations}
                            isLoading={isLoadingInvitations}
                            onAccept={onAcceptInvitation}
                            onReject={onRejectInvitation}
                        />
                    </div>
                )}
            </div>

            {/* 2. Navigation Items */}
            <div className="flex-1 py-6 px-3 lg:px-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = activeTab === item.id;
                    // Reuse notifications badge logic if id matches (e.g. notifications tab)
                    const badgeCount = (item.id === 'notifications') ? invitations.length : 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                group w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${isActive
                                    ? 'bg-white text-black font-semibold'
                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}
              `}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                            <span className="hidden lg:block text-[14px]">{t(item.labelKey)}</span>

                            {badgeCount > 0 && item.id === 'notifications' && (
                                <span className="ml-auto hidden lg:flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                    {badgeCount > 9 ? '9+' : badgeCount}
                                </span>
                            )}
                            {badgeCount > 0 && item.id === 'notifications' && (
                                <span className="lg:hidden absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 3. User Profile & Footer */}
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer justify-center lg:justify-start">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-transparent group-hover:border-white/20 overflow-hidden flex-shrink-0 relative">
                        {user?.profileImage ? (
                            <Image src={user.profileImage} alt={user.name} fill className="object-cover" />
                        ) : (
                            <span className="flex items-center justify-center w-full h-full text-[10px] text-white">
                                {user?.name?.charAt(0)}
                            </span>
                        )}
                    </div>

                    {/* Info */}
                    <div className="hidden lg:flex flex-1 flex-col min-w-0">
                        <p className="text-[13px] font-medium text-neutral-200 truncate">{user?.name}</p>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={onLogout}
                        className="hidden lg:block p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </nav>
    );
}
