// src/services/astService.js
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

// Fix for ES Modules importing CommonJS packages
const traverse = traverseModule.default || traverseModule;

/**
 * Takes raw code text and extracts logical chunks using Babel
 */
export const chunkCodeIntelligently = (codeContent, filePath) => {
    const chunks = [];

    try {
        // 1. Convert code to AST. We enable 'jsx' plugin so it understands React!
        const ast = parse(codeContent, {
            sourceType: "module",
            plugins: ["jsx", "typescript"] // Safely handles modern JS/TS/React
        });

        // Helper function to format the chunk
        const addChunk = (path, type) => {
            const startNode = path.node.loc.start;
            const endNode = path.node.loc.end;
            
            // Slice the exact text from the original file using character indexes
            const snippet = codeContent.slice(path.node.start, path.node.end);

            chunks.push({
                filePath: filePath,
                type: type,
                content: snippet,
                startLine: startNode.line,
                endLine: endNode.line
            });
        };

        // 2. Walk the tree looking for specific logic blocks
        traverse(ast, {
            // Standard functions: function doSomething() {}
            FunctionDeclaration(path) {
                addChunk(path, 'Function');
            },
            // Classes: class User {}
            ClassDeclaration(path) {
                addChunk(path, 'Class');
            },
            // Arrow functions: const doSomething = () => {}
            ArrowFunctionExpression(path) {
                // We grab the parent so we get the variable name too, not just the '() => {}' part
                if (path.parentPath.type === 'VariableDeclarator') {
                    addChunk(path.parentPath.parentPath, 'ArrowFunction');
                }
            },
            // Class methods: render() {}
            ClassMethod(path) {
                addChunk(path, 'Method');
            }
        });

    } catch (error) {
        // If a file has totally broken syntax, we just log it and skip it
        console.warn(`⚠️ Skipped parsing ${filePath} due to syntax error: ${error.message}`);
    }

    return chunks;
};