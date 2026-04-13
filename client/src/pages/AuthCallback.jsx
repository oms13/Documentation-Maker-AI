// src/pages/AuthCallback.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticate } = useAuth();
  
  // 🚨 THE FIX: A flag to prevent React StrictMode from double-firing the code
  const hasFetched = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && !hasFetched.current) {
      hasFetched.current = true; // Lock the gate. No more API calls allowed.

      axios.post('http://localhost:5001/api/auth/github', { code })
        .then(response => {
          authenticate(response.data.access_token);
          navigate('/'); 
        })
        .catch(error => {
          console.error("Authentication failed", error.response?.data || error.message);
          // If it fails, take them home anyway so they aren't stuck on a blank screen
          navigate('/'); 
        });
    } else if (!code) {
      navigate('/');
    }
  }, [searchParams, navigate, authenticate]);

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#09090b', color: 'white' }}>
      <p>Authenticating with GitHub...</p>
    </div>
  );
}