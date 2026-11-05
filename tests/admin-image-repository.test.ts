import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_IMAGE_ALLOWED_MIME_TYPES,
  ADMIN_IMAGE_ERROR_MESSAGES,
  ADMIN_IMAGE_MAX_BYTES,
  AdminImageRepositoryError,
  uploadAdminVehicleImage,
} from "../src/adminImageRepository";
import type {
  AdminImageDataSource,
  AdminImageMimeType,
  AdminImageUploadOptions,
} from "../src/adminImageRepository";

interface UploadCall {
  path: string;
  file: File;
  options: AdminImageUploadOptions;
}

function imageFile(type: string, size = 1, name = "vehicle-image"): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeDataSource({
  publicUrl = "https://example.supabase.co/storage/v1/object/public/vehicle-images/result.jpg",
  upload,
  getPublicUrl,
}: {
  publicUrl?: string;
  upload?: AdminImageDataSource["upload"];
  getPublicUrl?: AdminImageDataSource["getPublicUrl"];
} = {}): AdminImageDataSource {
  return {
    upload: upload ?? (async () => {}),
    getPublicUrl: getPublicUrl ?? (() => publicUrl),
  };
}

test("accepts supported image MIME types, uses safe extensions, and never overwrites", async () => {
  const cases: Array<[AdminImageMimeType, string]> = [
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/avif", "avif"],
  ];
  assert.deepEqual(ADMIN_IMAGE_ALLOWED_MIME_TYPES, cases.map(([mime]) => mime));

  for (const [mimeType, extension] of cases) {
    let call: UploadCall | undefined;
    const file = imageFile(mimeType, 4, `car.${extension}`);
    const dataSource = makeDataSource({
      upload: async (path, uploadedFile, options) => {
        call = { path, file: uploadedFile, options };
      },
      getPublicUrl: (path) => `https://cdn.example.test/${path}`,
    });

    const result = await uploadAdminVehicleImage(file, {
      dataSource,
      pathId: "Fixed_ID-2026",
    });

    assert.deepEqual(call, {
      path: `vehicles/fixed_id-2026.${extension}`,
      file,
      options: { contentType: mimeType, upsert: false },
    });
    assert.deepEqual(result, {
      path: `vehicles/fixed_id-2026.${extension}`,
      publicUrl: `https://cdn.example.test/vehicles/fixed_id-2026.${extension}`,
    });
  }
});

test("accepts exactly 8 MB and rejects a larger image before upload", async () => {
  let uploads = 0;
  const dataSource = makeDataSource({
    upload: async () => { uploads += 1; },
  });

  await uploadAdminVehicleImage(
    imageFile("image/jpeg", ADMIN_IMAGE_MAX_BYTES),
    { dataSource, pathId: "at-size-limit" },
  );
  assert.equal(uploads, 1);

  await assert.rejects(
    () => uploadAdminVehicleImage(
      imageFile("image/jpeg", ADMIN_IMAGE_MAX_BYTES + 1),
      { dataSource, pathId: "over-size-limit" },
    ),
    (error: unknown) => error instanceof AdminImageRepositoryError
      && error.code === "ADMIN_IMAGE_TOO_LARGE"
      && error.message === ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_TOO_LARGE,
  );
  assert.equal(uploads, 1);
});

test("rejects empty and unsupported files before calling the data source", async () => {
  let uploads = 0;
  const dataSource = makeDataSource({
    upload: async () => { uploads += 1; },
  });

  await assert.rejects(
    () => uploadAdminVehicleImage(imageFile("image/png", 0), { dataSource }),
    (error: unknown) => error instanceof AdminImageRepositoryError
      && error.code === "ADMIN_IMAGE_EMPTY"
      && error.message === ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_EMPTY,
  );
  await assert.rejects(
    () => uploadAdminVehicleImage(imageFile("image/gif"), { dataSource }),
    (error: unknown) => error instanceof AdminImageRepositoryError
      && error.code === "ADMIN_IMAGE_TYPE_INVALID"
      && error.message === ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_TYPE_INVALID,
  );
  assert.equal(uploads, 0);
});

test("generated paths are unique and do not include the original file name", async () => {
  const paths: string[] = [];
  const dataSource = makeDataSource({
    upload: async (path) => { paths.push(path); },
    getPublicUrl: (path) => `https://cdn.example.test/${path}`,
  });
  const file = imageFile("image/webp", 1, "../../unsafe name.webp");

  await uploadAdminVehicleImage(file, { dataSource });
  await uploadAdminVehicleImage(file, { dataSource });

  assert.equal(paths.length, 2);
  assert.notEqual(paths[0], paths[1]);
  assert.match(paths[0] || "", /^vehicles\/[a-z0-9][a-z0-9_-]{0,119}\.webp$/);
  assert.ok(paths.every((path) => !path.includes("unsafe") && !path.includes("..")));
});

test("rejects an unsafe injected path id before upload", async () => {
  let uploads = 0;
  const dataSource = makeDataSource({
    upload: async () => { uploads += 1; },
  });

  await assert.rejects(
    () => uploadAdminVehicleImage(imageFile("image/avif"), {
      dataSource,
      pathId: "../../another-bucket/file",
    }),
    (error: unknown) => error instanceof AdminImageRepositoryError
      && error.code === "ADMIN_IMAGE_PATH_INVALID"
      && error.message === ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_PATH_INVALID,
  );
  assert.equal(uploads, 0);
});

test("wraps upload failures with a stable Armenian error and preserves the cause", async () => {
  const cause = new Error("raw storage error");
  let publicUrlCalls = 0;
  const dataSource = makeDataSource({
    upload: async () => { throw cause; },
    getPublicUrl: () => {
      publicUrlCalls += 1;
      return "https://cdn.example.test/unreachable.jpg";
    },
  });

  await assert.rejects(
    () => uploadAdminVehicleImage(imageFile("image/jpeg"), {
      dataSource,
      pathId: "upload-failure",
    }),
    (error: unknown) => {
      assert.ok(error instanceof AdminImageRepositoryError);
      assert.equal(error.code, "ADMIN_IMAGE_UPLOAD_FAILED");
      assert.equal(error.message, ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_UPLOAD_FAILED);
      assert.equal(error.cause, cause);
      return true;
    },
  );
  assert.equal(publicUrlCalls, 0);
});

test("rejects a missing or unsafe public URL with a stable Armenian error", async () => {
  for (const publicUrl of ["", "javascript:alert(1)", "not a URL"]) {
    const dataSource = makeDataSource({ publicUrl });
    await assert.rejects(
      () => uploadAdminVehicleImage(imageFile("image/png"), {
        dataSource,
        pathId: "invalid-public-url",
      }),
      (error: unknown) => error instanceof AdminImageRepositoryError
        && error.code === "ADMIN_IMAGE_PUBLIC_URL_FAILED"
        && error.message === ADMIN_IMAGE_ERROR_MESSAGES.ADMIN_IMAGE_PUBLIC_URL_FAILED,
    );
  }
});
