import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string; // donor, recipient, hospital_ngo, admin
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, full_name: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateUserRoleInContext: (newRole: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Perform self validation check on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.get("/auth/me");
          setUser(res.data);
        } catch (err) {
          console.error("Auth check failed, logging out:", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, user: loggedUser } = res.data;
      
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(loggedUser);
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, full_name: string, password: string, role: string) => {
    setLoading(true);
    try {
      await api.post("/auth/signup", { email, full_name, password, role });
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUserRoleInContext = (newRole: string) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUserRoleInContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
