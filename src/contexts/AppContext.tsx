import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  purpose?: string; // Legacy field for backward compatibility
  createdBy: string;
  createdAt: string;
  role: 'omni' | 'crew' | 'org_admin';
}

interface AppContextType {
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        apiClient.setToken(token);
        const userResult = await apiClient.getMe();
        setUser(userResult.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const refreshWorkspaces = async () => {
    try {
      const result = await apiClient.getWorkspaces();
      setWorkspaces(result.workspaces);
      // Set current workspace if none is selected, or if current one no longer exists
      if (result.workspaces.length > 0) {
        if (!currentWorkspace) {
          setCurrentWorkspace(result.workspaces[0]);
        } else {
          // Check if current workspace still exists in the list
          const stillExists = result.workspaces.find(ws => ws._id === currentWorkspace._id);
          if (!stillExists) {
            setCurrentWorkspace(result.workspaces[0]);
          } else {
            // Update current workspace data in case it changed
            const updated = result.workspaces.find(ws => ws._id === currentWorkspace._id);
            if (updated) {
              setCurrentWorkspace(updated);
            }
          }
        }
      } else {
        setCurrentWorkspace(null);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          apiClient.setToken(token);
          socketClient.connect(token);

          const userResult = await apiClient.getMe();
          setUser(userResult.user);

          await refreshWorkspaces();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen for workspace membership changes
    socketClient.on('workspace:membership:changed', () => {
      refreshWorkspaces();
    });
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      socketClient.joinWorkspace(currentWorkspace._id);
    }
    return () => {
      if (currentWorkspace) {
        socketClient.leaveWorkspace(currentWorkspace._id);
      }
    };
  }, [currentWorkspace]);

  const logout = () => {
    localStorage.removeItem('token');
    apiClient.setToken(null);
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    window.location.href = '/auth';
  };

  return (
    <AppContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        loading,
        refreshWorkspaces,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

