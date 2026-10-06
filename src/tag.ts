import {
	SimpleGit
} from 'simple-git';

// 拆分 tag 为 核心版本号 + 预发布段: 7.1.2 / 7.1 / v7.1.2-rc1
function parseTag(tag: string): {
	core: number[] | null,
	pre: string
} {
	const trimmed = tag.trim().replace(/^[vV]/, '');
	const versionMatch = trimmed.match(/^(\d+(?:\.\d+)*)(.*)$/);
	if (!versionMatch) {
		return {
			core: null,
			pre: ''
		};
	}
	return {
		core: versionMatch[1].split('.').map(Number),
		pre: versionMatch[2].replace(/^[-_.]/, '')
	};
}

// 版本号升序比较: 7.0.9 < 7.1 < 7.1.2, 预发布版小于同版本号的正式版 (7.1.2-rc1 < 7.1.2)
export function compareTagAsc(a: string, b: string): number {
	const tagA = parseTag(a);
	const tagB = parseTag(b);

	// 非版本形式的 tag (如 nightly) 排在所有版本号之前
	if (tagA.core === null || tagB.core === null) {
		if (tagA.core !== null) return 1;
		if (tagB.core !== null) return -1;
		return a < b ? -1 : a > b ? 1 : 0;
	}

	const length = Math.max(tagA.core.length, tagB.core.length);
	for (let i = 0; i < length; i++) {
		const coreA = tagA.core[i];
		const coreB = tagB.core[i];
		if (coreA === undefined) return -1;
		if (coreB === undefined) return 1;
		if (coreA !== coreB) return coreA - coreB;
	}

	// 核心版本号相同: 正式版大于预发布版 (7.1.2 > 7.1.2-rc1)
	if (tagA.pre === tagB.pre) return 0;
	if (tagA.pre === '') return 1;
	if (tagB.pre === '') return -1;
	return tagA.pre < tagB.pre ? -1 : 1;
}

export async function getTagList(git: SimpleGit): Promise < {
	latestTag: string | null,
	tags: string[]
} > {
	// 只能按版本号排序: 上游同一个批次发布的多个维护分支, 提交时间与版本号高低无关
	// (例如 7.1.2 的提交时间早于 4.7.37), 按提交时间排序会把 4.7.37 当成最新版本
	const tags = (await git.tags()).all;
	const sortedTags = tags.slice().sort(compareTagAsc);
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
