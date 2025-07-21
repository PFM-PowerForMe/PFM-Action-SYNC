import fs from 'fs'
// summary 输出工具（直接写 GITHUB_STEP_SUMMARY 文件）
export function addStepSummary(content: string) {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY
	if (summaryPath) {
		fs.appendFileSync(summaryPath, content + '\n')
	}
}