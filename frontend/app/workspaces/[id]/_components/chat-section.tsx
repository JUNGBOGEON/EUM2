'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '../_hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Send, Hash, MessageSquare, MessageSquareOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UserInfo } from '../_lib/types';

interface ChatSectionProps {
    workspaceId: string;
    currentUser: UserInfo | null;
    canSendMessages?: boolean;
}

export function ChatSection({ workspaceId, currentUser, canSendMessages = true }: ChatSectionProps) {
    const { t } = useLanguage();
    const {
        channels,
        activeChannelId,
        setActiveChannelId,
        messages,
        sendMessage,
        createChannel,
        isLoadingMessages,
    } = useChat(workspaceId, currentUser?.id || '');

    const [newMessage, setNewMessage] = useState('');
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) return;
        setIsCreatingChannel(true);
        const success = await createChannel(newChannelName);
        setIsCreatingChannel(false);
        if (success) {
            setNewChannelName('');
            setIsCreateChannelOpen(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="flex flex-col h-full bg-neutral-900 border-l border-white/5">
            {/* Header with Channel Selector */}
            <div className="h-16 border-b border-white/5 flex items-center px-4 justify-between bg-neutral-900">
                <div className="flex items-center gap-2">
                    <Select
                        value={activeChannelId || ''}
                        onValueChange={(value) => {
                            if (value === 'create_new') {
                                setIsCreateChannelOpen(true);
                            } else {
                                setActiveChannelId(value);
                            }
                        }}
                    >
                        <SelectTrigger className="w-[180px] h-9 font-medium border-transparent shadow-none focus:ring-0 bg-white/5 hover:bg-white/10 transition-colors text-white rounded-md">
                            <span className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-neutral-400" />
                                <SelectValue placeholder={t('chat.channels')} />
                            </span>
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-white/10 text-white">
                            {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <span className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-neutral-400" />
                                        {channel.name}
                                    </span>
                                </SelectItem>
                            ))}
                            <SelectSeparator className="bg-white/10" />
                            <SelectItem value="create_new" className="text-white font-medium focus:bg-white/10 focus:text-white cursor-pointer">
                                <span className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    {t('chat.create_channel')}
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                    <div className="flex justify-center items-center h-full py-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 py-20">
                        <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">{t('chat.no_messages')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUser.id;
                            const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId;

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3",
                                        isMe ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {showHeader ? (
                                        <Avatar className="h-8 w-8 mt-0.5 border border-white/5">
                                            <AvatarImage src={msg.sender?.profileImage} />
                                            <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                                                {msg.sender?.name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="w-8" /> // Spacer for alignment
                                    )}

                                    <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                        {showHeader && (
                                            <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-xs font-medium text-neutral-300">{msg.sender?.name}</span>
                                                <span className="text-[10px] text-neutral-500">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "rounded-xl px-4 py-2 text-sm leading-relaxed",
                                                isMe
                                                    ? "bg-white text-black font-medium"
                                                    : "bg-neutral-800 text-neutral-200"
                                            )}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-neutral-900 border-t border-white/5">
                {canSendMessages ? (
                    <form
                        onSubmit={handleSendMessage}
                        className="flex gap-2 items-center"
                    >
                        <div className="flex-1 relative">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={t('chat.placeholder')}
                                className="w-full pl-4 pr-4 h-10 bg-neutral-800 border-transparent text-white placeholder:text-neutral-500 rounded-lg focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/10 transition-all hover:bg-neutral-800/80"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newMessage.trim()}
                            className="h-10 w-10 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 transition-colors"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                ) : (
                    <div className="flex items-center justify-center gap-2 py-3 text-neutral-500 bg-neutral-800/50 rounded-lg border border-white/5">
                        <MessageSquareOff className="h-4 w-4" />
                        <span className="text-xs">{t('chat.restricted')}</span>
                    </div>
                )}
            </div>

            {/* Create Channel Dialog */}
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                <DialogContent className="bg-neutral-900 border-white/10 text-white sm:rounded-lg">
                    <DialogHeader>
                        <DialogTitle>{t('chat.create_channel')}</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            {t('chat.new_channel_placeholder')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Input
                                placeholder={t('chat.channel_name')}
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 h-10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsCreateChannelOpen(false)}
                            className="text-neutral-400 hover:text-white hover:bg-white/5"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateChannel}
                            disabled={!newChannelName.trim() || isCreatingChannel}
                            className="bg-white text-black hover:bg-neutral-200"
                        >
                            {t('chat.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
