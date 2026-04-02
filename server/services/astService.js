import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

export const chunkCodeIntelligently = (codeContent, filePath) => {
    const chunks = [];

    try {
        const ast = parse(codeContent, {
            sourceType: "module",
            plugins: ["jsx", "typescript"]
        });

        const addChunk = (path, type) => {
            const startNode = path.node.loc.start;
            const endNode = path.node.loc.end;

            const snippet = codeContent.slice(path.node.start, path.node.end);

            chunks.push({
                filePath: filePath,
                type: type,
                content: snippet,
                startLine: startNode.line,
                endLine: endNode.line
            });
        };

        traverse(ast, {
            FunctionDeclaration(path) {
                addChunk(path, 'Function');
            },
            ClassDeclaration(path) {
                addChunk(path, 'Class');
            },
            ArrowFunctionExpression(path) {
                if (path.parentPath.type === 'VariableDeclarator') {
                    addChunk(path.parentPath.parentPath, 'ArrowFunction');
                }
            },
            ClassMethod(path) {
                addChunk(path, 'Method');
            }
        });

    } catch (error) {
        console.warn(`⚠️ Skipped parsing ${filePath} due to syntax error: ${error.message}`);
    }

    return chunks;
};