import { Job } from "@ethossoftworks/job"
import { Outcome } from "@ethossoftworks/outcome"
import React, { useReducer, useState } from "react"

export function App() {
    const [jobs, setJobs] = useState<Job<any>[]>([])
    const [counter, dispatch] = useReducer((state: any, action: any) => {
        switch (action.type) {
            case "increment":
                return state + 1
        }
    }, 0)

    return (
        <div>
            <h1>Job Example</h1>
            <br />
            <div>
                Job Count: {jobs.length}
                <br />
                Counter: {counter}
            </div>
            <br />
            <div>
                <button onClick={() => startJob(jobs, setJobs, dispatch)}>Start Job</button>
                <button onClick={() => cancelJob(jobs, setJobs)}>Cancel Job</button>
            </div>
        </div>
    )
}

function startJob(jobs: Job<any>[], setJobs: (jobs: Job<any>[]) => void, dispatch: (action: any) => void) {
    const job = new Job(async (job) => {
        while (true) {
            await job.delay(1000)
            dispatch({ type: "increment" })
        }
        return Outcome.ok(null)
    })
    setJobs([...jobs, job])
    job.run()
}

function cancelJob(jobs: Job<any>[], setJobs: (jobs: Job<any>[]) => void) {
    if (jobs.length === 0) return
    jobs[0].cancel()
    setJobs(jobs.slice(1))
}
