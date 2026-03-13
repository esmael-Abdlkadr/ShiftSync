'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import type { Session } from 'next-auth';

const SocketContext = createContext<Socket | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = (session as Session & { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token) return;

    const newSocket = io(`${API_URL}/events`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => setSocket(newSocket));
    newSocket.on('disconnect', () => setSocket(null));

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): Socket | null {
  return useContext(SocketContext);
}
