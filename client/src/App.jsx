// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid'; // 🚨 IMPORT MERMAID
import './App.css';

// --- 🚨 THE NEW MERMAID RENDERER COMPONENT ---
// We initialize it with a dark theme to match your beautiful UI
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
});

const MermaidChart = ({ chart }) => {
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      try {
        // Generate a random ID so multiple charts don't conflict
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (error) {
        console.error("Mermaid parsing error:", error);
        setSvgContent('<p style="color: #ef4444;">⚠️ Failed to render diagram. Syntax error.</p>');
      }
    };
    if (chart) renderChart();
  }, [chart]);

  return (
    <div 
      className="mermaid-wrapper" 
      style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}
      dangerouslySetInnerHTML={{ __html: svgContent }} 
    />
  );
};


function App() {
  // --- STATES ---
  const [repoUrl, setRepoUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [dbStats, setDbStats] = useState(null);
  const [error, setError] = useState(null);
  
  const [masterDoc, setMasterDoc] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! Paste a GitHub repository above to ingest it. I will generate a complete architectural breakdown, and then you can ask me anything about the codebase.' }
  ]);

  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- HANDLERS ---
  const handleProcessRepo = async () => {
    if (!repoUrl) return;
    setIsIngesting(true);
    setError(null);
    setDbStats(null);
    setMasterDoc('');

    try {
      const response = await axios.post('http://localhost:5001/api/repo/ingest', { url: repoUrl });
      
      setDbStats({
        chunks: response.data.totalChunksCreated,
        message: response.data.message
      });
      
      setMasterDoc(response.data.masterDocumentation);
      
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Documentation generated successfully! Read through the breakdown on the left, or ask me specific questions down below.` }]);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsIngesting(false);
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

      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: response.data.answer,
        sources: response.data.sources 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Connection error. Is the backend running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- 🚨 THE MARKDOWN RENDERER CONFIG ---
  // This intercepts code blocks. If the language is "mermaid", it draws the chart!
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      // If it is a block of Mermaid code, render our custom SVG component
      if (!inline && match && match[1] === 'mermaid') {
        return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
      }
      // Otherwise, render normal syntax-highlighted code
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };

  // --- RENDER ---
  return (
    <div className="app-layout">
      
      {/* LEFT PANEL: Control Center */}
      <div className="sidebar">
        <div className="branding">
          <h1>🧠 ClariMind</h1>
          <p>AI Codebase Architect</p>
        </div>

        <div className="ingest-box">
          <h3>1. Connect Repository</h3>
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={isIngesting}
          />
          <button onClick={handleProcessRepo} disabled={isIngesting || !repoUrl}>
            {isIngesting ? 'Analyzing & Documenting...' : 'Generate Documentation'}
          </button>
          {error && <div className="error-text">{error}</div>}
        </div>

        {dbStats && (
          <div className="stats-box">
            <h3>📊 Database Status</h3>
            <div className="stat-row"><span>Status:</span> <span className="green">Online</span></div>
            <div className="stat-row"><span>Chunks Embedded:</span> <span>{dbStats.chunks}</span></div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Dynamic Split View */}
      <div className="main-content-area">
        
        {/* CENTER PANEL: The Generated Documentation */}
        {masterDoc && (
          <div className="documentation-panel">
            <div className="doc-header">
              <h2>Architecture Overview</h2>
            </div>
            <div className="doc-body markdown-body">
              {/* 🚨 Pass the components config to the master doc */}
              <ReactMarkdown components={markdownComponents}>
                {masterDoc}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* RIGHT PANEL: The Chat Interface */}
        <div className={`chat-interface ${masterDoc ? 'split-mode' : 'full-mode'}`}>
          <div className="chat-window">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <div className="message-bubble">
                  <div className="message-text markdown-body">
                    {/* 🚨 Pass the components config to the chat too! */}
                    <ReactMarkdown components={markdownComponents}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources-box">
                      <strong>📄 Sources read:</strong>
                      <ul>
                        {msg.sources.map((src, i) => <li key={i}>{src}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message-wrapper ai">
                <div className="message-bubble typing-indicator">
                  Searching codebase & thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder={dbStats ? "Ask a specific question..." : "Generate documentation first!"}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!dbStats || isTyping}
            />
            <button type="submit" disabled={!dbStats || !chatInput.trim() || isTyping}>
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default App;