// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import './App.css';

// --- MERMAID CONFIGURATION ---
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidChart = ({ chart }) => {
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (error) {
        setSvgContent('<p class="error-text">⚠️ Failed to render diagram.</p>');
      }
    };
    if (chart) renderChart();
  }, [chart]);

  return (
    <div className="mermaid-wrapper" dangerouslySetInnerHTML={{ __html: svgContent }} />
  );
};

function App() {
  // --- UI STATES ---
  const [view, setView] = useState('home'); // 'home' | 'loading' | 'docs'
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // --- DATA STATES ---
  const [repoUrl, setRepoUrl] = useState('');
  const [masterDoc, setMasterDoc] = useState('');
  const [dbStats, setDbStats] = useState(null);
  const [error, setError] = useState(null);

  // --- CHAT STATES ---
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I have fully analyzed the repository. What specific architecture or logic would you like me to explain?' }
  ]);
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isChatOpen]);

  // --- HANDLERS ---
  const handleProcessRepo = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    setView('loading');
    setError(null);
    setMasterDoc('');
    setIsChatOpen(false); // Reset chat state on new ingest

    try {
      const response = await axios.post('http://localhost:5001/api/repo/ingest', { url: repoUrl });
      setDbStats({ chunks: response.data.totalChunksCreated });
      setMasterDoc(response.data.masterDocumentation);
      setView('docs');
    } catch (err) {
      setError(err.response?.data?.error || "Failed to connect to backend.");
      setView('home'); 
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !dbStats) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:5001/api/chat/ask', {
        question: userMsg,
        repoUrl: repoUrl 
      });
      setMessages(prev => [...prev, { role: 'ai', text: response.data.answer, sources: response.data.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Connection error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && match[1] === 'mermaid') {
        return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
      }
      return <code className={className} {...props}>{children}</code>;
    }
  };

  return (
    <div className="app-container">
      <div className="bg-animation"></div> {/*CHANGE IT WITH FactoryBackground*/}

      {/* --- HOME VIEW --- */}
      {view === 'home' && (
        <div className="home-view fade-in">
          <div className="hero-content">
            <div className="logo-badge">Documentaion AI</div>
            <h1 className="hero-title">Architectural Intelligence</h1>
            <p className="hero-subtitle">Paste a GitHub repository to automatically generate comprehensive documentation, architecture flows, and enable semantic codebase chat.</p>
            
            <form className="hero-search-box" onSubmit={handleProcessRepo}>
              <div className="input-wrapper">
                <svg className="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                <input 
                  type="text" 
                  placeholder="https://github.com/owner/repository" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={!repoUrl}>Generate</button>
            </form>
            {error && <div className="error-text slide-down">{error}</div>}
          </div>
        </div>
      )}

      {/* --- LOADING VIEW --- */}
      {view === 'loading' && (
        <div className="loading-view fade-in">
          <div className="loading-content slide-up-fast">
            <h2 className="loading-title">Analyzing Codebase...</h2>
            <p className="loading-subtitle">Extracting AST, generating vector embeddings, and synthesizing architecture.</p>
            <div className="skeleton-container">
              <div className="skeleton-header"></div>
              <div className="skeleton-line full"></div>
              <div className="skeleton-line full"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-box"></div>
              <div className="skeleton-line full"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN WORKSPACE (Docs & Chat) --- */}
      {view === 'docs' && (
        <div className={`workspace fade-in ${isChatOpen ? 'split-mode' : 'docs-mode'}`}>
          
          {/* 1. DOCUMENTATION PANEL (Dynamically resizes based on mode) */}
          <div className="docs-panel">
            <header className="docs-header">
              <div className="header-left">
                <span className="logo-text">Documentaion</span>
                <span className="header-divider">/</span>
                <span className="repo-name-display">{repoUrl.split('/').slice(-2).join('/')}</span>
              </div>
              
              {/* Dynamic Header Button */}
              <div className="header-right">
                {isChatOpen ? (
                  <button className="icon-btn tooltip-trigger" onClick={() => setIsChatOpen(false)}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    <span className="tooltip">Expand Docs</span>
                  </button>
                ) : (
                  <button className="primary-btn" onClick={() => setIsChatOpen(true)}>
                    <svg className="chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    Chat with Codebase
                  </button>
                )}
              </div>
            </header>

            <div className="docs-scroll-area">
              <div className="doc-body markdown-body">
                <ReactMarkdown components={markdownComponents}>
                  {masterDoc}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* 2. CHAT PANEL (Only renders when active) */}
          {isChatOpen && (
            <div className="chat-panel">
              <div className="chat-header">
                <h3>Codebase Copilot</h3>
                <span className="status-badge">🟢 Connected to Vector DB</span>
              </div>
              
              <div className="chat-messages">
                <div className="chat-messages-inner">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message-row ${msg.role}`}>
                      <div className="message-bubble">
                        <div className="message-text markdown-body">
                          <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="sources-box">
                            <strong>📄 Context Sources:</strong>
                            <ul>{msg.sources.map((src, i) => <li key={i}>{src}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="message-row ai">
                      <div className="message-bubble typing-indicator">
                        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Gemini-Style Centered Input Box */}
              <div className="chat-input-wrapper">
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Ask a question about the codebase architecture..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isTyping}
                  />
                  <button type="submit" disabled={!chatInput.trim() || isTyping}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  </button>
                </form>
                <div className="disclaimer">AI responses may contain inaccuracies. Verify critical code.</div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;