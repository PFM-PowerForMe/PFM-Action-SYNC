import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

export function createGIT(targetDir: string): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
        baseDir: targetDir,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
    };
    return simpleGit(options);
}

export async function initGIT() {
    const git: SimpleGit = simpleGit();
    const gitUser = 'GH_Action-Upstream_Sync';
    const gitEmail = 'powerforme-action@users.noreply.github.com';

    await git.addConfig('user.name', gitUser, false, 'global');
    await git.addConfig('user.email', gitEmail, false, 'global');
}