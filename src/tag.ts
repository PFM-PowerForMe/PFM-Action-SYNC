import {
	SimpleGit
} from 'simple-git';

export async function getTagList(git: SimpleGit): Promise < {
	latestTag: string | null,
	tags: string[]
} > {
	const tagResult = await git.tags();
	const tags = tagResult.all;

	// 获取创建时间并排序
	const tagsWithDates = await Promise.all(tags.map(async (tag) => {
		const tagLog = await git.show([tag]);
		const dateMatch = tagLog.match(/Date:\s+(.*)/);
		const date = dateMatch ? new Date(dateMatch[1]) : null;
		return {
			tag,
			date
		};
	}));

	tagsWithDates.sort((a, b) => (a.date && b.date) ? a.date.getTime() - b.date.getTime() : 0);
	const sortedTags = tagsWithDates.map(({
		tag
	}) => tag);
	const latestTag = sortedTags.length > 0 ? sortedTags[sortedTags.length - 1] : null;

	return {
		latestTag,
		tags: sortedTags
	};
}

export function findTagIndex(targetTag: string, upstreamTags: string[]): number {
	// 直接比较目标 tag 与上游 tag 列表中的每个 tag
	return upstreamTags.indexOf(targetTag);
}