# 上游同步工具

***

# PFM-Upstream-Sync

![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)

一个用于自动同步上游仓库（Upstream Repository）代码和 Tag 到当前仓库的 GitHub Action。它支持分支同步、Tag 匹配过滤，并且可以将最新的 Tag 版本号自动写入 GitHub 仓库变量（Repository Variables）。

## ✨ 功能特性

*   🔄 **代码同步**：将上游仓库指定分支的代码合并到当前仓库。
*   🏷️ **Tag 同步**：自动拉取上游 Tag，支持通配符匹配 (`match_tag`) 和排除 (`exclude_tag`)。
*   💾 **变量更新**：检测到新 Tag 时，可自动更新仓库变量（如 `LATEST_TAG`），方便其他工作流调用。
*   ⚙️ **高度可配**：支持自定义同步分支、Token 以及匹配规则。

## 🚀 使用示例

### 基础用法：同步代码与 Tag

最简单的用法，仅同步上游的 `main` 分支到当前的 `main` 分支。

```yaml
name: Sync Upstream

on:
  schedule:
    - cron: '0 0 * * *' # 每天运行一次
  workflow_dispatch: # 允许手动触发

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write # 必须有写入权限才能推送代码
    steps:
      - name: Checkout target repo
        uses: actions/checkout@v3

      - name: Sync Upstream
        uses: PFM-PowerForMe/PFM-Upstream-Sync@v1
        with:
          upstream_repo_url: 'https://github.com/upstream-owner/upstream-repo.git'
          upstream_sync_branch: 'main'
          target_repo_token: ${{ secrets.GITHUB_TOKEN }} # 自动生成的 Token 即可
          target_sync_branch: 'main'
```

### 进阶用法：筛选 Tag 并更新仓库变量

此示例演示如何只同步 `v` 开头的 Tag，排除 `beta` 版本，并将最新的版本号写入仓库变量 `LATEST_VERSION`。

> **注意**：更新仓库变量通常需要 `repo` 权限的 PAT (Personal Access Token)，因为默认的 `GITHUB_TOKEN` 可能没有修改 Variables 的权限。

```yaml
name: Sync and Update Variable

on:
  schedule:
    - cron: '0 */6 * * *' # 每6小时检查一次

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout target repo
        uses: actions/checkout@v3

      - name: Sync Upstream
        id: sync
        uses: PFM-PowerForMe/PFM-Upstream-Sync@v1
        with:
          upstream_repo_url: 'https://github.com/upstream-owner/upstream-repo.git'
          upstream_sync_branch: 'master'
          target_repo_token: ${{ secrets.GITHUB_TOKEN }}
          
          # Tag 匹配规则
          match_tag: 'v*'  # 匹配 v1.0 格式
          exclude_tag: '*beta*,*alpha*,*rc*,*nightly*'         # 排除包含 beta 或 rc 的 Tag
          
          # 变量更新配置
          update_variable_token: ${{ secrets.ACTION_PAT }} # 需要在仓库 Secrets 中配置 PAT
          variable_name: 'LATEST_VERSION'

      - name: Check Output
        if: steps.sync.outputs.has_match_tags == 'true'
        run: |
          echo "New tag found: ${{ steps.sync.outputs.tag }}"
          echo "Variable updated."
```

## ⚙️ 输入参数 (Inputs)

| 参数名 | 必填 | 默认值 | 描述 |
| :--- | :---: | :---: | :--- |
| `upstream_repo_url` | ✅ | - | 上游仓库的 Git 地址 (例如 `https://github.com/user/repo.git`)。 |
| `upstream_sync_branch` | ✅ | - | 上游仓库需要同步的分支名。 |
| `target_repo_token` | ✅ | - | 目标仓库（当前仓库）的 Token，用于推送代码。通常使用 `${{ secrets.GITHUB_TOKEN }}`。 |
| `target_sync_branch` | ❌ | `main` | 同步到目标仓库的哪个分支。 |
| `match_tag` | ❌ | `*` | Tag 匹配规则（通配符，由 minimatch 实现）。例如 `7.*` 匹配 7 开头的版本，`v*` 匹配 v 开头的标签。Tag 按版本号大小比较，`7.1.2` 大于 `7.0.6`，与提交时间无关。 |
| `exclude_tag` | ❌ | - | Tag 排除规则（通配符，由 minimatch 实现），可用逗号分隔多条，如 `*beta*,*rc*`。命中任一条的 Tag 将被忽略。 |
| `update_variable_token` | ❌ | - | **新功能**：用于更新仓库变量的 GitHub Token。如果设置，将尝试更新变量。建议使用具有 `repo` 权限的 PAT。 |
| `variable_name` | ❌ | `LATEST_TAG` | **新功能**：需要更新或创建的仓库变量名称。 |

## 📤 输出参数 (Outputs)

| 参数名 | 描述 |
| :--- | :--- |
| `has_new_commits` | 如果上游有新的提交并同步成功，则为 `true`，否则为 `false`。 |
| `has_match_tags` | 如果发现了符合规则的 Tag，则为 `true`。 |
| `tag` | 获取到的最新匹配 Tag 的名称（版本号）。 |

## ⚠️ 权限说明

1.  **代码推送**：Action 需要向你的仓库推送代码，因此在 Workflow 中需要设置 `permissions: contents: write`，或者在仓库设置中允许 GitHub Actions 读写权限。
2.  **变量更新**：如果你使用了 `update_variable_token`，请确保提供的 Token 具有 `repo` (Full control of private repositories) 或针对 Actions Variables 的读写权限。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进此 Action。

## 📄 License

MIT