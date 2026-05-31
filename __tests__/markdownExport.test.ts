import { describe, it, expect } from 'vitest';
import { wikiEntryToMarkdown, wikiEntriesToMarkdownPackage } from '@/lib/services/markdownExportService';
import type { WikiEntry } from '@/lib/types/database';

const MOCK_ENTRY: WikiEntry = {
  id: 'entry-123',
  workspace_id: 'ws-456',
  series_id: 'series-789',
  slug: 'zane-jaja',
  title: 'Zane Jaja',
  entry_type: 'character',
  category_id: null,
  template_id: null,
  canon_status: 'confirmed',
  approval_status: 'approved',
  body_markdown: 'Former drift surveyor. Age 28.\n\nWitnessed the Lagos Collapse.',
  body_html: null,
  frontmatter: {},
  excerpt: null,
  cover_asset_id: null,
  sort_order: 0,
  is_pinned: false,
  is_archived: false,
  approved_by: 'user-abc',
  approved_at: '2026-05-01T00:00:00Z',
  locked_by: null,
  locked_at: null,
  version_count: 3,
  current_version_id: 'ver-xyz',
  created_by: 'user-abc',
  updated_by: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

describe('Markdown Export Service', () => {
  describe('wikiEntryToMarkdown', () => {
    it('includes YAML frontmatter block', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toMatch(/^---\n/);
      expect(md).toContain('---\n\n#');
    });

    it('includes entry ID in frontmatter', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toContain('entry-123');
    });

    it('includes slug in frontmatter', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toContain('zane-jaja');
    });

    it('includes canon_status in frontmatter', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toContain('confirmed');
    });

    it('includes h1 title', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toContain('# Zane Jaja');
    });

    it('includes body markdown', () => {
      const md = wikiEntryToMarkdown(MOCK_ENTRY);
      expect(md).toContain('Former drift surveyor');
    });
  });

  describe('wikiEntriesToMarkdownPackage', () => {
    it('creates one file per entry', () => {
      const { files } = wikiEntriesToMarkdownPackage([MOCK_ENTRY], 'Equanauts');
      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('character/zane-jaja.md');
    });

    it('includes manifest JSON', () => {
      const { manifest } = wikiEntriesToMarkdownPackage([MOCK_ENTRY], 'Equanauts');
      const parsed = JSON.parse(manifest);
      expect(parsed.format).toBe('jollof-pages-wiki-package');
      expect(parsed.entry_count).toBe(1);
      expect(parsed.series).toBe('Equanauts');
      expect(parsed.entries[0].id).toBe('entry-123');
    });

    it('manifest includes stable IDs for re-import matching', () => {
      const { manifest } = wikiEntriesToMarkdownPackage([MOCK_ENTRY], 'Equanauts');
      const parsed = JSON.parse(manifest);
      const entry = parsed.entries[0];
      expect(entry.id).toBeDefined();
      expect(entry.slug).toBeDefined();
      expect(entry.version).toBeDefined();
    });
  });
});
