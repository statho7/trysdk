import { Redis } from '@upstash/redis'
import { v4 as uuidv4 } from 'uuid'
import type { Job, JobStatus, StatusEvent } from './types'

const redis = Redis.fromEnv()
const TTL = 7200 // seconds — matches the sandbox auto-stop window

export async function createJob(githubUrl: string, useCase?: string): Promise<Job> {
  const goal = useCase?.trim() ?? ''
  const job: Job = {
    id: uuidv4(),
    githubUrl,
    useCase: goal,
    shouldEvaluate: Boolean(goal),
    status: 'CLONING',
    createdAt: new Date().toISOString(),
  }
  await redis.set(`job:${job.id}`, job, { ex: TTL })
  return job
}

export async function getJob(jobId: string): Promise<Job | undefined> {
  return (await redis.get<Job>(`job:${jobId}`)) ?? undefined
}

export async function updateJob(jobId: string, patch: Partial<Job>): Promise<void> {
  const job = await getJob(jobId)
  if (!job) return
  await redis.set(`job:${jobId}`, { ...job, ...patch }, { ex: TTL })
}

export async function emitStatus(jobId: string, status: JobStatus, message: string): Promise<void> {
  const event: StatusEvent = { status, message, timestamp: new Date().toISOString() }
  await Promise.all([
    redis.rpush(`events:${jobId}`, event),
    redis.expire(`events:${jobId}`, TTL),
    updateJob(jobId, { status }),
  ])
}

export async function getEvents(jobId: string): Promise<StatusEvent[]> {
  return redis.lrange<StatusEvent>(`events:${jobId}`, 0, -1)
}
