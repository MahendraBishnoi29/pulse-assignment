import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../socket";
import { useAuth } from "./AuthContext";

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isConnected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(
    () => isAuthenticated && !!token && (getSocket()?.connected ?? false)
  );

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      setTimeout(() => setIsConnected(false), 0);
      return;
    }

    const socket = connectSocket(token);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Set initial state
    if (socket.connected) setTimeout(() => setIsConnected(true), 0);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [token, isAuthenticated]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export { getSocket };
