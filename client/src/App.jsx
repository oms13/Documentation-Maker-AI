// Frontend: React Component
import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');

  const handleProcessRepo = async () => {
    try {
      // Send the URL to your Express backend
      const response = await axios.post(
        'http://localhost:5001/api/repo/ingest',
        { url: repoUrl }
      );
      
      // Axios automatically parses JSON! We just read response.data
      console.log("Repo processed successfully:", response.data);
      
    } catch (error) {
      // Axios puts backend error messages in error.response.data
      console.error("Error processing repo:", error.response?.data || error.message);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Paste public GitHub URL..."
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
      />
      <button onClick={handleProcessRepo}>Analyze Codebase</button>
    </div>
  );
}

export default App;