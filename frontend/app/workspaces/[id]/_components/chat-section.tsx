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
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Send, Hash, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UserInfo } from '../_lib/types';

interface ChatSectionProps {
    workspaceId: string;
    currentUser: UserInfo | null;
}

export function ChatSection({ workspaceId, currentUser }: ChatSectionProps) {
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
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header with Channel Selector */}
            <div className="h-14 border-b flex items-center px-4 justify-between bg-card/50">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
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
                        <SelectTrigger className="w-[200px] font-medium border-none shadow-none focus:ring-0 bg-transparent hover:bg-muted/50 transition-colors">
                            <SelectValue placeholder={t('chat.channels')} />
                        </SelectTrigger>
                        <SelectContent>
                            {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                    <span className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        {channel.name}
                                    </span>
                                </SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem value="create_new" className="text-primary font-medium focus:text-primary">
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 opacity-50">
                        <MessageSquare className="h-12 w-12 mb-2" />
                        <p>{t('chat.no_messages')}</p>
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
                                        <Avatar className="h-8 w-8 mt-1">
                                            <AvatarImage src={msg.sender?.profileImage} />
                                            <AvatarFallback>{msg.sender?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="w-8" /> // Spacer for alignment
                                    )}

                                    <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                        {showHeader && (
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-sm font-medium">{msg.sender?.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "rounded-2xl px-4 py-2 text-sm",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-muted text-foreground rounded-tl-none"
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
            <div className="p-4 border-t bg-card/50">
                <form
                    onSubmit={handleSendMessage}
                    className="flex gap-2 items-center"
                >
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>

            {/* Create Channel Dialog */}
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('chat.create_channel')}</DialogTitle>
                        <DialogDescription>
                            {t('chat.new_channel_placeholder')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Input
                                placeholder={t('chat.channel_name')}
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateChannelOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateChannel}
                            disabled={!newChannelName.trim() || isCreatingChannel}
                        >
                            {t('chat.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
