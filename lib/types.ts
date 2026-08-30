export type JobStatus =
  | 'CLONING'
  | 'INSTALLING'
  | 'RUNNING'
  | 'READY'
  | 'ANALYZING'
  | 'DONE'
  | 'ERROR'

export interface StatusEvent {
  status: JobStatus
  message: string
  timestamp: string
}

export interface Feature {
  name: string
  found: boolean
  notes: string
}

export interface Screenshot {
  route: string
  description: string
  base64: string
}

export interface EvalResult {
  jobId: string
  fitScore: number
  summary: string
  features: Feature[]
  screenshots: Screenshot[]
  verdict: string
  caveats: string[]
}

export interface Job {
  id: string
  githubUrl: string
  useCase: string
  status: JobStatus
  createdAt: string
  previewUrl?: string
  previewToken?: string
  result?: EvalResult
}
