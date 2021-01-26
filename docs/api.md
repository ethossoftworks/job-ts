# API
* [Job](#Job)
    * [Job.isCancelled](#Job.isCancelled)
    * [isActive](#isActive)
    * [isCompleted](#isCompleted)
    * [isCancelled](#isCancelled)
    * [ensureActive](#ensureActive)
    * [childCount](#childCount)
    * [launch](#launch)
    * [launchAndRun](#launchAndRun)
    * [run](#run)
    * [runWithTimeout](#runWithTimeout)
    * [pause](#pause)
    * [delay](#delay)
    * [cancel](#cancel)
    * [cancelChildren](#cancelChildren)
* [SupervisorJob](#SupervisorJob)
* [Types](#Types)
    * [JobFunc](#JobFunc)
    * [JobHandle](#JobHandle)
    * [JobCancellationException](#JobCancellationException)
    * [JobCancellationReason](#JobCancellationReason)
<br><br>

## Job
```typescript
class Job<T> implements JobHandle {
    constructor(func: JobFunc<T>, options?: { parent?: Job<any> })
}
```
A cancellable unit of work with optional cancellation hierarchy.

Cancellation is cooperative, meaning the user has to define pause/suspension points in the task via the `pause()` or `ensureActive()` methods or by checking `isActive`.

 Cancelling a parent Job will cancel all children Jobs launched with the job defined as its parent. All children must also cooperatively check for cancellation.

A parent job will not wait for any children jobs  unless explicitly awaited on in the provided `JobFunc`. In this instance, if the parent completes before its child has completed, the parent will be marked as completed and the children will be cancelled at the next pause point.

If an exception is thrown during a JobFunc, the job will cancel itself and its children and then rethrow the exception to be handled by the user.

Running a job more than once will result in a `JobCancellationException`.

Note: When adding a try/catch mechanism inside of a `JobFunc`, make sure to rethrow any  `JobCancellationException` exceptions, otherwise job cancellation will not work as intended.
<br><br>

### `Job.isCancelled()`
```typescript
static isCancelled = (outcome: Outcome<unknown>): outcome is OutcomeError<JobCancellationException>
```
A type guard that returns true if the given outcome was cancelled. This type guard ensures the error is a `JobCancellationException`
<br><br>

### `isActive`
```typescript
get isActive(): boolean
```
Returns true if both the parent job (if one exists) and the current job are both active. A job is active at creation and remains active until it has completed or been cancelled.
<br><br>

### `isCompleted`
```typescript
get isCompleted(): boolean
```
Returns true if the job was completed successfully
<br><br>

### `isCancelled`
```typescript
get isCancelled(): boolean
```
Returns true if the job was cancelled for any reason, either by explicit invocation of cancel or because its parent was cancelled. This does not imply that the job has fully completed because it may still be finishing whatever it was doing and waiting for its children to complete.
<br><br>

### `ensureActive()`
```typescript
ensureActive()
```
Checks if the parent job and current job are active and throws `JobCancellationException` if either are inactive.

Note: This should only be used inside of a `JobFunc`.
<br><br>

### `childCount`
```typescript
get childCount(): number
```
The current number of active children jobs.
<br><br>

### `launch()`
```typescript
launch<R>(func: JobFunc<R>): Job<R>
```
Creates and returns a new job with the current job as the parent.
<br><br>

### `launchAndRun()`
```typescript
launchAndRun<R>(func: JobFunc<R>): Promise<Outcome<R>>
```
Creates a new job with the current job as the parent and executes it returning its result.

Note: This should only be used inside of a `JobFunc`.
<br><br>

### `run()`
```typescript
async run(): Promise<Outcome<T>>
```
Execute the job and return its result.

`run` handles all `JobCancellationException` and will return an `Outcome.Error` if a cancellation occurs.
<br><br>

### `runWithTimeout()`
```typescript
async runWithTimeout(milliseconds: number): Promise<Outcome<T>>
```
Executes the job and cancels the job if it takes longer than the timeout to complete/cancel.
<br><br>

### `pause()`
```typescript
async pause<R>(func: Promise<R>): Promise<R>
```
Await a given `func` and ensures the job is active before and after `func` execution. This effectively
creates a pause/suspend point for the job and prevents returning a result or performing an action on a result if the job has been completed/cancelled.

Note: This should only be used inside of a `JobFunc`.
<br><br>

### `delay()`
```typescript
async delay(milliseconds: number): Promise<void>
```
Delays a job for the specified amount of time and checks for cancellation before and after the delay.
<br><br>

### `cancel()`
```typescript
cancel(reason?: JobCancellationException)
```
Cancels the current job and all children jobs.
<br><br>

### `cancelChildren()`
```typescript
cancelChildren(reason?: JobCancellationException)
```
Cancels all children jobs without cancelling the current job.
<br><br>


## SupervisorJob
```typescript
class SupervisorJob extends Job<void>
```
A helper extension of `Job` that never completes until it is cancelled. This effectively provides a long-running context to launch children jobs in.
<br><br>

## Types
### `JobFunc`
```typescript
export type JobFunc<T> = (job: JobHandle) => Promise<Outcome<T>>
```

The block of work a `Job` executes. The `job` parameter is a handle of the job's instance to allow launching of new jobs or pausing the job.
<br><br>

### `JobHandle`
```typescript
interface JobHandle {
    isActive: boolean
    isCompleted: boolean
    isCancelled: boolean
    childCount: number
    ensureActive(): void
    launch<R>(func: JobFunc<R>): Job<R>
    launchAndRun<R>(func: JobFunc<R>): Promise<Outcome<R>>
    pause<R>(func: Promise<R>): Promise<R>
    delay(milliseconds: number): Promise<void>
    cancel(reason?: JobCancellationException): void
    cancelChildren(reason?: JobCancellationException): void
}
```
A handle for the current job used in `JobFunc`. This interface is equivalent to `Job`'s interface with the exception of `run` and `runWithTimeout` to prevent recursive running of the `Job` inside its `JobFunc`.
<br><br>

### `JobCancellationException`
```typescript
export class JobCancellationException implements Error {
    name: string = "JobCancellationException"
    message: string = `${this.reason}`
    constructor(public reason: JobCancellationReason) {}
}
```
Thrown when a job or its parent is cancelled or if a job is run more than once.
<br><br>

### `JobCancellationReason`
```typescript
 export enum JobCancellationReason {
    ParentJobCancelled,
    ParentJobCompleted,
    JobCancelled,
    JobCompleted,
}
 ```
 The reason a job was cancelled.

 `ParentJobCancelled`: The parent job was cancelled

 `ParentJobCompleted`: The parent job completed

 `JobCancelled`: The current job was cancelled

 `JobCompleted`: The current job was already completed. This only happens if the same job is run more than once.