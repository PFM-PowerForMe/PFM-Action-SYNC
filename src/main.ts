import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	updateRepositoryVariable
} from './variable';
import {
	minimatch
} from 'minimatch';
import {
	createGIT,
	initGIT
} from './git';
import {
	getCommitList
} from './commit';
import {
	getTagList,
	findTagIndex
} from './tag';
import {
	initCONFIG
} from './env';
import {
	addStepSummary
} from './summary';

async function run() {
	try {
		await initGIT();
		const config = initCONFIG();
		const aDir = `${config.local_WORKDIR}/A`;
		const bDir = `${config.local_WORKDIR}/B`;
		const git = createGIT(config.local_WORKDIR);
		await git.clone(config.upstream_REPOURL, aDir, {
			'--tags': null,
			'--branch': config.upstream_BRANCH
		});
		await git.clone(config.target_REPOURL, bDir, {
			'--tags': null,
			'--branch': config.target_BRANCH
		});

		const gitA = createGIT(aDir);
		const gitB = createGIT(bDir);

		// 获取各自分支提交历史
		const {
			latest_commit: latest_commitA,
			logmap: commitsA
		} = await getCommitList(gitA);
		const {
			latest_commit: latest_commitB,
			logmap: commitsB
		} = await getCommitList(gitB);

		let commit_sync_mode = 'noting';
		if (latest_commitA === latest_commitB) {
			addStepSummary('上游分支和目标分支完全同步');
			core.info('上游分支和目标分支完全同步');
			core.setOutput('has_new_commits', 'false');
		} else {
			const idx = commitsA.findIndex(c => c.id === latest_commitB);
			if (idx === -1) {
				addStepSummary(`目标分支 tip ${latest_commitB} 不在上游分支历史中，可能有分叉或回退`);
				core.info(`目标分支 tip ${latest_commitB} 不在上游分支历史中，可能有分叉或回退`);
				commit_sync_mode = 'force';
				core.setOutput('has_new_commits', 'true');
			} else {
				const newCommits = commitsA.slice(0, idx);
				addStepSummary(`目标分支最新提交 ${latest_commitB} 之后，上游分支新增 ${newCommits.length} 个提交:`);
				core.info(`目标分支最新提交 ${latest_commitB} 之后，上游分支新增 ${newCommits.length} 个提交:`);
				newCommits.forEach(c => {
					addStepSummary(`${c.id}: ${c.msg}`);
					core.info(`${c.id}: ${c.msg}`);
				});
				commit_sync_mode = 'normal';
				core.setOutput('has_new_commits', 'true');
			}
		}

		let tag_sync_mode = 'noting';
		const {
			latestTag: latestTagA,
			tags: tagsA
		} = await getTagList(gitA);
		const {
			latestTag: latestTagB,
			tags: tagsB
		} = await getTagList(gitB);

		core.info(`上游仓库最新TAG: ${latestTagA}`);
		core.info(`目标仓库最新TAG: ${latestTagB}`);

		let newTags: string[] = [];

		if (tagsB.length === 0 && tagsA.length > 0) {
			addStepSummary(`目标仓库没有任何 tag，上游仓库的所有 tag 都是新增的，共 ${tagsA.length} 个：`);
			addStepSummary(`新增的 tag: ${tagsA.join(', ')}`);
			core.info(`目标仓库没有 tag，上游仓库的所有 tag: ${tagsA.join(', ')}`);
			tag_sync_mode = 'force';
			newTags = tagsA;
		} else if (tagsA.length === 0 && tagsB.length > 0) {
			addStepSummary(`上游仓库没有任何 tag，目标仓库的 tag 建议全部移除或等待上游补充 tag 后覆盖。`);
			core.info(`上游仓库没有 tag，目标仓库的 tag: ${tagsB.join(', ')}，建议用上游 tag 覆盖。`);
			tag_sync_mode = 'force';
		} else if (latestTagA === latestTagB) {
			addStepSummary('目标仓库与上游仓库的最新 tag 完全同步');
			core.info('目标仓库与上游仓库的最新 tag 完全同步');
		} else {
			if (latestTagB === null) {
				addStepSummary(`目标仓库没有任何 tag，上游仓库的所有 tag 都是新增的，共 ${tagsA.length} 个：`);
				addStepSummary(`新增的 tag: ${tagsA.join(', ')}`);
				core.info(`目标仓库没有 tag，上游仓库的所有 tag: ${tagsA.join(', ')}`);
				tag_sync_mode = 'normal';
				newTags = tagsA;
			} else {
				const idx = findTagIndex(latestTagB, tagsA);
				if (idx === -1) {
					addStepSummary(`目标仓库最新 tag ${latestTagB} 不在上游仓库 tag 列表中，可能分叉或删除`);
					core.info(`目标仓库最新 tag ${latestTagB} 不在上游仓库 tag 列表中，可能分叉或删除`);
					tag_sync_mode = 'force';
					newTags = tagsA;
				} else {
					newTags = tagsA.slice(idx + 1);
					addStepSummary(`目标仓库最新 tag ${latestTagB} 之后，上游仓库新增了 ${newTags.length} 个 tag:`);
					core.info(`目标仓库最新 tag ${latestTagB} 之后，上游仓库新增了 ${newTags.length} 个 tag:`);
					addStepSummary(`新增的 tag: ${newTags.join(', ')}`);
					core.info(`新增的 tag: ${newTags.join(', ')}`);
					tag_sync_mode = 'normal';
				}
			}
		}

		const match_TAG = config.match_TAG;
		const exclude_TAG = config.exclude_TAG;
		if (newTags && newTags.length > 0) {
			// 先根据 exclude_TAG 过滤不需要的标签
			let filteredTags = newTags.reverse();
			if (exclude_TAG) {
				// 将 exclude_TAG 按逗号分隔成数组
				const excludeTagsArray = exclude_TAG.split(',').map(tag => tag.trim());
				filteredTags = filteredTags.filter(tag =>
					!excludeTagsArray.some(excludeTag => minimatch(tag, excludeTag))
				);
			}
			// 然后进行匹配
			const latestMatchedTag = filteredTags.find(tag => minimatch(tag, match_TAG));
			if (latestMatchedTag) {
				addStepSummary(`匹配规则 "${match_TAG}" 的最新 tag: ${latestMatchedTag}`);
				core.info(`匹配规则 "${match_TAG}" 的最新 tag: ${latestMatchedTag}`);
				core.setOutput('has_match_tags', 'true');
				core.setOutput('tag', latestMatchedTag);
				if (config.updateVariableToken != null) {
					try {
						const {
							owner,
							repo
						} = github.context.repo;
						await updateRepositoryVariable(
							config.updateVariableToken,
							owner,
							repo,
							config.variableName,
							latestMatchedTag
						);
					} catch (error: any) {
						core.warning(`Failed to update repository variable: ${error.message}`);
						// 这里使用 warning 而不是 setFailed，以免影响主流程同步代码
					}
				}
			} else {
				core.setOutput('has_match_tags', 'false');
			}
		} else {
			core.setOutput('has_match_tags', 'false');
		}

		await gitB.addRemote('upstream', config.upstream_REPOURL);
		await gitB.fetch('upstream', config.upstream_BRANCH);

		if (commit_sync_mode === "normal") {
			core.info('COMMIT同步模式: NORMAL');
			await gitB.pull('upstream', config.upstream_BRANCH);
			await gitB.push('origin', config.target_BRANCH);
			core.info('COMMIT同步完成');
		} else if (commit_sync_mode === "force") {
			core.info('COMMIT同步模式: FORCE');
			await gitB.raw(['reset', '--hard', `upstream/${config.upstream_BRANCH}`]);
			await gitB.push(['origin', config.target_BRANCH, '--force']);
			core.info('COMMIT同步完成');
		}

		if (tag_sync_mode === "force") {
			core.info('TAG同步模式: FORCE');
			const localTags = await gitB.tags();
			if (localTags.all.length > 0) {
				await gitB.tag(['-d', ...localTags.all]);
				core.info(`已删除本地所有 tag: ${localTags.all.join(', ')}`);
				await gitB.push(['origin', config.target_BRANCH, '--delete', 'tag', ...localTags.all]);
				core.info(`已删除目标仓库所有 tag: ${localTags.all}`);
			}
			await gitB.fetch('upstream', config.upstream_BRANCH, {
				'--tags': null
			});
			await gitB.push(['origin', config.target_BRANCH, '--tags', '--follow-tags']);
			core.info('TAG同步完成');
		} else if (tag_sync_mode === "normal") {
			core.info('TAG同步模式: NORMAL');
			await gitB.fetch('upstream', config.upstream_BRANCH, {
				'--tags': null
			});
			await gitB.push(['origin', config.target_BRANCH, '--tags', '--follow-tags']);
			core.info('TAG同步完成');
		}

		core.info('Action completed!');
	} catch (error) {
		core.setFailed((error as Error).message);
	}
}

run();