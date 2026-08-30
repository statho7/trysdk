import { v4 as uuidv4 } from 'uuid'
import type { Job, JobStatus, StatusEvent } from './types'

const jobs = new Map<string, Job>()
const events = new Map<string, StatusEvent[]>()

export function createJob(githubUrl: string, useCase: string): Job {
  const job: Job = {
    id: uuidv4(),
    githubUrl,
    useCase,
    status: 'CLONING',
    createdAt: new Date().toISOString(),
  }
  jobs.set(job.id, job)
  events.set(job.id, [])
  return job
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId)
}

export function updateJob(jobId: string, patch: Partial<Job>): void {
  const job = jobs.get(jobId)
  if (!job) return
  jobs.set(jobId, { ...job, ...patch })
}

export function emitStatus(jobId: string, status: JobStatus, message: string): void {
  const event: StatusEvent = { status, message, timestamp: new Date().toISOString() }
  const jobEvents = events.get(jobId) ?? []
  jobEvents.push(event)
  events.set(jobId, jobEvents)
  updateJob(jobId, { status })
}

export function getEvents(jobId: string): StatusEvent[] {
  return events.get(jobId) ?? []
}
