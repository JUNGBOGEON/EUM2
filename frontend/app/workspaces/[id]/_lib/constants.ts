import { Video, FileText, History, Settings, Users, Calendar } from 'lucide-react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const NAV_ITEMS = [
  { icon: Video, label: 'meeting.title', id: 'meeting' },
  { icon: Calendar, label: 'calendar.title', id: 'calendar' },
  { icon: FileText, label: 'files.title', id: 'files' },
  { icon: History, label: 'history.title', id: 'history' },
  { icon: Users, label: 'members.title', id: 'members' },
  { icon: Settings, label: 'menu.settings', id: 'settings' },
] as const;

export type NavItemId = typeof NAV_ITEMS[number]['id'];
