import {
	SimpleGit,
	LogResult,
	DefaultLogFields
} from 'simple-git';

export async function getCommitList(git: SimpleGit): Promise < {
	latest_commit: string | null,
	logmap: {
		id: string,
		msg: string
	} []
} > {
	const log: LogResult < DefaultLogFields > = await git.log();
	const logmap = log.all.map(commit => ({
		id: commit.hash,
		msg: commit.message
	}));
	const latest_commit = log.latest ? log.latest.hash : null;
	return {
		latest_commit,
		logmap
	};
}