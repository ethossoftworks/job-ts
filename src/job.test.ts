import { Outcome } from "@ethossoftworks/outcome"
import { Job, JobCancellationException, JobCancellationReason, SupervisorJob } from "./job"
import { fail, test, expect, assert, _test } from "@ethossoftworks/knock-on-wood"

import { performance } from "perf_hooks"
;(global as any).performance = performance
;(global as any).window = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
}

export async function jobTests() {
    test("Cancel when exception thrown", async () => {
        let child: Promise<Outcome<number>> = Promise.resolve(Outcome.ok(1))
        let parent: Job<number> = new Job(async (job) => Outcome.ok(1))

        try {
            parent = new Job(async (job) => {
                child = job.launchAndRun(async (job) => {
                    await job.delay(5000)
                    return Outcome.ok(1)
                })

                throw new Error("Uh Oh")
                return Outcome.ok(1)
            })
            await parent.run()
        } catch (e) {
            // Ignore parent exception
        } finally {
            const childResult = await child
            if (!parent.isCancelled) fail("Parent was not cancelled")
            if (childResult.isOk() || !(childResult.error instanceof JobCancellationException))
                fail("Child was not cancelled")
        }
    })

    test("Add job to cancelled parent", async () => {
        const parent = new Job(async (job) => Outcome.ok(1))
        parent.cancel()

        parent.launch(async (job) => Outcome.ok(1))
        new Job(async (job) => Outcome.ok(1), { parent: parent })
        expect(parent.childCount, 0, `Child count was ${parent.childCount} instead of 0`)
    })

    test("External child cancelled if parent completes", async () => {
        const parentJob = new Job(async (job) => {
            await job.delay(100)
            return Outcome.ok(1)
        })

        const childJob = parentJob.launch(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })

        const parentPromise = parentJob.run()
        const childResult = await childJob.run()
        const parentResult = await parentPromise
        if (parentResult.isError()) fail("Parent did not complete successfully")
        if (!childResult.isError()) fail("Child was not cancelled when parent completed")
    })

    test("Job Returns", async () => {
        const job = new Job(async (job) => Outcome.ok(1))
        const value1 = await job.run()

        if (value1.isOk()) {
            expect(value1.value, 1, "Invalid value for value1")
        } else {
            fail("Invalid return")
        }

        const value2 = await new Job(async (job) => Outcome.ok(1)).run()
        if (value2.isOk()) {
            expect(value2.value, 1, "Invalid value for value2")
        } else {
            fail("Invalid return")
        }
    })

    test("Job Status", async () => {
        const job = new Job(async (job) => Outcome.ok(1))
        expect(job.isActive, true, "Job should be active")
        expect(job.isCompleted, false, "Job should not be completed")
        expect(job.isCancelled, false, "Job should not be cancelled")
        await job.run()
        expect(job.isActive, false, "Job should be inactive")
        expect(job.isCompleted, true, "Job should be completed")
        expect(job.isCancelled, false, "Job should not be cancelled")

        const job2 = new Job(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })
        setTimeout(() => job2.cancel(), 100)
        await job2.run()
        expect(job2.isActive, false, "Job should be inactive")
        expect(job2.isCompleted, false, "Job should not be completed")
        expect(job2.isCancelled, true, "Job should be cancelled")
    })

    test("Cancellation Reason", async () => {
        // JobCompleted
        const alreadyCompleteJob = new Job(async (job) => Outcome.ok(1))
        await alreadyCompleteJob.run()
        const alreadyCompleteResult = await alreadyCompleteJob.run()
        if (
            alreadyCompleteResult.isOk() ||
            !(alreadyCompleteResult.error instanceof JobCancellationException) ||
            (alreadyCompleteResult.error as JobCancellationException).reason != JobCancellationReason.JobCompleted
        ) {
            fail("Completed: JobCancellationReason.JobCompleted not returned")
        }

        // ParentCancelled
        const parent = new Job(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })

        const child = parent.launch(async (job) => {
            await job.delay(1000)
            return Outcome.ok(1)
        })

        setTimeout(() => parent.cancel(), 250)
        const childResult = await child.run()

        if (
            childResult.isOk() ||
            !(childResult.error instanceof JobCancellationException) ||
            (childResult.error as JobCancellationException).reason != JobCancellationReason.ParentJobCancelled
        ) {
            fail("Parent Cancelled: JobCancellationReason.ParentJobCancelled not returned")
        }

        // JobCancelled
        const cancelledJob = new Job(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })

        setTimeout(() => cancelledJob.cancel(), 250)
        const cancelledJobResult = await cancelledJob.run()

        if (
            cancelledJobResult.isOk() ||
            !(cancelledJobResult.error instanceof JobCancellationException) ||
            (cancelledJobResult.error as JobCancellationException).reason != JobCancellationReason.JobCancelled
        ) {
            fail("Job Cancelled: JobCancellationReason.JobCancelled not returned")
        }

        // Launch after parent cancelled
        const launchAfterCancelledJob = new Job(async (job) => Outcome.ok(1))
        launchAfterCancelledJob.cancel()
        const launchAfterCancelledResult = await launchAfterCancelledJob.launchAndRun(async (job) => Outcome.ok(1))
        if (
            launchAfterCancelledResult.isOk() ||
            !(launchAfterCancelledResult.error instanceof JobCancellationException) ||
            (launchAfterCancelledResult.error as JobCancellationException).reason !=
                JobCancellationReason.ParentJobCancelled
        ) {
            fail("Launch After Cancelled: JobCancellationReason.ParentJobCancelled not returned")
        }
    })

    test("Multiple Job Runs", async () => {
        const job = new Job(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })

        const result1 = await job.run()
        const result2 = await job.run()
        const result3 = await job.run()

        if (result1.isError() || result1.value != 1) fail("Job did not return value correctly")
        if (result2.isOk() || !(result2.error instanceof JobCancellationException))
            fail("Job did not return JobCompletionException")
        if (result3.isOk() || !(result3.error instanceof JobCancellationException))
            fail("Job did not return JobCompletionException")
    })

    test("Job Parent Cancellation", async () => {
        var childFinished = false

        const parent = new Job(async (job) => {
            await job.launchAndRun(async (job) => {
                await job.delay(1000)
                childFinished = true
                return Outcome.ok(1)
            })

            return Outcome.ok(null)
        })

        setTimeout(() => parent.cancel(), 500)
        const result = await parent.run()

        expect(childFinished, false, "Child finished when it shouldn't have")
        if (result.isError()) {
            if (!(result.error instanceof JobCancellationException))
                fail("Cancelled exception was not sent back in Outcome.Error")
        } else {
            fail("Outcome.Ok was returned instead of Outcome.Error")
        }

        // Test that child is returned immediately when the parent is cancelled
        const parent2 = new Job(async (job) => {
            await job.delay(250)
            return Outcome.ok(1)
        })

        const child2 = parent2.launch(async (job) => {
            await job.delay(2000)
            return Outcome.ok(1)
        })

        setTimeout(() => parent2.cancel(), 200)
        const start = performance.now()
        await child2.run()
        if (performance.now() - start >= 250) fail("Child did not cancel immediately")
    })

    test("Job Child Cancellation", async () => {
        const parent = new Job(async (job) => {
            const child1 = job.launch(async (job) => {
                await job.delay(1000)
                return Outcome.ok(1)
            })

            const child2 = job.launch(async (job) => {
                await job.delay(500)
                return Outcome.ok(2)
            })

            setTimeout(() => child2.cancel(), 250)
            const results = await Promise.all([child1.run(), child2.run()])

            if (!results[0].isOk() || results[0].value !== 1) fail("Child1 not Ok when expected to be")
            if (results[1].isOk()) fail("Child2 not cancelled")
            return Outcome.ok(true)
        })

        const parentResult = await parent.run()
        if (parentResult.isError() || parentResult.value != true) fail("Parent didn't complete successfully")
    })

    test("Job Stream", async () => {
        var counter = 0

        await new Job(async (job) => {
            const stream = job.launch(async (job) => {
                for await (const value of _testStream()) {
                    job.ensureActive()
                    counter = value
                }
                return Outcome.ok(1)
            })

            setTimeout(() => stream.cancel(), 725)
            const streamResult = await stream.run()
            if (streamResult.isOk()) fail("Stream returned Ok instead of Error")
            return Outcome.ok(null)
        }).run()

        expect(counter, 6, `Counter was ${counter} when expected 6`)
    })

    test("Job Immediate Cancellation", async () => {
        let childHasRun: boolean = false
        const job = new Job(async (job) => {
            childHasRun = true
            await job.delay(500)
            return Outcome.ok(1)
        })

        job.cancel()
        const result = await job.run()

        if (result.isOk() || !(result.error instanceof JobCancellationException) || (childHasRun as boolean) === true) {
            fail(`Job was not immediately cancelled. Result: ${result}. HasRun: ${childHasRun}`)
        }
    })

    test("Job cancellation after complete", async () => {
        const job = new Job(async (job) => Outcome.ok(1))
        await job.run()
        job.cancel()
    })

    test("Job Timeout", async () => {
        var childHasRun = false

        const result = await new Job(async (job) => {
            await job.launchAndRun(async (job) => {
                await job.delay(1000)
                childHasRun = true
                return Outcome.ok(2)
            })

            return Outcome.ok(1)
        }).runWithTimeout(500)

        if (result.isOk() || !(result.error instanceof JobCancellationException)) {
            fail("Job did not timeout appropriately")
        }

        await delay(600)
        if (childHasRun) {
            fail("Timeout did not cancel child")
        }
    })

    test("Job Delay", async () => {
        const start = performance.now()
        const result = await new Job(async (job) => {
            await job.delay(1000)
            return Outcome.ok(1)
        }).run()

        if (result.isError() || result.value != 1) {
            fail("Invalid Result")
        } else if (performance.now() - start < 1000) {
            fail("Delay did not work")
        }
    })

    test("Cancel Children", async () => {
        const supervisor = new SupervisorJob()
        var child1Complete = false
        var child2Complete = false

        const child1 = supervisor.launchAndRun(async (job) => {
            await job.delay(1200)
            child1Complete = true
            return Outcome.ok(1)
        })

        const child2 = supervisor.launchAndRun(async (job) => {
            await job.delay(1000)
            child2Complete = true
            return Outcome.ok(2)
        })

        await delay(250)
        supervisor.cancelChildren()
        const child1Result = await child1
        const child2Result = await child2

        expect(supervisor.isActive, true, "Supervisor was not active")
        expect(child1Complete, false, "Child 1 was not cancelled")
        expect(child2Complete, false, "Child 2 was not cancelled")
        if (child1Result.isOk() || !(child1Result.error instanceof JobCancellationException))
            fail("Child 1 did not return exception")
        if (child2Result.isOk() || !(child2Result.error instanceof JobCancellationException))
            fail("Child 2 did not return exception")
    })

    test("SupervisorJob - Await", async () => {
        const start = performance.now()
        const supervisor = new SupervisorJob()
        await supervisor.runWithTimeout(2000)
        if (performance.now() - start < 2000) fail("Supervisor Job finished before it was supposed to")
    })

    test("Child Count", async () => {
        const supervisor = new SupervisorJob()
        var jobs: Promise<Outcome<number>>[] = []

        for (var i = 0; i < 1000; i++) {
            jobs.push(
                supervisor.launchAndRun(async (job) => {
                    await job.delay(Math.random() * 1000)
                    return Outcome.ok(1)
                })
            )
        }

        expect(supervisor.childCount, 1000, "All child jobs not started")
        await Promise.all(jobs)
        expect(supervisor.childCount, 0, "All jobs not removed")

        const noRunChild = supervisor.launch(async (job) => Outcome.ok(1))
        expect(supervisor.childCount, 1, "noRunChild was not added as a child")
        noRunChild.cancel()
        expect(supervisor.childCount, 0, "noRunChild was not removed after cancellation")

        const runChild = supervisor.launch(async (job) => {
            await job.delay(500)
            return Outcome.ok(1)
        })
        expect(supervisor.childCount, 1, "runChild was not added as a child")
        await runChild.run()
        expect(supervisor.childCount, 0, "runChild was not removed after cancellation")
    })

    test("Job Cancelled Checker", async () => {
        const job = await new Job(async (job) => {
            job.cancel()
            return Outcome.ok(1)
        }).run()

        assert(Job.isCancelled(job), "Job.isCancelled was not true")
    })
}

async function* _testStream() {
    var i = 0
    while (true) {
        yield i++
        await delay(100)
    }
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
