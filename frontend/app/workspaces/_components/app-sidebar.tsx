'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '../_lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvitationNotifications } from './invitation-notifications';
import type { UserInfo } from '../_lib/types';
import type { WorkspaceInvitation } from '../_hooks/use-invitations';

interface AppSidebarProps {
  user: UserInfo | null;
  onLogout: () => void;
  invitations?: WorkspaceInvitation[];
  isLoadingInvitations?: boolean;
  onAcceptInvitation?: (id: string) => Promise<void>;
  onRejectInvitation?: (id: string) => Promise<void>;
}

export function AppSidebar({
  user,
  onLogout,
  invitations = [],
  isLoadingInvitations = false,
  onAcceptInvitation,
  onRejectInvitation,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-black text-white">
      {/* Header with Logo, Notification, and Trigger */}
      <SidebarHeader className="h-14 border-b border-white/10 bg-black">
        <div className="flex h-full items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Image
            src="/logo/eum_black.svg"
            alt="EUM"
            width={24}
            height={10}
            className="invert group-data-[collapsible=icon]:hidden opacity-80"
            style={{ height: "auto" }}
          />
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
            {onAcceptInvitation && onRejectInvitation && (
              <InvitationNotifications
                invitations={invitations}
                isLoading={isLoadingInvitations}
                onAccept={onAcceptInvitation}
                onReject={onRejectInvitation}
              />
            )}
            <SidebarTrigger className="text-white/40 hover:text-white" />
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex">
            <SidebarTrigger className="text-white/40 hover:text-white" />
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="bg-black">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const isNotificationItem = item.href === '/notifications';

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(item.label)}
                      className={`font-mono text-[12px] tracking-wide transition-colors duration-200
                        ${isActive
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <Link href={item.href} className="relative flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.label).toUpperCase()}</span>
                        {isNotificationItem && invitations.length > 0 && (
                          <Badge
                            variant="outline"
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] border-white text-white group-data-[collapsible=icon]:hidden"
                          >
                            {invitations.length > 9 ? '9+' : invitations.length}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-white/10 bg-black p-2">
        <SidebarMenu>
          {/* User Info */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent data-[state=open]:bg-transparent">
                <Avatar className="h-8 w-8 border border-white/20">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="text-xs bg-black text-white font-mono">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[12px] font-mono font-bold text-white truncate uppercase">{user.name}</span>
                  <span className="text-[10px] font-mono text-white/40 truncate">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip={t('menu.logout')}
              className="font-mono text-[11px] text-white/40 hover:text-red-500 hover:bg-white/5 uppercase tracking-wider"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('menu.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
