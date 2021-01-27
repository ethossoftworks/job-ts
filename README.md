# Job

Job is a simple library for cancellable asynchronous tasks. Job was inspired by Kotlin coroutines and tries to bring
some of the same functionality to TypeScript/JavaScript.
<br><br>

# Documentation
- [Installation](#installation)
- [Usage](#usage)
- [Build Info](#build-info)
- [API](docs/api.md)
- [Example Project](example/)
- [Release Notes](docs/release-notes.md)
<br><br>

# Installation
`job` can be installed using NPM or Yarn. The scripts provided by the NPM package are UMD scripts and will also work as
script tags. If using script tags, you must load the UMD scripts for `@ethossoftworks/outcome` before the scripts for
`@ethossoftworks/job`.
<br><br>

```bash
yarn add @ethossoftworks/job
```
<br><br>

# Usage
## Simple Job
```typescript
import { Job } from "@ethossoftworks/job"

const result = await new Job(async (job) => {
    await job.delay(1000)
    return Outcome.ok("Success")
}).run()
```
<br><br>

## Cancel a Job
Every job is cancellable. Cancelling will stop the job at the next "pause" point.
Pause points are created with `job.pause()` or the inbuilt `job.delay()`
```typescript
import { Job } from "@ethossoftworks/job"

const job = new Job(async (job) => {
    await job.delay(1000)
    return Outcome.ok("Success")
})

setTimeout(() => job.cancel(), 500) // This stops the job after 500 milliseconds
const result = await job.run()

if (Job.isCancelled(result)) {
    // This block will run
}
```
<br><br>

## Children Jobs
Jobs may have children jobs launched from them. When the parent completes or is cancelled, children jobs will be cancelled if they have not already completed.

```typescript
import { Job } from "@ethossoftworks/job"

// Launch multiple children in parallel
new Job(async (job) => {
    const child1 = job.launchAndRun(async (job) => {
        await job.delay(2000)
        return Outcome.ok(true)
    })

    const child2 = job.launchAndRun(async (job) => {
        await job.delay(1000)
        return Outcome.ok(true)
    })

    const results = await Promise.all([child1, child2])
    return Outcome.ok("Success")
})

// Launch multiple children sequentially
new Job(async (job) => {
    const child1 = await job.launchAndRun(async (job) => {
        await job.delay(2000)
        return Outcome.ok(true)
    })

    const child2 = await job.launchAndRun(async (job) => {
        await job.delay(1000)
        return Outcome.ok(true)
    })

    return Outcome.ok("Success")
})
```
<br><br>

# Build Info
## Build
`yarn build` or `yarn build-dev`
<br><br>

## Develop
1. Open two terminals
2. Run `yarn start-ts` in the first
3. Run `yarn start-bundler` in the second
<br><br>

## Test
`yarn build-test` or `yarn test`
<br><br>