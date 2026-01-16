/**
 * 워크스페이스 이벤트 (캘린더 일정)
 */

import { UserInfo } from "./user";
import { Workspace } from "./workspace";

export interface WorkspaceEvent {
    id: string;
    workspaceId: string;
    workspace?: Workspace;
    title: string;
    description?: string;
    startTime: string; // ISO Date String
    endTime?: string;  // ISO Date String
    isAllDay: boolean;
    color?: string;
    createdById?: string;
    createdBy?: UserInfo;
    meetingSessionId?: string;
}
