'use client';

import { useRouter } from 'next/navigation';
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
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NAV_ITEMS, type NavItemId } from '../_lib/constants';
import type { Workspace, UserInfo, WorkspaceMember } from '../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  members = [],
  isConnected,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-black text-white selection:bg-white/20"
      variant="sidebar"
    >
      {/* Header - Minimal & Sharp */}
      <SidebarHeader className="h-20 flex items-center justify-center border-b border-white/5 bg-black p-0">
        <div className="flex items-center justify-center w-full h-full group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-lg tracking-tighter">
              {workspace.name.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
              <span className="font-bold text-sm tracking-wide uppercase">{workspace.name}</span>
              <span className="text-[10px] text-neutral-500 font-mono">WORKSPACE</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-black py-6">
        {/* Navigation - Vertical Command List */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-0">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onNavChange(item.id)}
                      tooltip={t(item.label)}
                      className={cn(
                        "h-12 w-full transition-all duration-200 rounded-none border-l-2",
                        isActive
                          ? "border-white bg-white/5 text-white"
                          : "border-transparent text-neutral-500 hover:text-white hover:bg-white/[0.02] hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-4 px-2 w-full">
                        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-white" : "text-neutral-500 group-hover:text-white")} />
                        <span className={cn(
                          "text-sm font-medium tracking-wide group-data-[collapsible=icon]:hidden uppercase",
                          isActive ? "text-white" : "text-neutral-500 group-hover:text-white"
                        )}>
                          {t(item.label)}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-6 px-4 group-data-[collapsible=icon]:hidden">
          <div className="h-px w-full bg-white/10" />
        </div>

        {/* User Status / Minimal Profile - Bottom anchored in mobile, but here inline */}
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <div className="px-6 py-2">
            <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-4">
              Active User
            </p>
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-none border border-white/20">
                  <AvatarImage src={user.profileImage} />
                  <AvatarFallback className="bg-neutral-900 text-white rounded-none">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{user.name}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">ONLINE</span>
                </div>
              </div>
            )}
          </div>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer - Back Button */}
      <SidebarFooter className="border-t border-white/5 bg-black p-0">
        <Button
          variant="ghost"
          className="w-full h-16 rounded-none hover:bg-white hover:text-black hover:border-white transition-all text-neutral-500 flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-bold"
          onClick={() => router.push('/workspaces')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Back to List</span>
        </Button>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-white text-white/20" />
    </Sidebar>
  );
}
