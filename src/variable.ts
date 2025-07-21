import * as github from '@actions/github';
import * as core from '@actions/core';

export async function updateRepositoryVariable(
	token: string,
	owner: string,
	repo: string,
	name: string,
	value: string
): Promise < void > {
	const octokit = github.getOctokit(token);

	core.info(`Checking repository variable: ${name}`);

	try {
		// 尝试获取变量，如果不存在会抛出 404
		await octokit.rest.actions.getRepoVariable({
			owner,
			repo,
			name,
		});

		// 如果获取成功，说明变量存在，执行更新
		core.info(`Variable ${name} exists. Updating to: ${value}`);
		await octokit.rest.actions.updateRepoVariable({
			owner,
			repo,
			name,
			value,
		});

	} catch (error: any) {
		if (error.status === 404) {
			// 如果是 404，说明变量不存在，执行创建
			core.info(`Variable ${name} does not exist. Creating with value: ${value}`);
			await octokit.rest.actions.createRepoVariable({
				owner,
				repo,
				name,
				value,
			});
		} else {
			// 其他错误直接抛出
			core.error(`Failed to handle variable ${name}: ${error.message}`);
			throw error;
		}
	}
}