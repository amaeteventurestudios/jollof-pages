-- ============================================================
-- MIGRATION 006: Helper Functions and Counter RPCs
-- ============================================================

-- ---- increment_storage_usage ----
-- Called from assetService after a successful upload.
create or replace function increment_storage_usage(
  p_workspace_id uuid,
  p_bytes bigint,
  p_assets integer default 1
) returns void
language plpgsql
security definer
as $$
begin
  update storage_quotas
  set
    used_storage_bytes = used_storage_bytes + p_bytes,
    asset_count        = asset_count + p_assets,
    updated_at         = now()
  where workspace_id = p_workspace_id;

  -- Also write to workspace_usage (daily rollup row)
  insert into workspace_usage (
    workspace_id, period_start, period_end,
    storage_bytes_used, assets_uploaded, exports_created
  )
  values (
    p_workspace_id,
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '1 day',
    p_bytes, p_assets, 0
  )
  on conflict (workspace_id, period_start)
  do update set
    storage_bytes_used = workspace_usage.storage_bytes_used + excluded.storage_bytes_used,
    assets_uploaded    = workspace_usage.assets_uploaded + excluded.assets_uploaded;
end;
$$;

-- ---- decrement_storage_usage ----
create or replace function decrement_storage_usage(
  p_workspace_id uuid,
  p_bytes bigint,
  p_assets integer default 1
) returns void
language plpgsql
security definer
as $$
begin
  update storage_quotas
  set
    used_storage_bytes = greatest(0, used_storage_bytes - p_bytes),
    asset_count        = greatest(0, asset_count - p_assets),
    updated_at         = now()
  where workspace_id = p_workspace_id;
end;
$$;

-- ---- increment_scene_flag_count ----
-- Called from continuityService when a new continuity flag is raised.
create or replace function increment_scene_flag_count(
  p_scene_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update scenes
  set continuity_flag_count = continuity_flag_count + 1
  where id = p_scene_id;
end;
$$;

-- ---- decrement_scene_flag_count ----
create or replace function decrement_scene_flag_count(
  p_scene_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update scenes
  set continuity_flag_count = greatest(0, continuity_flag_count - 1)
  where id = p_scene_id;
end;
$$;

-- ---- increment_page_panel_count ----
-- Called from planningService when a panel is added to a page.
create or replace function increment_page_panel_count(
  p_page_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update pages
  set panel_count = panel_count + 1
  where id = p_page_id;
end;
$$;

-- ---- decrement_page_panel_count ----
create or replace function decrement_page_panel_count(
  p_page_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update pages
  set panel_count = greatest(0, panel_count - 1)
  where id = p_page_id;
end;
$$;

-- ---- increment_asset_usage_count ----
create or replace function increment_asset_usage_count(
  p_asset_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update assets
  set usage_count = usage_count + 1
  where id = p_asset_id;
end;
$$;

-- ---- workspace_usage unique constraint (if missing) ----
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workspace_usage_workspace_period_key'
  ) then
    alter table workspace_usage add constraint workspace_usage_workspace_period_key
      unique (workspace_id, period_start);
  end if;
end;
$$;
