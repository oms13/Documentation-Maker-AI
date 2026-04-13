// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import FloatingBackground from '../components/FloatingBackground.jsx';
import axios from 'axios';
import './Home.css';

// SVG Icons
const GithubIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.6 6-6.5a5.5 5.5 0 0 0-1.5-3.8 5.5 5.5 0 0 0-.2-3.8s-1.2-.4-3.9 1.4a12.8 12.8 0 0 0-7 0C6.2 1.6 5 2 5 2a5.5 5.5 0 0 0-.2 3.8A5.5 5.5 0 0 0 3 9.5c0 4.9 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path></svg>;
const ArrowRightIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const RepoIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;

const headings = ["Talk to your Repository", "Make Documentations", "Understand Complex Architecture"];

// 🚨 REGEX VALIDATOR: Checks for 'https://github.com/owner/repo' format
const githubUrlRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\.git)?\/?$/;

export default function Home() {
  const { isAuthenticated, loginWithGithub, logout, token } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('');
  const [headingIndex, setHeadingIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [myRepos, setMyRepos] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // 🚨 VALIDATION STATES
  const isUrlValid = githubUrlRegex.test(inputValue);
  const showError = inputValue.length > 0 && !isUrlValid;

  // Typing Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentWord = headings[headingIndex];
      if (!isDeleting && currentHeading === currentWord) setTimeout(() => setIsDeleting(true), 1500);
      else if (isDeleting && currentHeading === '') { setIsDeleting(false); setHeadingIndex((prev) => (prev + 1) % headings.length); }
      else setCurrentHeading(currentWord.substring(0, currentHeading.length + (isDeleting ? -1 : 1)));
    }, isDeleting ? 50 : 100);
    return () => clearTimeout(timer);
  }, [currentHeading, isDeleting, headingIndex]);

  // Fetch Repos
  useEffect(() => {
    if (isAuthenticated && token) {
      setIsLoadingRepos(true);
      axios.get('https://api.github.com/user/repos?sort=updated&per_page=15', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setMyRepos(response.data);
      })
      .catch(error => {
        console.error("Failed to fetch repositories:", error);
      })
      .finally(() => {
        setIsLoadingRepos(false);
      });
    }
  }, [isAuthenticated, token]);

  const handleAnalyze = (e) => {
    e?.preventDefault();
    if (!isUrlValid) return; // Block submission if invalid
    setIsAnimatingOut(true);
    setTimeout(() => navigate('/workspace', { state: { repoUrl: inputValue } }), 800);
  };

  const selectRepo = (repoPath) => {
    setInputValue(`https://github.com/${repoPath}`);
    setShowDropdown(false);
  };

  return (
    <div className="home-container">
      <FloatingBackground />
      
      <header className="home-header">
        <div className="logo">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="RepoMind" 
              className="brand-logo" 
              onError={() => setLogoError(true)} 
            />
          ) : (
            "RepoMind"
          )}
        </div>
        
        {!isAuthenticated ? (
          <button className="btn-primary" onClick={loginWithGithub}>
            <GithubIcon size={18} /> Login with GitHub
          </button>
        ) : (
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        )}
      </header>

      <main className="home-main">
        <h1 className="typing-heading">{currentHeading}<span className="cursor">|</span></h1>
        <p className="description">Paste a GitHub URL to instantly index your codebase. Ask questions, trace logic, and generate enterprise-grade documentation in seconds.</p>

        <div style={{ position: 'relative', width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'center' }}>
          
          <motion.div className="screen-wipe-void" initial={false} animate={isAnimatingOut ? { scale: 300, opacity: 1 } : { scale: 1, opacity: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'absolute', top: '50%', left: '50%', width: '20px', height: '20px', marginTop: '-10px', marginLeft: '-10px', borderRadius: '50%', backgroundColor: '#09090b', zIndex: 50, pointerEvents: 'none' }} />

          <motion.form className="input-form" onSubmit={handleAnalyze} animate={isAnimatingOut ? { opacity: 0, scale: 0.95, y: 10 } : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} style={{ position: 'relative', zIndex: 10, width: '100%' }}>
            
            {/* INPUT WRAPPER */}
            <div className={`input-wrapper ${showError ? 'has-error' : ''}`}>
              {isAuthenticated && (
                <div className="repo-selector" onClick={() => setShowDropdown(!showDropdown)}>
                  <GithubIcon size={16} />
                  <ChevronDownIcon />
                </div>
              )}

              <input 
                type="text" 
                placeholder="https://github.com/owner/repository" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                disabled={isAnimatingOut} 
              />
              {/* 🚨 DISABLE BUTTON IF INVALID */}
              <button 
                type="submit" 
                className="analyze-btn" 
                disabled={!isUrlValid || isAnimatingOut}
              >
                Analyze <ArrowRightIcon size={16} />
              </button>
            </div>

            {/* 🚨 ERROR MESSAGE ANIMATION */}
            <AnimatePresence>
              {showError && (
                <motion.div 
                  className="url-error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  Please enter a valid GitHub repository URL.
                </motion.div>
              )}
            </AnimatePresence>

            {/* THE DROPDOWN MENU */}
            <AnimatePresence>
              {showDropdown && isAuthenticated && (
                <motion.div 
                  className="repo-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="dropdown-header">Your Recent Repositories</div>
                  {isLoadingRepos && <div className="dropdown-empty">Loading repositories...</div>}
                  {!isLoadingRepos && myRepos.length === 0 && <div className="dropdown-empty">No repositories found.</div>}
                  <div className="dropdown-scroll-area">
                    {myRepos.map((repo) => (
                      <div key={repo.id} className="dropdown-item" onClick={() => selectRepo(repo.full_name)}>
                        <RepoIcon /> 
                        <span className="repo-name">{repo.full_name}</span>
                        <span className={`repo-badge ${repo.private ? 'private' : 'public'}`}>
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.form>
        </div>
      </main>
    </div>
  );
}