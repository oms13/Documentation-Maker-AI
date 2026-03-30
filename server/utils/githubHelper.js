export const extractOwnerAndRepo = (url) => {
    const urlPart = url.replace('https://github.com/', '').split('/');
    return {
        owner: urlPart[0],
        repo: urlPart[1].replace('.git', '')
    };
};

export const filterRelevantFiles = (tree) => {
    const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'public', 'assets'];
    const IGNORED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.mp4', '.lock'];

    return tree.filter(item => {
        if (item.type !== 'blob') return false; 

        const filePath = item.path;
        const isIgnoredDir = IGNORED_DIRS.some(dir => filePath.startsWith(`${dir}/`) || filePath.includes(`/${dir}/`));
        const isIgnoredExt = IGNORED_EXTS.some(ext => filePath.endsWith(ext));

        return !isIgnoredDir && !isIgnoredExt;
    });
};