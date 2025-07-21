import * as core from '@actions/core'

export function initCONFIG() {
	const upstream_REPOURL = core.getInput('upstream_repo_url')
	const upstream_BRANCH = core.getInput('upstream_sync_branch')

	const target_TOKEN = core.getInput('target_repo_token')
	const target_BRANCH = core.getInput('target_sync_branch')
	const target_OWNER = process.env.GITHUB_REPOSITORY?.split('/')[0];
	const target_REPO = process.env.GITHUB_REPOSITORY?.split('/')[1];
	const target_REPOURL = `https://GH_Action-Upstream_Sync:${target_TOKEN}@github.com/${target_OWNER}/${target_REPO}.git`;

	const match_TAG = core.getInput('match_tag')
	const exclude_TAG = core.getInput('exclude_tag') || null;

	const updateVariableToken = core.getInput('update_variable_token') || null;
	const variableName = core.getInput('variable_name') || 'LATEST_TAG';


	const local_WORKDIR = `${process.env.GITHUB_WORKSPACE}`;

	return {
		upstream_REPOURL,
		upstream_BRANCH,
		target_TOKEN,
		target_BRANCH,
		target_OWNER,
		target_REPO,
		target_REPOURL,
		match_TAG,
		exclude_TAG,
		local_WORKDIR,
		updateVariableToken,
		variableName
	}
}