'use client';

/**
 * WebSocket 컨텍스트
 * 
 * 애플리케이션 전체에서 단일 WebSocket 연결을 관리합니다.
 * - 싱글톤 소켓 인스턴스
 * - 자동 재연결
 * - 연결 상태 관리
 * - 룸(채널) 기반 구독
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/lib/config';

/**
 * 소켓 연결 상태
 */
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 소켓 컨텍스트 타입
 */
interface SocketContextType {
  /** 소켓 인스턴스 */
  socket: Socket | null;
  /** 연결 상태 */
  connectionState: SocketConnectionState;
  /** 연결 여부 */
  isConnected: boolean;
  /** 룸 참가 */
  joinRoom: (room: string) => void;
  /** 룸 나가기 */
  leaveRoom: (room: string) => void;
  /** 이벤트 리스너 등록 */
  on: <T>(event: string, callback: (data: T) => void) => () => void;
  /** 이벤트 발송 */
  emit: (event: string, data?: unknown) => void;
  /** 이벤트 발송 (서버 응답 대기) */
  emitWithAck: <T = unknown>(event: string, data?: unknown, timeout?: number) => Promise<T>;
}

const SocketContext = createContext<SocketContextType | null>(null);

/**
 * 소켓 컨텍스트 훅
 */
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * 소켓 연결 여부만 확인하는 훅 (간편 사용)
 */
export function useSocketConnection(): { isConnected: boolean; connectionState: SocketConnectionState } {
  const { isConnected, connectionState } = useSocket();
  return { isConnected, connectionState };
}

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * 소켓 프로바이더
 * 
 * @example
 * // app/layout.tsx
 * import { SocketProvider } from '@/contexts/SocketContext';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SocketProvider>
 *           {children}
 *         </SocketProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * 
 * // 컴포넌트에서 사용
 * function MyComponent() {
 *   const { isConnected, joinRoom, on } = useSocket();
 *   
 *   useEffect(() => {
 *     joinRoom(`workspace:${workspaceId}`);
 *     const unsubscribe = on('session:update', (data) => {
 *       console.log('Session updated:', data);
 *     });
 *     return unsubscribe;
 *   }, []);
 * }
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  // emitWithAck 타이머 메모리 릭 방지를 위한 pending timeout 추적
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // 소켓 초기화
  useEffect(() => {
    console.log('[Socket] Initializing socket to:', config.socketUrl);

    const socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: config.socketReconnectAttempts,
      reconnectionDelay: config.socketReconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true, // Chrome 호환성을 위해 추가
    });

    // 디버깅: 모든 이벤트 로깅
    socket.onAny((event, ...args) => {
      console.log(`[Socket] Event received: ${event}`, args);
    });

    socket.onAnyOutgoing((event, ...args) => {
      console.log(`[Socket] Event sent: ${event}`, args);
    });

    socketRef.current = socket;
    setSocket(socket);
    setConnectionState('connecting');

    // 연결 이벤트
    socket.on('connect', () => {
      setConnectionState('connected');
      console.log('[Socket] Connected:', socket.id);

      // Debug: test ping to verify socket is working
      socket.emit('ping', { test: true, timestamp: Date.now() }, (response: unknown) => {
        console.log('[Socket] Ping response:', response);
      });

      // 재연결 시 이전에 참가했던 룸에 다시 참가
      joinedRoomsRef.current.forEach((room) => {
        socket.emit('joinRoom', { room });
      });
    });

    // 연결 해제 이벤트
    socket.on('disconnect', (reason) => {
      setConnectionState('disconnected');
      console.log('[Socket] Disconnected:', reason);
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      setConnectionState('error');
      console.error('[Socket] Connection error:', error.message, error);
    });

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      setConnectionState('connecting');
      console.log('[Socket] Reconnecting... attempt:', attemptNumber);
    });

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      setConnectionState('connected');
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    // 클린업
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      joinedRoomsRef.current.clear();
      // 모든 pending timeout 정리 (메모리 릭 방지)
      pendingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTimeoutsRef.current.clear();
    };
  }, []);

  // 룸 참가
  const joinRoom = useCallback((room: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('joinRoom', { room });
      joinedRoomsRef.current.add(room);
      console.log('[Socket] Joined room:', room);
    } else {
      // 연결되면 자동으로 참가하도록 저장
      joinedRoomsRef.current.add(room);
    }
  }, []);

  // 룸 나가기
  const leaveRoom = useCallback((room: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('leaveRoom', { room });
      console.log('[Socket] Left room:', room);
    }
    joinedRoomsRef.current.delete(room);
  }, []);

  // 이벤트 리스너 등록 (자동 클린업 반환)
  // connectionState를 의존성에 추가하여 소켓 연결 시 콜백이 재생성되도록 함
  const on = useCallback(<T,>(event: string, callback: (data: T) => void): (() => void) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    }
    console.warn('[Socket] Cannot subscribe to event - socket not initialized:', event);
    return () => {};
  }, [connectionState]);

  // 이벤트 발송
  const emit = useCallback((event: string, data?: unknown) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit - not connected');
    }
  }, []);

  // 이벤트 발송 (서버 응답 대기) - Promise 기반 acknowledgement
  const emitWithAck = useCallback(<T = unknown,>(event: string, data?: unknown, timeout: number = 5000): Promise<T> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      console.log(`[Socket] emitWithAck called: event='${event}', socket=${socket?.id}, connected=${socket?.connected}`);

      if (!socket?.connected) {
        console.error(`[Socket] emitWithAck failed: Socket not connected`);
        reject(new Error('Socket not connected'));
        return;
      }

      console.log(`[Socket] Sending event '${event}' to server...`);

      // 타임아웃 설정 (메모리 릭 방지를 위해 추적)
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current.delete(timeoutId);
        console.error(`[Socket] emitWithAck timeout for event '${event}' after ${timeout}ms`);
        reject(new Error(`Socket emit timeout for event: ${event}`));
      }, timeout);
      pendingTimeoutsRef.current.add(timeoutId);

      // Socket.IO acknowledgement callback
      socket.emit(event, data, (response: T) => {
        pendingTimeoutsRef.current.delete(timeoutId);
        clearTimeout(timeoutId);
        console.log(`[Socket] emitWithAck response for '${event}':`, response);
        resolve(response);
      });
    });
  }, []);

  const value: SocketContextType = {
    socket,
    connectionState,
    isConnected: connectionState === 'connected',
    joinRoom,
    leaveRoom,
    on,
    emit,
    emitWithAck,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
