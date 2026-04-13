// src/services/astService.js
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const chunkFallback = (content, filePath) => {
    const chunks = [];

    // Split the file by double newlines (natural developer spacing)
    const blocks = content.split('\n\n');

    let currentChunkContent = [];
    let currentCharCount = 0;
    const MAX_CHUNK_LENGTH = 8000;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        currentChunkContent.push(block);
        currentCharCount += block.length;

        // Once our grouped blocks hit the token safety limit, seal the chunk!
        if (currentCharCount >= MAX_CHUNK_LENGTH || i === blocks.length - 1) {
            chunks.push({
                filePath: filePath,
                type: 'CodeBlock',
                content: currentChunkContent.join('\n\n'), // Glue the safe blocks back together
                startLine: 0, // Line numbers are less critical for fallback chunks
                endLine: 0
            });

            currentChunkContent = [];
            currentCharCount = 0;
        }
    }
    return chunks;
};

/**
 * STRATEGY B: Semantic Markdown Splitting
 * Splits cleanly at headers (##) so documentation context stays together.
 */
const chunkMarkdown = (content, filePath) => {
    // Regex splits the document right before any H1, H2, or H3
    const sections = content.split(/(?=^#{1,3}\s)/m);

    return sections.filter(sec => sec.trim().length > 0).map((section, index) => ({
        filePath: filePath,
        type: 'MarkdownSection',
        content: section.trim(),
        startLine: 0, // Markdown line numbers are less critical for AST
        endLine: 0
    }));
};

/**
 * STRATEGY A: AST Parsing for JavaScript / TypeScript
 */
const chunkWithAST = (content, filePath) => {
    const chunks = [];

    try {
        const ast = parse(content, {
            sourceType: "module",
            plugins: ["jsx", "typescript"]
        });

        const addChunk = (path, type) => {
            const startNode = path.node.loc.start;
            const endNode = path.node.loc.end;
            const snippet = content.slice(path.node.start, path.node.end);

            chunks.push({
                filePath: filePath,
                type: type,
                content: snippet,
                startLine: startNode.line,
                endLine: endNode.line
            });
        };

        traverse(ast, {
            FunctionDeclaration(path) { addChunk(path, 'Function'); },
            ClassDeclaration(path) { addChunk(path, 'Class'); },
            ArrowFunctionExpression(path) {
                if (path.parentPath.type === 'VariableDeclarator') {
                    addChunk(path.parentPath.parentPath, 'ArrowFunction');
                }
            },
            ClassMethod(path) { addChunk(path, 'Method'); }
        });

        // 🚨 IMPORTANT: If the file only had global variables/imports and NO functions,
        // the AST will return 0 chunks. We must pass it to the fallback so it isn't lost!
        if (chunks.length === 0) {
            return chunkFallback(content, filePath);
        }

        return chunks;

    } catch (error) {
        console.warn(`⚠️ Syntax error in ${filePath}. Bypassing AST and using safe fallback.`);
        return chunkFallback(content, filePath);
    }
};

/**
 * THE UNIVERSAL ROUTER
 * Takes any file and routes it to the correct chunking strategy.
 */
export const chunkCodeIntelligently = (codeContent, filePath) => {
    if (!codeContent) return [];

    const ext = filePath.split('.').pop().toLowerCase();

    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
        return chunkWithAST(codeContent, filePath);
    }
    else if (['md', 'mdx'].includes(ext)) {
        return chunkMarkdown(codeContent, filePath);
    }
    else {
        // For Python, Go, JSON, CSS, HTML, and everything else:
        return chunkFallback(codeContent, filePath);
    }
};