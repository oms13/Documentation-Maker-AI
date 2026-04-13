// src/mockRepoData.js

export const fileContents = {
  'server/controllers/repo.controller.js': {
    language: 'javascript',
    code: `import crypto from 'crypto';\nimport { extractOwnerAndRepo } from '../utils/githubHelper.js';\n\nexport const repoIngest = async (req, res) => {\n  try {\n    const { url } = req.body;\n    const userToken = req.headers.authorization?.split(' ')[1] || null;\n    \n    console.log(\`Starting Enterprise Sync for: \${url}\`);\n    \n    // AST Pre-Compression & Chunking\n    // Map-Reduce Master Documentation\n    \n    res.json({ message: "Success" });\n  } catch (error) {\n    res.status(500).json({ error: "Failed to process" });\n  }\n};`
  },
  'server/middleware/repoMiddleware.js': {
    language: 'javascript',
    code: `export const validateGithubUrl = (req, res, next) => {\n  let { url } = req.body;\n  if (!url || typeof url !== 'string') {\n    return res.status(400).json({ error: "Required" });\n  }\n  \n  req.body.url = url.replace(/\\/$/, '').replace(/\\.git$/, '');\n  next();\n};`
  },
  'package.json': {
    language: 'json',
    code: `{\n  "name": "repomind-backend",\n  "version": "1.0.0",\n  "type": "module",\n  "dependencies": {\n    "express": "^4.18.2",\n    "mongoose": "^7.0.3",\n    "axios": "^1.3.5"\n  }\n}`
  },
  'README.md': {
    language: 'markdown',
    code: `# RepoMind Enterprise Backend\n\nThis is the core ingestion engine utilizing Dynamic TOON Batching and AST Pre-Compression.`
  }
};

export const fileTree = [
  {
    name: 'server',
    type: 'folder',
    children: [
      {
        name: 'controllers',
        type: 'folder',
        children: [
          { name: 'repo.controller.js', type: 'file', path: 'server/controllers/repo.controller.js' }
        ]
      },
      {
        name: 'middleware',
        type: 'folder',
        children: [
          { name: 'repoMiddleware.js', type: 'file', path: 'server/middleware/repoMiddleware.js' }
        ]
      }
    ]
  },
  { name: 'package.json', type: 'file', path: 'package.json' },
  { name: 'README.md', type: 'file', path: 'README.md' }
];