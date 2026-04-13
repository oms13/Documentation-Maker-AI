// src/pages/Workspace.jsx
import React, { useState, useEffect, useRef } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Workspace.css';

// --- SVGs for the IDE & Chat ---
const FolderIcon = ({ isOpen }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={isOpen ? "#60a5fa" : "#71717a"} stroke={isOpen ? "#60a5fa" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const FileIcon = ({ name }) => {
  let color = "#a1a1aa";
  if (name?.endsWith('.js') || name?.endsWith('.jsx')) color = "#f7df1e";
  if (name?.endsWith('.ts') || name?.endsWith('.tsx')) color = "#3178c6";
  if (name?.endsWith('.json')) color = "#22c55e";
  if (name?.endsWith('.md')) color = "#f3f4f6";
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
};
const ChevronIcon = ({ isOpen }) => <motion.svg animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></motion.svg>;
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const MessageIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const LoaderIcon = () => <svg className="spin-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg>;
const AlertIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const SparkleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;

// --- CUSTOM TYPEWRITER MARKDOWN COMPONENT ---
const TypewriterMarkdown = ({ content, isNew }) => {
  const [displayed, setDisplayed] = useState(isNew ? '' : content);

  useEffect(() => {
    if (!isNew) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 4; // Type 4 characters per frame for a smooth, fast read
      setDisplayed(content.slice(0, i));
      if (i >= content.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [content, isNew]);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        code({node, inline, className, children, ...props}) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter
              children={String(children).replace(/\n$/, '')}
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              className="custom-scrollbar" // 🚨 ADD THIS LINE!
              customStyle={{ borderRadius: '8px', margin: '16px 0', fontSize: '13px', background: '#111113' }}
              {...props}
            />
          ) : (
            <code className="inline-code" {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {displayed}
    </ReactMarkdown>
  );
};

// --- RECURSIVE FILE NODE COMPONENT ---
const FileNode = ({ node, level = 0, index = 0, activeFilePath, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isFolder = node.type === 'folder';
  const isActive = activeFilePath === node.path;
  const animDelay = (level * 0.1) + (index * 0.05);

  return (
    <motion.div 
      className="file-node-container"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: animDelay }}
    >
      {/* 🚨 Adjusted paddingLeft for the modern pill design */}
      <div className={`file-row ${isActive ? 'active' : ''}`} style={{ paddingLeft: `${level * 14 + 8}px` }} onClick={() => isFolder ? setIsOpen(!isOpen) : onSelectFile(node)}>
        <div className="file-icon-wrapper">{isFolder ? <ChevronIcon isOpen={isOpen} /> : <span style={{ width: 12 }} />}</div>
        {isFolder ? <FolderIcon isOpen={isOpen} /> : <FileIcon name={node.name} />}
        <span className="file-name">{node.name}</span>
      </div>
      {isFolder && (
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
              {node.children.map((child, i) => <FileNode key={i} index={i} node={child} level={level + 1} activeFilePath={activeFilePath} onSelectFile={onSelectFile} />)}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGithub, token } = useAuth();
  const repoUrl = location.state?.repoUrl;

  const hasFetched = useRef(false);
  const chatEndRef = useRef(null); 

  const [isIngesting, setIsIngesting] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(true); 
  const [ingestError, setIngestError] = useState(null);
  
  const [repoData, setRepoData] = useState(null);
  const [activeFile, setActiveFile] = useState(null);

  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isGeneratingReadme, setIsGeneratingReadme] = useState(false);
  
  // CHAT STATE
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('Thinking...');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    let interval;
    if (isChatLoading) {
      const statuses = [
        "Running vector search...",
        "Scanning codebase context...",
        "Analyzing code structures...",
        "Formulating professional response..."
      ];
      let i = 0;
      setLoadingStatusText(statuses[0]);
      interval = setInterval(() => {
        i = (i + 1) % statuses.length;
        setLoadingStatusText(statuses[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isChatLoading]);

  const buildRepoStructure = (filesArray) => {
    const fileContents = {};
    const fileTree = [];

    filesArray.forEach(file => {
      if (!file.path) return;
      const path = file.path;

      const ext = path.split('.').pop().toLowerCase();
      let lang = 'javascript';
      if (['ts', 'tsx'].includes(ext)) lang = 'typescript';
      else if (ext === 'json') lang = 'json';
      else if (ext === 'md') lang = 'markdown';
      else if (ext === 'py') lang = 'python';
      else if (ext === 'html') lang = 'html';
      else if (ext === 'css') lang = 'css';

      fileContents[path] = { language: lang, code: file.content };

      const parts = path.split('/');
      let currentLevel = fileTree;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let existingNode = currentLevel.find(node => node.name === part);

        if (existingNode) {
          if (!isFile) currentLevel = existingNode.children;
        } else {
          if (isFile) {
            currentLevel.push({ name: part, type: 'file', path: path });
          } else {
            const newFolder = { name: part, type: 'folder', children: [] };
            currentLevel.push(newFolder);
            currentLevel = newFolder.children;
          }
        }
      });
    });

    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) sortTree(node.children);
      });
    };
    sortTree(fileTree);

    return { fileTree, fileContents };
  };

  useEffect(() => {
    if (!repoUrl) {
      setIngestError("No repository URL provided.");
      setIsIngesting(false);
      setIsAnalyzing(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchRepo = async () => {
      setIsIngesting(true);
      setIngestError(null);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post('http://localhost:5001/api/repo/ingest', { url: repoUrl }, { headers });

        const rawFiles = response.data.files;
        const processedData = buildRepoStructure(rawFiles);
        setRepoData(processedData);

        if (processedData.fileTree.length > 0) {
          const firstFile = processedData.fileTree.find(node => node.type === 'file');
          if (firstFile) setActiveFile(firstFile);
          else if (processedData.fileTree[0].children) setActiveFile(processedData.fileTree[0].children[0]);
        }
      } catch (error) {
        console.error("Ingestion failed:", error);
        setIngestError(error.response?.data?.error || "Failed to analyze repository. It may be private or invalid.");
      } finally {
        setIsIngesting(false);
      }
    };

    fetchRepo();
  }, [repoUrl, token]);

  useEffect(() => {
    if (isIngesting || !repoUrl) return;
    let intervalId;

    const checkStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/api/repo/status?url=${encodeURIComponent(repoUrl)}&t=${Date.now()}`);
        if (res.data.status === 'ready') {
          setIsAnalyzing(false); 
          setChatMessages([{ 
            role: 'system', 
            content: `Repository loaded: **${repoUrl}**.\n\nThe AI has finished analyzing the codebase architecture. What would you like to know?`,
            isNew: true 
          }]);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Status check failed", err);
      }
    };

    intervalId = setInterval(checkStatus, 5000);
    checkStatus(); 
    return () => clearInterval(intervalId);
  }, [isIngesting, repoUrl]);

  const handleGenerateDocs = async () => {
    setIsGeneratingDocs(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('http://localhost:5001/api/repo/generate-docs', { url: repoUrl }, { headers });
      setChatMessages(prev => [...prev, { role: 'system', content: `### Master Documentation Generated\n\n${response.data.masterDocumentation}`, isNew: true }]);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to generate documentation.");
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleGenerateReadme = async () => {
    setIsGeneratingReadme(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('http://localhost:5001/api/repo/generate-readme', { url: repoUrl }, { headers });
      setChatMessages(prev => [...prev, { role: 'system', content: `### Suggested README.md\n\n${response.data.readme}`, isNew: true }]);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to generate README. Check if endpoint exists.");
    } finally {
      setIsGeneratingReadme(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isLocked || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput(''); 
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    setLoadingStatusText("Connecting to server..."); 

    try {
      const headers = { 
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}) 
      };

      const response = await fetch('http://localhost:5001/api/chat/ask', { 
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ question: userMessage, repoUrl: repoUrl })
      });

      if (!response.body) throw new Error("No readable stream available");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');
        
        for (const event of events) {
          if (event.startsWith('data: ')) {
            const data = JSON.parse(event.substring(6));
            
            if (data.type === 'status') {
              setLoadingStatusText(data.content); 
            } 
            else if (data.type === 'complete') {
              setChatMessages(prev => [...prev, { role: 'system', content: data.content.answer, isNew: true }]);
            } 
            else if (data.type === 'error') {
              setChatMessages(prev => [...prev, { role: 'system', content: `**Error:** ${data.content}`, isNew: true }]);
            }
          }
        }
      }

    } catch (error) {
      console.error("Chat streaming error:", error);
      setChatMessages(prev => [...prev, { role: 'system', content: "**Error:** Failed to connect to the AI. Please try again.", isNew: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const activeFileData = activeFile && repoData?.fileContents?.[activeFile.path]
    ? repoData.fileContents[activeFile.path]
    : { language: 'text', code: '// Select a file to view code' };

  const isLocked = isIngesting || isAnalyzing;

  return (
    <div className="workspace-container">
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1, ease: "easeInOut", delay: 0.1 }} style={{ position: 'fixed', inset: 0, backgroundColor: '#09090b', zIndex: 9999, pointerEvents: 'none' }} />

      <AnimatePresence>
        {ingestError && (
          <motion.div className="error-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="error-card">
              <AlertIcon />
              <h2>Analysis Failed</h2>
              <p>{ingestError}</p>
              <button className="btn-primary" onClick={() => navigate('/')}>← Back to Home</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="workspace-editor" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
        <div className="file-sidebar">
          <div className="sidebar-header">EXPLORER</div>
          <div className="file-tree custom-scrollbar">
            {isIngesting ? (
              <div className="skeleton-container">
                {[80, 60, 90, 50, 75].map((width, i) => (
                  <div key={i} className="skeleton-line pulse" style={{ width: `${width}%`, marginLeft: i > 2 ? '20px' : '0' }}></div>
                ))}
              </div>
            ) : (
              repoData?.fileTree?.map((node, i) => <FileNode key={i} index={i} node={node} activeFilePath={activeFile?.path} onSelectFile={setActiveFile} />)
            )}
          </div>
        </div>

        <div className="code-viewer">
          <div className="code-header">
            <div className="tab active">
              {isIngesting ? (
                <div className="skeleton-line pulse" style={{ width: '100px', margin: 0 }}></div>
              ) : (
                <><FileIcon name={activeFile?.name || ''} /> {activeFile?.name || 'Code'}</>
              )}
            </div>
          </div>

          <div className="code-breadcrumb">
            <span style={{ color: '#a1a1aa' }}>{repoUrl?.split('/').pop()}</span> 
            <span className="breadcrumb-separator">/</span> 
            {activeFile?.path?.split('/').map((part, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ color: i === arr.length - 1 ? '#e4e4e7' : 'inherit' }}>{part}</span>
                {i < arr.length - 1 && <span className="breadcrumb-separator">/</span>}
              </React.Fragment>
            )) || '...'}
          </div>

          <div className="code-content custom-scrollbar">
            {isIngesting ? (
              <div className="skeleton-container" style={{ padding: '32px 24px' }}>
                {[40, 80, 70, 90, 60, 80, 30].map((width, i) => (
                  <div key={i} className="skeleton-line pulse" style={{ width: `${width}%`, height: '14px', marginBottom: '16px' }}></div>
                ))}
              </div>
            ) : (
              <SyntaxHighlighter 
                language={activeFileData.language} 
                style={vscDarkPlus} 
                showLineNumbers={true} 
                customStyle={{ 
                  margin: 0, 
                  background: 'transparent', /* Deep black integration */
                  fontSize: '13.5px', 
                  lineHeight: '1.6', 
                  padding: '24px 0 40px 0', 
                  whiteSpace: 'pre'
                }}>
                {activeFileData.code}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div className="workspace-chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} style={{ position: 'relative' }}>
        <AnimatePresence>
          {isLocked && (
            <motion.div className="chat-lock-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoaderIcon />
              <p>{isIngesting ? "Fetching repository..." : "AI is analyzing the architecture..."}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="chat-header">
          <div className="chat-title"><MessageIcon /> <span>RepoMind Chat</span></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isAuthenticated && (
              <button className="btn-secondary" onClick={loginWithGithub} style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Login to save limits
              </button>
            )}
            <button className="btn-doc" onClick={handleGenerateReadme} disabled={isLocked || isGeneratingReadme}>
              {isGeneratingReadme ? '...' : 'Create README'}
            </button>
            <button className="btn-doc" onClick={handleGenerateDocs} disabled={isLocked || isGeneratingDocs}>
              {isGeneratingDocs ? '...' : 'Generate Docs'}
            </button>
          </div>
        </div>

        <div className="chat-history custom-scrollbar">
           {chatMessages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={idx} 
              className={`message ${msg.role}`}
            >
               {msg.role === 'user' ? (
                 <span>{msg.content}</span>
               ) : (
                 <>
                   <div className="ai-avatar"><SparkleIcon /></div>
                   <div className="message-content">
                     <TypewriterMarkdown content={msg.content} isNew={msg.isNew} />
                   </div>
                 </>
               )}
            </motion.div>
          ))}

          {isChatLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="message system">
              <div className="ai-avatar" style={{ background: '#27272a', boxShadow: 'none' }}><LoaderIcon /></div>
              <div className="loading-status-container">
                <span className="shimmer-text">{loadingStatusText}</span>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        <div className="chat-input-area">
          <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder={isLocked ? "Please wait for AI analysis..." : "Ask a question about the architecture..."} 
              disabled={isLocked || isChatLoading} 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="send-btn" disabled={isLocked || isChatLoading || !chatInput.trim()}>
              <SendIcon />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}