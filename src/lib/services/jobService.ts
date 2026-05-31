// ============================================================
// JOB SERVICE — Background job queue management
// jobs table
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { JobType, JobStatus } from '@/lib/enums';
import type { Job } from '@/lib/types/database';

const WORKER_ID = `worker-${process.env.HOSTNAME ?? 'local'}-${process.pid}`;

// ---- Enqueue ----

export async function enqueueJob(params: {
  workspaceId?: string;
  jobType: JobType;
  payload?: Record<string, unknown>;
  maxRetries?: number;
  createdBy?: string;
}): Promise<Job> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('jobs')
    .insert({
      workspace_id: params.workspaceId ?? null,
      job_type: params.jobType,
      status: JobStatus.QUEUED,
      payload: params.payload ?? {},
      max_retries: params.maxRetries ?? 3,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---- Claim (for a background worker) ----

export async function claimNextJob(params: {
  jobType?: JobType;
  workerId?: string;
}): Promise<Job | null> {
  const db = getAdminClient();
  const workerId = params.workerId ?? WORKER_ID;

  // Find the oldest queued job not locked by another worker
  let query = db
    .from('jobs')
    .select('*')
    .in('status', [JobStatus.QUEUED, JobStatus.RETRYING])
    .is('locked_by', null)
    .order('created_at')
    .limit(1);

  if (params.jobType) query = query.eq('job_type', params.jobType);

  const { data: jobs, error: selectErr } = await query;
  if (selectErr) throw selectErr;
  if (!jobs?.length) return null;

  const job = jobs[0] as Job;

  // Attempt to claim with an optimistic lock
  const { data: claimed, error: claimErr } = await db
    .from('jobs')
    .update({
      status: JobStatus.RUNNING,
      locked_by: workerId,
      started_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .is('locked_by', null)
    .select()
    .single();

  if (claimErr || !claimed) return null;
  return claimed as Job;
}

// ---- Heartbeat ----

export async function heartbeatJob(jobId: string): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('jobs')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) throw error;
}

// ---- Complete / Fail / Cancel ----

export async function completeJob(params: {
  jobId: string;
  result?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('jobs')
    .update({
      status: JobStatus.SUCCEEDED,
      result: params.result ?? {},
      completed_at: new Date().toISOString(),
      locked_by: null,
    })
    .eq('id', params.jobId);

  if (error) throw error;
}

export async function failJob(params: {
  jobId: string;
  errorMessage: string;
  stage?: string;
}): Promise<void> {
  const db = getAdminClient();

  // Get current retry count
  const { data: job } = await db
    .from('jobs')
    .select('retry_count, max_retries')
    .eq('id', params.jobId)
    .single();

  if (!job) return;

  const nextRetry = (job.retry_count ?? 0) + 1;
  const shouldRetry = nextRetry < (job.max_retries ?? 3);

  const { error } = await db
    .from('jobs')
    .update({
      status: shouldRetry ? JobStatus.RETRYING : JobStatus.FAILED,
      error_message: params.errorMessage,
      stage: params.stage ?? null,
      retry_count: nextRetry,
      locked_by: null,
      completed_at: shouldRetry ? null : new Date().toISOString(),
    })
    .eq('id', params.jobId);

  if (error) throw error;
}

export async function cancelJob(params: {
  jobId: string;
  workspaceId?: string;
}): Promise<void> {
  const db = getAdminClient();
  let query = db
    .from('jobs')
    .update({
      status: JobStatus.CANCELLED,
      locked_by: null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.jobId)
    .in('status', [JobStatus.QUEUED, JobStatus.RETRYING]);

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);

  const { error } = await query;
  if (error) throw error;
}

export async function updateJobStage(params: {
  jobId: string;
  stage: string;
  result?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminClient();
  const patch: Record<string, unknown> = {
    stage: params.stage,
    heartbeat_at: new Date().toISOString(),
  };
  if (params.result) patch.result = params.result;

  const { error } = await db
    .from('jobs')
    .update(patch)
    .eq('id', params.jobId);

  if (error) throw error;
}

// ---- Query ----

export async function getJob(jobId: string): Promise<Job | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listJobs(params: {
  workspaceId?: string;
  jobType?: JobType;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): Promise<Job[]> {
  const db = getAdminClient();
  let query = db
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);
  if (params.jobType) query = query.eq('job_type', params.jobType);
  if (params.status) query = query.eq('status', params.status);
  query = query.limit(params.limit ?? 50);
  if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getQueuedJobs(jobType?: JobType): Promise<Job[]> {
  return listJobs({
    status: JobStatus.QUEUED,
    jobType,
    limit: 100,
  });
}

// ---- Retry stalled jobs ----

export async function requeueStalledJobs(stalledAfterMs = 5 * 60 * 1000): Promise<number> {
  const db = getAdminClient();
  const cutoff = new Date(Date.now() - stalledAfterMs).toISOString();

  const { data, error } = await db
    .from('jobs')
    .update({ status: JobStatus.RETRYING, locked_by: null })
    .eq('status', JobStatus.RUNNING)
    .lt('heartbeat_at', cutoff)
    .select('id');

  if (error) throw error;
  return (data ?? []).length;
}

export async function getJobStats(workspaceId?: string): Promise<Record<JobStatus, number>> {
  const db = getAdminClient();
  let query = db.from('jobs').select('status');
  if (workspaceId) query = query.eq('workspace_id', workspaceId);

  const { data, error } = await query;
  if (error) throw error;

  const stats = {} as Record<JobStatus, number>;
  for (const row of data ?? []) {
    const s = row.status as JobStatus;
    stats[s] = (stats[s] ?? 0) + 1;
  }
  return stats;
}
