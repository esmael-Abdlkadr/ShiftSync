'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Socket } from 'socket.io-client';

export function useSocket(): Socket | null {
  return useSocketContext();
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void {
  const socket = useSocketContext();
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) return;

    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => {
      socket.off(event, cb);
    };
  }, [socket, event]);
}
