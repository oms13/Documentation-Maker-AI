export const extractOwnerAndRepo = (url) => {
    try {
        let cleanUrl = String(url).trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        cleanUrl = cleanUrl.replace(/\.git$/, '').replace(/\/$/, '');

        const parsedUrl = new URL(cleanUrl);
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) {
            throw new Error("URL does not contain an owner and repository.");
        }
        return {
            owner: pathParts[0],
            repo: pathParts[1]
        };
    } catch (error) {
        throw new Error(`Failed to extract repository details: ${error.message}`);
    }
};

export const filterRelevantFiles = (tree) => {
    const IGNORED_DIRS = [
        'node_modules', 'bower_components', 'dist', 'build', 'out', '.next', '.nuxt', '.cache', 'public', 'assets', 'vendor',
        '__pycache__', 'venv', '.venv', 'env', '.env', '.pytest_cache', '.ipynb_checkpoints', 'wandb', 'weights', 'checkpoints',
        'Pods', '.gradle', 'DerivedData', 'bin', 'obj', 'target', 'Debug', 'Release',
        '.idea', '.vscode', 'coverage', 'logs' , 'package-lock.json', 'package.json' , 'README.md', '.gitignore'
    ];
    
    const IGNORED_EXTS = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif', '.mp4', '.mp3', '.wav', '.mov', '.ttf', '.woff', '.woff2', '.eot', '.otf',
        '.pth', '.pt', '.h5', '.hdf5', '.pkl', '.onnx', '.pb', '.tflite', '.csv', '.tsv', '.parquet', '.tfrecord', '.sqlite', '.db',
        '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.war', '.apk', '.aab', '.ipa', '.o', '.a', '.lib', '.pyc', '.pyo', '.pyd',
        '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', '.lock', '.min.js', '.min.css', '.map', '.css'
    ];

    const MAX_FILE_SIZE_BYTES = 500000; 

    return tree.filter(item => {
        if (item.type !== 'blob') return false;

        if (item.size !== undefined && item.size > MAX_FILE_SIZE_BYTES) {
            return false;
        }

        const filePath = item.path;
        const pathParts = filePath.split('/');
        
        const isIgnoredDir = IGNORED_DIRS.some(dir => pathParts.includes(dir));
        const isIgnoredExt = IGNORED_EXTS.some(ext => filePath.toLowerCase().endsWith(ext));
        const isHiddenOSFile = pathParts.some(part => part === '.DS_Store' || part === 'Thumbs.db');

        return !isIgnoredDir && !isIgnoredExt && !isHiddenOSFile;
    });
};

export const minifyCodeForAI = (code) => {
    if (!code) return "";
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments (/* ... */)
        .replace(/\/\/.*/g, '')           // Remove single-line comments (// ...)
        .replace(/\s+/g, ' ')             // Collapse all multiple spaces/newlines into a single space
        .trim();
};