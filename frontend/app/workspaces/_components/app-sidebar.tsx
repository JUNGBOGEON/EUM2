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
    <Sidebar collapsible="icon">
      {/* Header with Logo, Notification, and Trigger */}
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <div className="flex h-full items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Image
            src="/logo/eum_black.svg"
            alt="EUM"
            width={24}
            height={10}
            className="invert group-data-[collapsible=icon]:hidden"
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
            <SidebarTrigger />
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const isNotificationItem = item.href === '/notifications';

                // 알림 메뉴 항목에 배지 표시
                if (isNotificationItem && invitations.length > 0) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.label)}>
                        <Link href={item.href} className="relative">
                          <item.icon />
                          <span>{t(item.label)}</span>
                          <Badge
                            variant="destructive"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-5 p-0 flex items-center justify-center text-xs group-data-[collapsible=icon]:hidden"
                          >
                            {invitations.length > 9 ? '9+' : invitations.length}
                          </Badge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.label)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.label)}</span>
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
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {/* User Info */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="text-xs bg-sidebar-accent">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip={t('menu.logout')}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>{t('menu.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
