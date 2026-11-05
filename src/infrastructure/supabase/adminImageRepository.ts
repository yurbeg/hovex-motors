import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./client";

export const ADMIN_IMAGE_BUCKET = "vehicle-images";
export const ADMIN_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const ADMIN_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AdminImageMimeType = typeof ADMIN_IMAGE_ALLOWED_MIME_TYPES[number];

const extensionByMimeType: Record<AdminImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export interface AdminImageUploadOptions {
  contentType: AdminImageMimeType;
  upsert: false;
}

/**
 * Small Storage boundary for offline tests and for keeping Supabase-specific
 * response shapes out of the validation and path-generation logic.
 */
export interface AdminImageDataSource {
  upload(path: string, file: File, options: AdminImageUploadOptions): Promise<void>;
  getPublicUrl(path: string): string;
}

export type AdminImageRepositoryErrorCode =
  | "ADMIN_IMAGE_EMPTY"
  | "ADMIN_IMAGE_TYPE_INVALID"
  | "ADMIN_IMAGE_TOO_LARGE"
  | "ADMIN_IMAGE_PATH_INVALID"
  | "ADMIN_IMAGE_UPLOAD_FAILED"
  | "ADMIN_IMAGE_PUBLIC_URL_FAILED";

export const ADMIN_IMAGE_ERROR_MESSAGES: Record<AdminImageRepositoryErrorCode, string> = {
  ADMIN_IMAGE_EMPTY: "Ընտրված նկարը դատարկ է։",
  ADMIN_IMAGE_TYPE_INVALID: "Ընտրեք JPG, PNG, WebP կամ AVIF ձևաչափի նկար։",
  ADMIN_IMAGE_TOO_LARGE: "Նկարի չափը չպետք է գերազանցի 8 ՄԲ-ը։",
  ADMIN_IMAGE_PATH_INVALID: "Նկարի անվտանգ հասցե ստեղծել չհաջողվեց։",
  ADMIN_IMAGE_UPLOAD_FAILED: "Նկարը Supabase Storage վերբեռնել չհաջողվեց։",
  ADMIN_IMAGE_PUBLIC_URL_FAILED: "Վերբեռնված նկարի հանրային հասցեն ստանալ չհաջողվեց։",
};

export class AdminImageRepositoryError extends Error {
  readonly code: AdminImageRepositoryErrorCode;

  constructor(code: AdminImageRepositoryErrorCode, cause?: unknown) {
    super(ADMIN_IMAGE_ERROR_MESSAGES[code], { cause });
    this.name = "AdminImageRepositoryError";
    this.code = code;
  }
}

function fail(code: AdminImageRepositoryErrorCode, cause?: unknown): never {
  if (cause instanceof AdminImageRepositoryError && cause.code === code) throw cause;
  throw new AdminImageRepositoryError(code, cause);
}

function resolveMimeType(file: File): AdminImageMimeType {
  if (!ADMIN_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as AdminImageMimeType)) {
    return fail("ADMIN_IMAGE_TYPE_INVALID");
  }
  return file.type as AdminImageMimeType;
}

function validateFileSize(file: File): void {
  if (file.size <= 0) fail("ADMIN_IMAGE_EMPTY");
  if (file.size > ADMIN_IMAGE_MAX_BYTES) fail("ADMIN_IMAGE_TOO_LARGE");
}

function generatedPathId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function normalizePathId(pathId?: string): string {
  const value = (pathId ?? generatedPathId()).trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9_-]{0,119})$/.test(value)) {
    return fail("ADMIN_IMAGE_PATH_INVALID");
  }
  return value;
}

function buildImagePath(mimeType: AdminImageMimeType, pathId?: string): string {
  return `vehicles/${normalizePathId(pathId)}.${extensionByMimeType[mimeType]}`;
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function requireDataSource(dataSource?: AdminImageDataSource): AdminImageDataSource {
  if (dataSource) return dataSource;
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return createSupabaseAdminImageDataSource(client);
}

export function createSupabaseAdminImageDataSource(
  client: SupabaseClient<Database>,
): AdminImageDataSource {
  const bucket = client.storage.from(ADMIN_IMAGE_BUCKET);
  return {
    async upload(path, file, options) {
      const { error } = await bucket.upload(path, file, {
        cacheControl: "3600",
        contentType: options.contentType,
        upsert: options.upsert,
      });
      if (error) throw error;
    },

    getPublicUrl(path) {
      return bucket.getPublicUrl(path).data.publicUrl;
    },
  };
}

export async function uploadAdminVehicleImage(
  file: File,
  {
    dataSource,
    pathId,
  }: {
    dataSource?: AdminImageDataSource;
    pathId?: string;
  } = {},
): Promise<{ path: string; publicUrl: string }> {
  const mimeType = resolveMimeType(file);
  validateFileSize(file);
  const path = buildImagePath(mimeType, pathId);

  let source: AdminImageDataSource;
  try {
    source = requireDataSource(dataSource);
    await source.upload(path, file, { contentType: mimeType, upsert: false });
  } catch (error) {
    return fail("ADMIN_IMAGE_UPLOAD_FAILED", error);
  }

  try {
    const publicUrl = source.getPublicUrl(path).trim();
    if (!isPublicHttpUrl(publicUrl)) fail("ADMIN_IMAGE_PUBLIC_URL_FAILED");
    return { path, publicUrl };
  } catch (error) {
    return fail("ADMIN_IMAGE_PUBLIC_URL_FAILED", error);
  }
}
