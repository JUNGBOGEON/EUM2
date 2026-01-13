'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NAV_ITEMS, type NavItemId } from '../_lib/constants';
import type { Workspace, UserInfo, WorkspaceMember } from '../_lib/types';

interface WorkspaceSidebarProps {
  workspace: Workspace;
  user: UserInfo | null;
  activeNav: NavItemId;
  onNavChange: (id: NavItemId) => void;
  members?: WorkspaceMember[];
  isConnected?: boolean;
}

import { useLanguage } from '@/contexts/LanguageContext';

export function WorkspaceSidebar({
  workspace,
  user,
  activeNav,
  onNavChange,
  members = [],
  isConnected,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Sidebar className="border-r border-border">
      {/* Header */}
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <div className="flex h-full items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/workspaces')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">{t('common.list')}</span>
          </Button>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Workspace Info */}
        <SidebarGroup>
          <div className="px-3 py-4">
            <div className="flex items-center gap-3">
              {workspace.thumbnail ? (
                <img
                  src={workspace.thumbnail}
                  alt={workspace.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-lg font-semibold text-muted-foreground">
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground truncate">
                  {workspace.name}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? t('sidebar.connected') : t('sidebar.connecting')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SidebarGroup>

        <Separator />

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeNav === item.id}
                    onClick={() => onNavChange(item.id)}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{t(item.label)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Members */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">
            <span>{t('sidebar.members')}</span>
            <Badge variant="secondary" className="ml-2">
              {members.length || 1}
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[200px]">
              <div className="px-3 space-y-1">
                {/* Owner */}
                {workspace.owner && (
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-md">
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={workspace.owner.profileImage} />
                        <AvatarFallback className="text-xs">
                          {workspace.owner.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar" />
                    </div>
                    <span className="text-sm text-foreground truncate flex-1">
                      {workspace.owner.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {t('sidebar.host')}
                    </Badge>
                  </div>
                )}
                {/* Members */}
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.profileImage} />
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar" />
                      )}
                    </div>
                    <span className="text-sm text-foreground truncate">
                      {member.name}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - Current User */}
      <SidebarFooter className="border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-2 p-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImage} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
