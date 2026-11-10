import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202611100006_seed_listam_test_inventory.sql",
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return readFile(migrationUrl, "utf8");
}

test("List.am prototype seed creates exactly ten attributed available vehicles", async () => {
  const sql = await migrationSql();
  const vehicleIds = [...sql.matchAll(/'listam-(\d+)'/g)].map((match) => match[1]);
  const listingAttributions = [...sql.matchAll(/List\.am · հայտարարություն #(\d+)/g)]
    .map((match) => match[1]);

  assert.equal(vehicleIds.length, 10);
  assert.equal(new Set(vehicleIds).size, 10);
  assert.deepEqual(listingAttributions, vehicleIds);
  assert.equal((sql.match(/'Փորձնական · List\.am'/g) || []).length, 10);
  assert.equal((sql.match(/'published',\s*\n\s*'available'/g) || []).length, 10);
  assert.match(sql, /on conflict \(id\) do nothing/i);
});

test("every seeded vehicle has five to seven unique List.am gallery images", async () => {
  const sql = await migrationSql();
  const galleries = [...sql.matchAll(/array\[([\s\S]*?)\]::text\[\]/g)];

  assert.equal(galleries.length, 10);
  for (const [, gallery] of galleries) {
    const images = [...gallery.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.ok(images.length >= 5 && images.length <= 7);
    assert.equal(new Set(images).size, images.length);
    assert.ok(images.every((url) => /^https:\/\/img\.list\.am\/f\/\d{3}\/\d+\.webp$/.test(url)));
  }
});

test("seed excludes seller contact and vehicle-identifying private fields", async () => {
  const sql = (await migrationSql()).replace(/--.*$/gm, "");

  assert.doesNotMatch(sql, /\+374|\bphone\b|\btelephone\b|\bseller\b|\bvin\b/i);
});
