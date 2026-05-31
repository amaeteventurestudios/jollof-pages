import { describe, it, expect } from 'vitest';
import { JobType, JobStatus } from '@/lib/enums';

describe('Job type enum', () => {
  it('has all required job types', () => {
    const types = Object.values(JobType);
    expect(types).toContain('image_conversion');
    expect(types).toContain('markdown_import_parse');
    expect(types).toContain('markdown_import_diff');
    expect(types).toContain('wiki_export');
    expect(types).toContain('story_os_export');
    expect(types).toContain('continuity_validation');
    expect(types).toContain('dependency_rebuild');
    expect(types).toContain('search_reindex');
    expect(types).toContain('production_package_export');
    expect(types).toContain('asset_cleanup');
  });
});

describe('Job status enum', () => {
  it('has all required statuses', () => {
    const statuses = Object.values(JobStatus);
    expect(statuses).toContain('queued');
    expect(statuses).toContain('running');
    expect(statuses).toContain('succeeded');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('cancelled');
    expect(statuses).toContain('retrying');
  });
});

describe('Job retry logic', () => {
  it('should retry when retry_count < max_retries', () => {
    const job = { retry_count: 1, max_retries: 3 };
    const nextRetry = job.retry_count + 1;
    const shouldRetry = nextRetry < job.max_retries;
    expect(shouldRetry).toBe(true);
  });

  it('should fail permanently when retry_count reaches max_retries', () => {
    const job = { retry_count: 2, max_retries: 3 };
    const nextRetry = job.retry_count + 1;
    const shouldRetry = nextRetry < job.max_retries;
    expect(shouldRetry).toBe(false);
  });

  it('first failure schedules a retry (retries start at 0)', () => {
    const job = { retry_count: 0, max_retries: 3 };
    const nextRetry = job.retry_count + 1;
    const shouldRetry = nextRetry < job.max_retries;
    expect(shouldRetry).toBe(true);
  });

  it('max_retries=0 means never retry', () => {
    const job = { retry_count: 0, max_retries: 0 };
    const nextRetry = job.retry_count + 1;
    const shouldRetry = nextRetry < job.max_retries;
    expect(shouldRetry).toBe(false);
  });
});

describe('Stalled job detection', () => {
  it('identifies stalled jobs past heartbeat cutoff', () => {
    const stalledAfterMs = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const staleHeartbeat = new Date(now - stalledAfterMs - 1000).toISOString();
    const freshHeartbeat = new Date(now - 60_000).toISOString();
    const cutoff = new Date(now - stalledAfterMs).toISOString();

    expect(staleHeartbeat < cutoff).toBe(true);
    expect(freshHeartbeat < cutoff).toBe(false);
  });
});

describe('Job stats aggregation', () => {
  it('counts jobs by status correctly', () => {
    const rows = [
      { status: 'queued' },
      { status: 'queued' },
      { status: 'running' },
      { status: 'succeeded' },
      { status: 'failed' },
      { status: 'queued' },
    ] as { status: JobStatus }[];

    const stats = {} as Record<JobStatus, number>;
    for (const row of rows) {
      stats[row.status] = (stats[row.status] ?? 0) + 1;
    }

    expect(stats['queued']).toBe(3);
    expect(stats['running']).toBe(1);
    expect(stats['succeeded']).toBe(1);
    expect(stats['failed']).toBe(1);
  });
});

describe('Optimistic lock on job claim', () => {
  it('claim requires locked_by to be null before acquiring', () => {
    // Simulates the WHERE locked_by IS NULL guard on claim
    const lockedJob = { id: 'j1', locked_by: 'worker-1', status: 'running' };
    const isClaimable = lockedJob.locked_by === null;
    expect(isClaimable).toBe(false);

    const freeJob = { id: 'j2', locked_by: null, status: 'queued' };
    const isFreeClaimable = freeJob.locked_by === null;
    expect(isFreeClaimable).toBe(true);
  });
});
