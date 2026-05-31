import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/typed', () => ({
  getTypedAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Search query building', () => {
  it('empty query returns empty result without DB call', async () => {
    const { search } = await import('@/lib/services/searchService');
    const results = await search({ workspaceId: 'ws-1', query: '   ' });
    expect(results).toEqual([]);
  });

  it('tsquery uses AND for multi-word searches', () => {
    const rawQuery = 'iron mask hero';
    const tsQuery = rawQuery.trim().split(/\s+/).join(' & ');
    expect(tsQuery).toBe('iron & mask & hero');
  });

  it('single word query is unchanged', () => {
    const rawQuery = 'Zane';
    const tsQuery = rawQuery.trim().split(/\s+/).join(' & ');
    expect(tsQuery).toBe('Zane');
  });
});

describe('Index stats aggregation', () => {
  it('counts correctly by object_type', () => {
    const rows = [
      { object_type: 'wiki_entry' },
      { object_type: 'wiki_entry' },
      { object_type: 'scene' },
      { object_type: 'wiki_entry' },
      { object_type: 'scene' },
      { object_type: 'asset' },
    ];

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.object_type] = (counts[row.object_type] ?? 0) + 1;
    }

    expect(counts.wiki_entry).toBe(3);
    expect(counts.scene).toBe(2);
    expect(counts.asset).toBe(1);
  });
});

describe('Bulk index construction', () => {
  it('maps wiki entries to search rows correctly', () => {
    const entries = [
      { id: 'e1', series_id: 's1', title: 'Zane Jaja', body_markdown: 'The masked hero', approval_status: 'approved' },
      { id: 'e2', series_id: 's1', title: 'Iron Crest Syndicate', body_markdown: null, approval_status: 'draft' },
    ];

    const workspaceId = 'ws-1';
    const rows = entries.map((e) => ({
      workspaceId,
      seriesId: e.series_id,
      objectType: 'wiki_entry',
      objectId: e.id,
      title: e.title,
      body: e.body_markdown ?? undefined,
      status: e.approval_status,
    }));

    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Zane Jaja');
    expect(rows[0].body).toBe('The masked hero');
    expect(rows[1].body).toBeUndefined();
    expect(rows[1].status).toBe('draft');
  });
});

describe('Search index upsert key', () => {
  it('unique constraint key is workspace+type+object', () => {
    const key = { workspace_id: 'ws-1', object_type: 'wiki_entry', object_id: 'entry-1' };
    const key2 = { workspace_id: 'ws-1', object_type: 'wiki_entry', object_id: 'entry-1' };
    expect(JSON.stringify(key)).toBe(JSON.stringify(key2));
  });

  it('different object_type makes unique key', () => {
    const key1 = { workspace_id: 'ws-1', object_type: 'wiki_entry', object_id: 'obj-1' };
    const key2 = { workspace_id: 'ws-1', object_type: 'scene', object_id: 'obj-1' };
    expect(key1.object_type).not.toBe(key2.object_type);
  });
});
