'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NAV_ITEMS, type NavItemId } from '../_lib/constants';
import type { Workspace, UserInfo, WorkspaceMember } from '../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface WorkspaceSidebarProps {
  workspace: Workspace;
  user: UserInfo | null;
  activeNav: NavItemId;
  onNavChange: (id: NavItemId) => void;
  members?: WorkspaceMember[];
  isConnected?: boolean;
}

export function WorkspaceSidebar({
  workspace,
  user,
  activeNav,
  onNavChange,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const primaryNav = NAV_ITEMS.filter(item => item.id !== 'settings');
  const secondaryNav = NAV_ITEMS.filter(item => item.id === 'settings');

  return (
    <Sidebar
      collapsible="none"
      className="border-r border-neutral-800 bg-neutral-950 w-64"
      variant="sidebar"
    >
      {/* Header */}
      <SidebarHeader className="h-20 border-b border-neutral-800/30">
        <div className="flex h-full items-center px-5">
          <div className="flex items-center gap-4 w-full">
            {/* Monogram */}
            <div className="h-11 w-11 bg-white flex items-center justify-center shrink-0">
              <span className="text-[15px] font-bold text-neutral-950 uppercase tracking-[-0.02em]">
                {workspace.name.substring(0, 2)}
              </span>
            </div>

            {/* Workspace Info */}
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <span className="text-[16px] font-semibold text-neutral-50 truncate tracking-[-0.015em] leading-none">
                {workspace.name}
              </span>
              {workspace.description && (
                <span className="text-[12px] text-neutral-500 truncate tracking-[-0.005em] leading-tight font-light">
                  {workspace.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Primary Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="gap-1">
          {primaryNav.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => onNavChange(item.id)}
                  className={cn(
                    "h-11 w-full rounded-none px-4",
                    "text-neutral-400",
                    isActive && [
                      "bg-neutral-800/80 text-white",
                      "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                      "before:h-5 before:w-[2px] before:bg-white"
                    ]
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-white" : "text-neutral-500"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="ml-4 text-[15px] font-normal tracking-[-0.01em]">
                    {t(item.label)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="mt-auto border-t border-neutral-800/50 p-3">
        {/* Settings */}
        <SidebarMenu className="mb-3">
          {secondaryNav.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => onNavChange(item.id)}
                  className={cn(
                    "h-11 w-full rounded-none px-4",
                    "text-neutral-400",
                    isActive && "bg-neutral-800/80 text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-white" : "text-neutral-500"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="ml-4 text-[15px] font-normal tracking-[-0.01em]">
                    {t(item.label)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Divider */}
        <div className="h-px bg-neutral-800/50 mx-2" />

        {/* User Profile */}
        {user && (
          <div className="mt-3">
            <div className="px-3 py-3 mx-1 bg-neutral-900/50 border border-neutral-800/60">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-11 w-11 shrink-0 overflow-hidden bg-gradient-to-br from-neutral-700 to-neutral-800">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-base font-semibold text-neutral-300 uppercase tracking-tight">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex flex-col min-w-0 flex-1 gap-1">
                  <span className="text-[15px] font-medium text-neutral-100 truncate tracking-[-0.01em] leading-tight">
                    {user.name}
                  </span>
                  {user.email && (
                    <span className="text-[12px] text-neutral-500 truncate tracking-[-0.005em] leading-tight font-mono">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.push('/workspaces')}
          className="w-full h-10 flex items-center gap-3 px-4 mt-2 text-neutral-500"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          <span className="text-[14px] tracking-[-0.01em]">
            All workspaces
          </span>
        </button>
      </SidebarFooter>

      <SidebarRail className="hidden" />
    </Sidebar>
  );
}
