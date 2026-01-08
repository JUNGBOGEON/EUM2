'use client';

import { useState, useEffect } from 'react';
import { Search, X, Plus, Loader2, ArrowLeft, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface StepInviteProps {
  invitedUsers: User[];
  setInvitedUsers: (users: User[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

export function StepInvite({
  invitedUsers,
  setInvitedUsers,
  onSubmit,
  onBack,
  onSkip,
  isSubmitting,
}: StepInviteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          const filteredResults = data.filter(
            (user: User) => !invitedUsers.some((invited) => invited.id === user.id)
          );
          setSearchResults(filteredResults);
        }
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, invitedUsers]);

  const handleInviteUser = (user: User) => {
    setInvitedUsers([...invitedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setInvitedUsers(invitedUsers.filter((user) => user.id !== userId));
  };

  return (
    <div className="h-full flex flex-col justify-center">
      {/* Step Number */}
      <div className="mb-6">
        <span className="text-xs font-medium text-muted-foreground/50 tracking-widest">
          STEP 03
        </span>
      </div>

      {/* Title */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          팀원 초대
        </h1>
        <p className="text-muted-foreground/70 mt-2 text-sm">
          함께할 팀원을 초대하세요
        </p>
      </div>

      {/* Content */}
      <div className="space-y-5 mb-10">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 이메일로 검색"
            className="w-full h-11 pl-11 pr-4 text-sm bg-muted/20 border-0 rounded-xl outline-none focus:bg-muted/30 placeholder:text-muted-foreground/40 transition-colors"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground/40" />
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {searchResults.map((user) => (
              <div
                key={user.id}
                onClick={() => handleInviteUser(user)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImage} alt={user.name} />
                    <AvatarFallback className="text-xs bg-muted/50 text-muted-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground/60">{user.email}</p>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        )}

        {searchQuery && !isSearching && searchResults.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center py-3">
            검색 결과가 없습니다
          </p>
        )}

        {/* Invited Users */}
        {invitedUsers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
              초대됨 · {invitedUsers.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {invitedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 bg-muted/30 rounded-full pl-1 pr-2 py-0.5"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.profileImage} alt={user.name} />
                    <AvatarFallback className="text-[9px] bg-muted/50">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{user.name}</span>
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    className="h-3.5 w-3.5 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="group flex items-center justify-center gap-2 w-full h-12 bg-foreground text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              완료
              <Check className="h-3.5 w-3.5" />
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            이전
          </button>
          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1 h-10 text-sm text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-50 transition-colors"
          >
            건너뛰고 생성
          </button>
        </div>
      </div>
    </div>
  );
}
