// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // --- STATES ---
  const [repoUrl, setRepoUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [dbStats, setDbStats] = useState(null);
  const [error, setError] = useState(null);

  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! Paste a GitHub repository above to ingest it. Once embedded, you can ask me anything about the codebase.' }
  ]);

  // Auto-scroller for chat
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

    try {
      const response = await axios.post('http://localhost:5001/api/repo/ingest', { url: repoUrl });
      setDbStats({
        files: response.data.totalFilesProcessed,
        chunks: response.data.totalChunksCreated,
        message: response.data.message
      });
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Successfully ingested and embedded the repository! The codebase is now in my memory. What would you like to know?` }]);
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
        repoUrl: repoUrl // We pass the URL so Pinecone knows which project to search!
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

  // --- RENDER ---
  return (
    <div className="app-layout">
      
      {/* LEFT PANEL: Control Center */}
      <div className="sidebar">
        <div className="branding">
          <h1>🧠 ClariMind RAG</h1>
          <p>Intelligent Codebase Explorer</p>
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
            {isIngesting ? 'Embedding Vectors...' : 'Embed Codebase'}
          </button>
          {error && <div className="error-text">{error}</div>}
        </div>

        {dbStats && (
          <div className="stats-box">
            <h3>📊 Vector Database Status</h3>
            <div className="stat-row"><span>Status:</span> <span className="green">Online</span></div>
            <div className="stat-row"><span>Files Read:</span> <span>{dbStats.files}</span></div>
            <div className="stat-row"><span>Chunks Embedded:</span> <span>{dbStats.chunks}</span></div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Chat Interface */}
      <div className="chat-interface">
        <div className="chat-window">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className="message-bubble">
                {/* Text rendered with pre-wrap for Markdown spacing */}
                <pre className="message-text">{msg.text}</pre>
                
                {/* Render source files if the AI used them */}
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
                Searching Pinecone & Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Area */}
        <form className="input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder={dbStats ? "Ask a question about the codebase..." : "Ingest a repo first to start chatting!"}
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
  );
}

export default App;