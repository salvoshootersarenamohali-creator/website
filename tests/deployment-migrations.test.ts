import { describe, expect, it, vi } from "vitest"
import checkMigrationChanges from "../scripts/migration-check.cjs"

function setup() {
    const previous = "a".repeat(40), head = "b".repeat(40)
    return { previous, input: {
        github: { rest: { actions: { listWorkflowRuns: vi.fn().mockResolvedValue({ data: { workflow_runs: [{ head_sha: previous }] } }) } } },
        context: { repo: { owner: "example", repo: "website" }, sha: head },
        core: { info: vi.fn(), warning: vi.fn(), setOutput: vi.fn() },
        exec: { exec: vi.fn().mockResolvedValue(0), getExecOutput: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "" }) },
    } }
}
describe("production migration gate", () => {
    it("skips production migration only when files match the last successful deployment", async () => {
        const { input, previous } = setup()
        await checkMigrationChanges(input)
        expect(input.github.rest.actions.listWorkflowRuns).toHaveBeenCalledWith(expect.objectContaining({ status: "success", branch: "main" }))
        expect(input.exec.getExecOutput).toHaveBeenCalledWith("git", ["diff", "--name-only", previous, input.context.sha, "--", "prisma/migrations", "prisma/schema.prisma"], { silent: true })
        expect(input.core.setOutput).toHaveBeenCalledWith("required", "false")
    })
    it("runs migrations when there are database changes, including those from an unsuccessful deployment", async () => {
        const { input } = setup()
        input.exec.getExecOutput.mockResolvedValue({ exitCode: 0, stdout: "prisma/migrations/new/migration.sql\n" })
        await checkMigrationChanges(input)
        expect(input.core.setOutput).toHaveBeenCalledWith("required", "true")
    })
    it("runs migrations on the first deployment", async () => {
        const { input } = setup()
        input.github.rest.actions.listWorkflowRuns.mockResolvedValue({ data: { workflow_runs: [] } })
        await checkMigrationChanges(input)
        expect(input.exec.exec).not.toHaveBeenCalled()
        expect(input.core.setOutput).toHaveBeenCalledWith("required", "true")
    })
    it("runs migrations if deployment history cannot be read", async () => {
        const { input } = setup()
        input.github.rest.actions.listWorkflowRuns.mockRejectedValue(new Error("Unavailable"))
        await checkMigrationChanges(input)
        expect(input.core.setOutput).toHaveBeenCalledWith("required", "true")
    })
    it("runs migrations if a previous commit cannot be fetched or compared", async () => {
        const { input } = setup()
        input.exec.exec.mockRejectedValue(new Error("Missing commit"))
        await checkMigrationChanges(input)
        expect(input.core.setOutput).toHaveBeenCalledWith("required", "true")
        input.exec.exec.mockResolvedValue(0)
        input.exec.getExecOutput.mockResolvedValue({ exitCode: 1, stdout: "" })
        await checkMigrationChanges(input)
        expect(input.core.setOutput).toHaveBeenLastCalledWith("required", "true")
    })
})
