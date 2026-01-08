import { Home, Calendar, FolderOpen, Bell, Settings } from 'lucide-react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const NAV_ITEMS = [
  { icon: Home, label: '홈', href: '/workspaces' },
  { icon: Calendar, label: '캘린더', href: '/calendar' },
  { icon: FolderOpen, label: '회의록 보관함', href: '/archives' },
  { icon: Bell, label: '알림', href: '/notifications' },
  { icon: Settings, label: '설정', href: '/settings' },
] as const;
