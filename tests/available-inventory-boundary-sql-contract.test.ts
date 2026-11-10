import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202611100005_available_inventory_boundary.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

test("new manually managed vehicles default to available inventory", async () => {
  const sql = await migrationSql();

  assert.match(sql, /alter column inventory_status set default 'available'/);
  assert.match(sql, /create policy vehicles_admin_insert on public\.vehicles for insert to authenticated with check \( \(select app_private\.is_vehicle_admin\(\)\) and inventory_status = 'available' \)/);
});

test("public RLS exposes only published available vehicles without restricting admin legacy updates", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create policy vehicles_public_read_available on public\.vehicles for select to anon, authenticated using \( status = 'published' and inventory_status = 'available' \)/);
  assert.doesNotMatch(sql, /drop policy if exists vehicles_admin_read_all/);
  assert.doesNotMatch(sql, /drop policy if exists vehicles_admin_update/);
  assert.doesNotMatch(sql, /update public\.vehicles set inventory_status/);
});
