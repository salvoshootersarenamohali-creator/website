module.exports = async function checkMigrationChanges({ github, context, core, exec }) {
    let required = true
    try {
        const { data } = await github.rest.actions.listWorkflowRuns({ ...context.repo, workflow_id: "deploy.yml", branch: "main", status: "success", per_page: 1 })
        const previous = data.workflow_runs[0]?.head_sha
        if (previous && /^[a-f0-9]{40}$/.test(previous)) {
            await exec.exec("git", ["fetch", "--no-tags", "origin", previous])
            const diff = await exec.getExecOutput("git", ["diff", "--name-only", previous, context.sha, "--", "prisma/migrations", "prisma/schema.prisma"], { silent: true })
            if (diff.exitCode !== 0) throw new Error("Git comparison failed")
            required = Boolean(diff.stdout.trim())
            core.info(required ? "Database files changed since the last successful deployment; applying migrations." : "Database files match the last successful deployment; no production migration is needed.")
        }
    } catch {
        core.warning("Could not verify database files against the last successful deployment; production migrations will run.")
    }
    core.setOutput("required", String(required))
}
