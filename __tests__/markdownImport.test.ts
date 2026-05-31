import { describe, it, expect } from 'vitest';
import { parseMarkdownFile, generateDiffSummary } from '@/lib/services/markdownImportService';

const SAMPLE_MD = `---
title: Zane Jaja
type: character
tags:
  - protagonist
  - human
canon_status: confirmed
---

# Zane Jaja

Former drift surveyor. Age 28. Witnessed the Lagos Collapse.

## Background

He was a RHYFT-licensed surveyor before becoming independent.

## Relationships

- [[Kira Selene]] - trusted ally
- [[Director Amara]] - antagonist
`;

const MINIMAL_MD = `# The Collapse Engine

A device that amplifies gravitational collapse frequencies.
`;

describe('Markdown Import Service - parseMarkdownFile', () => {
  it('extracts title from frontmatter', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.title).toBe('Zane Jaja');
  });

  it('extracts entry type from frontmatter', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.entryType).toBe('character');
  });

  it('extracts tags from frontmatter', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.tags).toContain('protagonist');
    expect(result.tags).toContain('human');
  });

  it('extracts canon status from frontmatter', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.canonStatus).toBe('confirmed');
  });

  it('extracts [[Wiki Links]] from body', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.extractedLinks).toContain('Kira Selene');
    expect(result.extractedLinks).toContain('Director Amara');
  });

  it('generates a slug from title', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.slug).toBe('zane-jaja');
  });

  it('includes body markdown without frontmatter', () => {
    const result = parseMarkdownFile(SAMPLE_MD);
    expect(result.bodyMarkdown).toContain('Former drift surveyor');
    expect(result.bodyMarkdown).not.toContain('title: Zane Jaja');
  });

  it('falls back to h1 title when no frontmatter title', () => {
    const result = parseMarkdownFile(MINIMAL_MD);
    expect(result.title).toBe('The Collapse Engine');
    expect(result.slug).toBe('the-collapse-engine');
  });

  it('defaults canon_status to draft when not specified', () => {
    const result = parseMarkdownFile(MINIMAL_MD);
    expect(result.canonStatus).toBe('draft');
  });

  it('defaults entry type to custom when not specified', () => {
    const result = parseMarkdownFile(MINIMAL_MD);
    expect(result.entryType).toBe('custom');
  });

  it('returns empty links array when no wiki links', () => {
    const result = parseMarkdownFile(MINIMAL_MD);
    expect(result.extractedLinks).toHaveLength(0);
  });
});

describe('Markdown Import Service - generateDiffSummary', () => {
  const parsed = parseMarkdownFile(SAMPLE_MD);

  it('returns new entry message when no previous version', () => {
    const summary = generateDiffSummary(null, parsed);
    expect(summary).toContain('New entry');
  });

  it('detects title change', () => {
    const summary = generateDiffSummary({ ...parsed, title: 'Old Title' }, parsed);
    expect(summary).toContain('Title');
    expect(summary).toContain('Old Title');
    expect(summary).toContain('Zane Jaja');
  });

  it('returns no changes when identical', () => {
    const summary = generateDiffSummary(parsed, parsed);
    expect(summary).toContain('No significant changes');
  });

  it('detects canon status change', () => {
    const summary = generateDiffSummary({ ...parsed, canonStatus: 'draft' as const }, parsed);
    expect(summary).toContain('Canon status');
  });
});
