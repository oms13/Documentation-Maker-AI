// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check local storage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('repomind_github_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const loginWithGithub = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'PASTE_YOUR_ACTUAL_CLIENT_ID_HERE'; 
    const REDIRECT_URI = 'http://localhost:5173/auth/callback';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
  };

  const logout = () => {
    localStorage.removeItem('repomind_github_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  // Called by the callback page after GitHub redirects back
  const authenticate = (newToken) => {
    localStorage.setItem('repomind_github_token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, isLoading, loginWithGithub, logout, authenticate }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};