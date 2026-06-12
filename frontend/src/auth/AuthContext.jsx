import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [activeGroup, setActiveGroupState] = useState(() => {
    const raw = localStorage.getItem("activeGroup");
    return raw ? JSON.parse(raw) : null;
  });
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!token) {
        setBooting(false);
        setUser(null);
        return;
      }

      try {
        const profile = await api.me();
        if (!cancelled) {
          setUser(profile);
          if (profile.role === "ADMIN") {
            localStorage.removeItem("activeGroup");
            setActiveGroupState(null);
          }
        }
      } catch {
        localStorage.removeItem("token");
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function setSession(nextToken, nextUser) {
    localStorage.setItem("token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser?.role === "ADMIN") {
      localStorage.removeItem("activeGroup");
      setActiveGroupState(null);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("activeGroup");
    setToken(null);
    setUser(null);
    setActiveGroupState(null);
  }

  function setActiveGroup(group) {
    if (group) {
      localStorage.setItem("activeGroup", JSON.stringify(group));
    } else {
      localStorage.removeItem("activeGroup");
    }
    setActiveGroupState(group);
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  const value = useMemo(() => {
    const isLeader = Boolean(
      user?.role === "STUDENT" && activeGroup?.leaderId === user.id
    );

    return {
      token,
      user,
      activeGroup,
      isLeader,
      booting,
      setSession,
      setActiveGroup,
      updateUser,
      logout
    };
  }, [token, user, activeGroup, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
