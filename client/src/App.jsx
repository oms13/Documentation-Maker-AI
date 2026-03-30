// Frontend: src/App.jsx
import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  const handleProcessRepo = async () => {
    if (!repoUrl) return;
    
    setIsLoading(true);
    setError(null);
    setResultData(null);

    try {
      const response = await axios.post(
        'http://localhost:5001/api/repo/ingest',
        { url: repoUrl }
      );
      
      setResultData(response.data);
      console.log("Success! Data stored in DBs:", response.data);
      
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🧠 Intelligent Documentation Engine</h1>
        <p>Paste a GitHub URL to auto-generate docs and save them to Vector Memory.</p>
      </header>

      <div className="input-section">
        <input
          type="text"
          className="repo-input"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={isLoading}
        />
        <button 
          className="analyze-btn" 
          onClick={handleProcessRepo} 
          disabled={isLoading || !repoUrl}
        >
          {isLoading ? 'Scanning & Embedding...' : 'Analyze & Store Codebase'}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <p>❌ {error}</p>
        </div>
      )}

      {resultData && resultData.documentedResults && (
        <div className="results-dashboard">
          <div className="stats-bar success-bar">
            <span>✅ {resultData.message}</span>
            <span>💾 {resultData.documentedResults.length} Chunks Embedded in Pinecone</span>
          </div>

          <div className="chunks-container">
            {resultData.documentedResults.map((chunk, index) => (
              <div key={index} className="chunk-card">
                <div className="chunk-header">
                  <div>
                    <span className="file-badge">{chunk.filePath}</span>
                    <span className="type-badge">{chunk.type}</span>
                  </div>
                  {/* This shows the actual Pinecone Math ID! */}
                  <span className="vector-badge" title="Pinecone Vector ID">
                    🧠 Vector: {chunk.pineconeId.slice(0, 8)}...
                  </span>
                </div>
                
                <div className="chunk-body">
                  <div className="code-block">
                    <h3>Raw Code</h3>
                    <pre><code>{chunk.content}</code></pre>
                  </div>

                  <div className="ai-block">
                    <h3>AI Explanation</h3>
                    <pre className="ai-markdown" style={{ whiteSpace: 'pre-wrap' }}>
                      {chunk.aiDocumentation}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;