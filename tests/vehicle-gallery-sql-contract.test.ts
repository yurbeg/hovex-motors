import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202611100004_vehicle_gallery.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

test("vehicle gallery migration is additive and backfills the legacy cover", async () => {
  const sql = await migrationSql();

  assert.doesNotMatch(sql, /create table public\.vehicles/);
  assert.match(sql, /alter table public\.vehicles add column if not exists images text\[\] not null default '\{\}'::text\[\]/);
  assert.match(sql, /update public\.vehicles set images = array\[image\] where cardinality\(images\) = 0/);
  assert.match(sql, /disable trigger vehicles_set_updated_at/);
  assert.match(sql, /enable trigger vehicles_set_updated_at/);
});

test("vehicle gallery validation bounds safe unique ordered URLs", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create or replace function app_private\.vehicle_images_are_valid\(candidate text\[\]\)/);
  assert.match(sql, /array_ndims\(candidate\) = 1/);
  assert.match(sql, /array_lower\(candidate, 1\) = 1/);
  assert.match(sql, /cardinality\(candidate\) between 1 and 12/);
  assert.match(sql, /char_length\(image_url\) not between 1 and 2048/);
  assert.match(sql, /count\(distinct gallery\.image_url\)/);
  assert.match(sql, /add constraint vehicles_images_valid_check check \(app_private\.vehicle_images_are_valid\(images\)\)/);
  assert.match(sql, /add constraint vehicles_image_cover_check check \(image = images\[1\]\)/);
});

test("vehicle gallery trigger supports old image-only and new gallery-aware writes", async () => {
  const sql = await migrationSql();

  assert.match(sql, /before insert or update of image, images on public\.vehicles/);
  assert.match(sql, /if new\.images is null or cardinality\(new\.images\) = 0 then new\.images := array\[new\.image\]/);
  assert.match(sql, /new\.image is distinct from old\.image and new\.images is not distinct from old\.images/);
  assert.match(sql, /where gallery\.position > 1 and gallery\.image_url is distinct from new\.image/);
  assert.match(sql, /new\.images := array\[new\.image\] \|\| preserved_images/);
  assert.match(sql, /new\.image := new\.images\[1\]/);
});
