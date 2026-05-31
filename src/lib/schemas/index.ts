import { z } from 'zod';
import { WikiEntryType, WikiCanonStatus, WorkspaceRole, ExportType, BoardType } from '@/lib/enums';

// ---- Workspace ----
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  soloMode: z.boolean().default(true),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.string().refine((v) => WorkspaceRoleValues.includes(v) && v !== WorkspaceRole.OWNER),
});

// ---- Series ----
export const CreateSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  tagline: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  genre: z.string().max(100).optional(),
  targetBooks: z.number().int().positive().default(1),
});

// ---- Wiki ----
export const WikiEntryTypeValues = Object.values(WikiEntryType) as [string, ...string[]];
export const WikiCanonStatusValues = Object.values(WikiCanonStatus) as [string, ...string[]];
export const WorkspaceRoleValues = Object.values(WorkspaceRole) as [string, ...string[]];
export const ExportTypeValues = Object.values(ExportType) as [string, ...string[]];
export const BoardTypeValues = Object.values(BoardType) as [string, ...string[]];

export const CreateWikiEntrySchema = z.object({
  title: z.string().min(1).max(300),
  entryType: z.string().refine((v) => WikiEntryTypeValues.includes(v), { message: 'Invalid entry type' }),
  bodyMarkdown: z.string().max(500_000).optional(),
  canonStatus: z.string().refine((v) => WikiCanonStatusValues.includes(v)).default('draft'),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  categoryId: z.string().uuid().optional(),
});

export const UpdateWikiEntrySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  bodyMarkdown: z.string().max(500_000).optional(),
  frontmatter: z.record(z.string(), z.unknown()).optional(),
  canonStatus: z.string().refine((v) => WikiCanonStatusValues.includes(v)).optional(),
  excerpt: z.string().max(500).optional(),
  changeSummary: z.string().max(200).optional(),
});

export const ApproveWikiEntrySchema = z.object({
  justification: z.string().max(1000).optional(),
});

// ---- Import ----
export const CreateImportSchema = z.object({
  seriesId: z.string().uuid(),
  originalFilename: z.string().min(1),
  importName: z.string().max(200).optional(),
});

export const ApproveImportSchema = z.object({
  importId: z.string().uuid(),
  approvedItemIds: z.array(z.string().uuid()).optional(),
});

// ---- Assets ----
export const AssetUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum([
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'image/gif', 'image/svg+xml',
    'text/markdown', 'text/plain', 'application/json', 'application/zip',
  ]),
  seriesId: z.string().uuid().optional(),
  role: z.string().default('reference'),
  isPublic: z.boolean().default(false),
});

// ---- Boards ----
export const CreateBoardSchema = z.object({
  seriesId: z.string().uuid(),
  bookId: z.string().uuid().optional(),
  boardType: z.string().refine((v) => BoardTypeValues.includes(v)),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const CreateBoardItemSchema = z.object({
  itemType: z.string().min(1),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(200),
  height: z.number().default(150),
  zIndex: z.number().int().default(0),
  title: z.string().max(200).optional(),
  bodyMarkdown: z.string().max(10_000).optional(),
  url: z.string().url().optional(),
  color: z.string().max(30).optional(),
  assetId: z.string().uuid().optional(),
  wikiEntryId: z.string().uuid().optional(),
});

// ---- Export ----
export const CreateExportSchema = z.object({
  seriesId: z.string().uuid(),
  bookId: z.string().uuid().optional(),
  exportType: z.string().refine((v) => ExportTypeValues.includes(v)),
  title: z.string().min(1).max(200),
});

// ---- Continuity ----
export const OverrideFlagSchema = z.object({
  justification: z.string().min(10).max(2000),
});

// ---- Approval ----
export const RevisionRequestSchema = z.object({
  justification: z.string().min(5).max(2000),
});

// Type exports
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type CreateSeriesInput = z.infer<typeof CreateSeriesSchema>;
export type CreateWikiEntryInput = z.infer<typeof CreateWikiEntrySchema>;
export type UpdateWikiEntryInput = z.infer<typeof UpdateWikiEntrySchema>;
export type CreateImportInput = z.infer<typeof CreateImportSchema>;
export type AssetUploadInput = z.infer<typeof AssetUploadSchema>;
export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type CreateExportInput = z.infer<typeof CreateExportSchema>;
export type OverrideFlagInput = z.infer<typeof OverrideFlagSchema>;
export type RevisionRequestInput = z.infer<typeof RevisionRequestSchema>;
