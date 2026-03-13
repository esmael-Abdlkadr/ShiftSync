'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [, setConnected] = useState(false);

  useEffect(() => {
    const token = (session as any)?.accessToken as string | undefined;
    if (!token) return;

    const socket = io(`${API_URL}/events`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [(session as any)?.accessToken]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): Socket | null {
  return useContext(SocketContext);
}
