import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   */
  server: {
    DATABASE_URL: z.string().url(),
    DATABASE_URL_UNPOOLED: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GTFS_IMPORT_TOKEN: z.string().min(1).optional(),
    GTFS_IMPORT_DIR: z.string().min(1).optional(),
    GTFS_SNAPSHOT_STORAGE_DIR: z.string().min(1).optional(),
    GTFS_SERVICE_DATE: z.string().min(1).optional(),
    GTFS_APPROVED_SOURCE_HOSTS: z.string().min(1).optional(),
    GTFS_AGING_AFTER_HOURS: z.coerce.number().finite().nonnegative().optional(),
    GTFS_STALE_AFTER_HOURS: z.coerce.number().finite().nonnegative().optional(),
    GTFS_ALLOW_STALE_DEMO: z.enum(["true", "false"]).optional(),
    GTFS_STALE_DEMO_NOTE: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   */
  client: {
    NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().optional(),
  },

  /**
   * Destructure manually for Next.js runtime edge/client compatibility.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    NODE_ENV: process.env.NODE_ENV,
    GTFS_IMPORT_TOKEN: process.env.GTFS_IMPORT_TOKEN,
    GTFS_IMPORT_DIR: process.env.GTFS_IMPORT_DIR,
    GTFS_SNAPSHOT_STORAGE_DIR: process.env.GTFS_SNAPSHOT_STORAGE_DIR,
    GTFS_SERVICE_DATE: process.env.GTFS_SERVICE_DATE,
    GTFS_APPROVED_SOURCE_HOSTS: process.env.GTFS_APPROVED_SOURCE_HOSTS,
    GTFS_AGING_AFTER_HOURS: process.env.GTFS_AGING_AFTER_HOURS,
    GTFS_STALE_AFTER_HOURS: process.env.GTFS_STALE_AFTER_HOURS,
    GTFS_ALLOW_STALE_DEMO: process.env.GTFS_ALLOW_STALE_DEMO,
    GTFS_STALE_DEMO_NOTE: process.env.GTFS_STALE_DEMO_NOTE,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
