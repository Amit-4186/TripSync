import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext();

function safeParse(raw) {
  try {
    if (!raw || raw === "undefined") return null; // guard
    return JSON.parse(raw);
  } catch {
    console.warn("Invalid JSON in localStorage for ts_user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeParse(localStorage.getItem("ts_user")));

  const isAuthenticated = Boolean(user);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const payload = res?.data?.data || res?.data || {};
    const accessToken = payload.accessToken;
    const u = payload.user;

    if (!accessToken || !u) {
      throw new Error("Malformed login response");
    }

    localStorage.setItem("ts_access_token", accessToken);
    localStorage.setItem("ts_user", JSON.stringify(u));
    setUser(u);
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const payload = res?.data?.data || res?.data || {};
    const accessToken = payload.accessToken;
    const u = payload.user;

    if (!accessToken || !u) {
      throw new Error("Malformed register response");
    }

    localStorage.setItem("ts_access_token", accessToken);
    localStorage.setItem("ts_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {
        refreshToken: localStorage.getItem("ts_refresh_token"),
      });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("ts_access_token");
      localStorage.removeItem("ts_refresh_token");
      localStorage.removeItem("ts_user");
      setUser(null);
    }
  };

  useEffect(() => {
    const onStorage = () => {
      setUser(safeParse(localStorage.getItem("ts_user")));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
