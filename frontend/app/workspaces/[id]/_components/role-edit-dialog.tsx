'use client';

import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Phone,
    Calendar,
    FolderUp,
    Shield,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WorkspaceRole, MemberPermissions } from '@/lib/types/workspace';

interface RoleEditDialogProps {
    role: WorkspaceRole | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (role: Partial<WorkspaceRole> & { id?: string }) => Promise<void>;
    isNew?: boolean;
}

interface PermissionItem {
    key: keyof MemberPermissions;
    icon: React.ReactNode;
    labelKey: string;
    descKey: string;
}

const PERMISSION_ITEMS: PermissionItem[] = [
    {
        key: 'sendMessages',
        icon: <MessageSquare className="h-4 w-4" />,
        labelKey: 'send_messages',
        descKey: 'send_messages_desc',
    },
    {
        key: 'joinCalls',
        icon: <Phone className="h-4 w-4" />,
        labelKey: 'join_calls',
        descKey: 'join_calls_desc',
    },
    {
        key: 'editCalendar',
        icon: <Calendar className="h-4 w-4" />,
        labelKey: 'edit_calendar',
        descKey: 'edit_calendar_desc',
    },
    {
        key: 'uploadFiles',
        icon: <FolderUp className="h-4 w-4" />,
        labelKey: 'upload_files',
        descKey: 'upload_files_desc',
    },
    {
        key: 'managePermissions',
        icon: <Shield className="h-4 w-4" />,
        labelKey: 'manage_permissions',
        descKey: 'manage_permissions_desc',
    },
];

const DEFAULT_PERMISSIONS: MemberPermissions = {
    sendMessages: true,
    joinCalls: true,
    editCalendar: true,
    uploadFiles: true,
    managePermissions: false,
};

export function RoleEditDialog({
    role,
    open,
    onOpenChange,
    onSave,
    isNew = false,
}: RoleEditDialogProps) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<MemberPermissions>(DEFAULT_PERMISSIONS);
    const [isDefault, setIsDefault] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setName(role.name);
            setPermissions(role.permissions);
            setIsDefault(role.isDefault || false);
        } else {
            setName('');
            setPermissions(DEFAULT_PERMISSIONS);
            setIsDefault(false);
        }
    }, [role, open]);

    const handleToggle = (key: keyof MemberPermissions) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onSave({
                id: role?.id,
                name: name.trim(),
                permissions,
                isDefault,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving role:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] bg-neutral-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? t('roles.add') : t('roles.edit')}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isNew ? '새 역할 생성' : '역할 편집'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Role Name */}
                    <div className="space-y-2">
                        <Label htmlFor="role-name" className="text-neutral-300">{t('roles.name')}</Label>
                        <Input
                            id="role-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('roles.name_placeholder')}
                            disabled={role?.isSystem}
                            className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20"
                        />
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                        <Label className="text-neutral-300">{t('roles.permissions')}</Label>
                        <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
                            {PERMISSION_ITEMS.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 text-neutral-400">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-200">
                                                {t(`roles.${item.labelKey}`)}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {t(`roles.${item.descKey}`)}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={permissions[item.key]}
                                        onCheckedChange={() => handleToggle(item.key)}
                                        className="data-[state=checked]:bg-indigo-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Default Role Toggle */}
                    {!role?.isSystem && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors border border-white/10 bg-white/[0.02]">
                            <Label htmlFor="is-default" className="text-sm font-normal cursor-pointer text-neutral-300">
                                {t('roles.set_default')}
                            </Label>
                            <Switch
                                id="is-default"
                                checked={isDefault}
                                onCheckedChange={(checked) => setIsDefault(checked)}
                                className="data-[state=checked]:bg-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="bg-white text-black hover:bg-neutral-200"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('roles.saving')}
                            </>
                        ) : (
                            t('roles.save')
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
