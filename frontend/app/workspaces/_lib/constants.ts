import { Home, Calendar, FolderOpen, Bell, Settings } from 'lucide-react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const NAV_ITEMS = [
  { icon: Home, label: 'menu.home', href: '/workspaces' },
  { icon: Calendar, label: 'menu.calendar', href: '/calendar' },
  { icon: FolderOpen, label: 'menu.archives', href: '/archives' },
  { icon: Bell, label: 'menu.notifications', href: '/notifications' },
  { icon: Settings, label: 'menu.settings', href: '/settings' },
] as const;
