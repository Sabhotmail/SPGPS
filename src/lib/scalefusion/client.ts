import {
  ScalefusionDevice,
  ScalefusionDeviceDetails,
  ScalefusionGeofenceDevice,
  ScalefusionListResponse,
  ScalefusionLocation,
} from "./types";
import {
  acquireScalefusionSlot,
  getRateLimitMode,
  getRateLimitStats,
  notifyRateLimited,
  parseRetryAfterMs,
} from "./rate-limiter";

export type { ScalefusionLocation };

export class ScalefusionRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "ScalefusionRateLimitError";
  }
}
/** Thrown when ?date= is older than Scalefusion retention (~30 days). */
export class ScalefusionDateOutOfRangeError extends Error {
  constructor(
    message: string,
    public readonly minDate: Date | null
  ) {
    super(message);
    this.name = "ScalefusionDateOutOfRangeError";
  }
}

function parseMinDateFrom422(body: string): Date | null {
  const match = body.match(/greater than\s+(\d{4}-\d{2}-\d{2}[^\"]*)/i);
  if (!match?.[1]) return null;
  const parsed = new Date(match[1].trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getBaseUrl(): string {
  return process.env.SCALEFUSION_BASE_URL ?? "https://api.scalefusion.com";
}

function getApiKey(): string {
  const key = process.env.SCALEFUSION_API_KEY;
  if (!key) {
    throw new Error("SCALEFUSION_API_KEY is not configured");
  }
  return key;
}

async function scalefusionFetch<T>(
  path: string,
  retries = 8
): Promise<T> {
  let lastError: Error | null = null;
  const maxAttempts =
    getRateLimitMode() === "aggressive" ? Math.max(retries, 12) : 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await acquireScalefusionSlot();

      const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
          // Scalefusion API Explorer uses Token auth
          Authorization: `Token ${getApiKey()}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 429) {
        const retryAfterMs =
          parseRetryAfterMs(response) ??
          Math.min(60_000, 5_000 * Math.pow(2, Math.min(attempt, 4)));
        notifyRateLimited(retryAfterMs);
        lastError = new ScalefusionRateLimitError(
          `Scalefusion rate limited (429)`,
          retryAfterMs
        );
        // acquireScalefusionSlot() on next loop will wait until pause clears
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 422 && /greater than/i.test(text)) {
          throw new ScalefusionDateOutOfRangeError(
            `Scalefusion API error 422: ${text.slice(0, 200)}`,
            parseMinDateFrom422(text)
          );
        }
        throw new Error(
          `Scalefusion API error ${response.status}: ${text.slice(0, 200)}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ScalefusionDateOutOfRangeError) {
        throw error;
      }
      if (error instanceof ScalefusionRateLimitError) {
        lastError = error;
        continue;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError ?? new Error("Scalefusion API request failed");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeLocation(raw: unknown): ScalefusionLocation | null {
  const loc = asRecord(raw);
  if (!loc) return null;

  const latitude = Number(loc.latitude ?? loc.lat);
  const longitude = Number(loc.longitude ?? loc.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    accuracy: loc.accuracy != null ? Number(loc.accuracy) : undefined,
    recorded_at: (loc.recorded_at ?? loc.created_at_tz ?? loc.created_at) as
      | string
      | undefined,
    timestamp: loc.timestamp as string | undefined,
    created_at: loc.created_at as string | undefined,
    date_time: loc.date_time != null ? Number(loc.date_time) : undefined,
    created_at_tz: loc.created_at_tz as string | undefined,
  };
}

/** Scalefusion wraps list items as `{ device: { id, name, ... } }`. */
function normalizeDevice(raw: unknown): ScalefusionDevice | null {
  const item = asRecord(raw);
  if (!item) return null;

  const nested = asRecord(item.device) ?? item;
  const id = nested.id ?? item.id ?? item.device_id;
  if (id == null) return null;

  return {
    id: Number(id),
    device_name: (nested.device_name ?? nested.name ?? item.name) as
      | string
      | undefined,
    name: (nested.name ?? item.name) as string | undefined,
    model: nested.model as string | undefined,
    status: nested.status as string | undefined,
  };
}

function normalizeGeofenceDevice(raw: unknown): ScalefusionGeofenceDevice | null {
  const item = asRecord(raw);
  if (!item) return null;

  const id = item.id ?? item.device_id;
  if (id == null) return null;

  const location = normalizeLocation(item.location);

  return {
    id: Number(id),
    device_id: item.device_id != null ? Number(item.device_id) : undefined,
    device_name: (item.device_name ?? item.name) as string | undefined,
    name: item.name as string | undefined,
    latitude: location?.latitude,
    longitude: location?.longitude,
    accuracy: location?.accuracy,
    location: location ?? undefined,
    last_seen_at: (item.last_seen_at ?? location?.recorded_at) as
      | string
      | undefined,
  };
}

function normalizeList<T>(
  data: unknown,
  normalize: (raw: unknown) => T | null
): T[] {
  const items = Array.isArray(data)
    ? data
    : asRecord(data)?.devices ?? asRecord(data)?.data ?? [];

  if (!Array.isArray(items)) return [];

  return items
    .map((item) => normalize(item))
    .filter((item): item is T => item != null);
}

export async function fetchDevices(): Promise<ScalefusionDevice[]> {
  // Single list call — do not fan-out per device (protects the 30/min budget).
  const path = process.env.SCALEFUSION_DEVICES_PATH ?? "/api/v1/devices.json";
  const data = await scalefusionFetch<unknown>(path);
  return normalizeList(data, normalizeDevice);
}

/**
 * Full device metadata — GET /api/v3/devices/{id}.json
 * ~1 call per device; use during daily sync or on-demand admin refresh.
 */
export async function fetchDeviceDetails(
  deviceId: number
): Promise<ScalefusionDeviceDetails> {
  const data = await scalefusionFetch<unknown>(
    `/api/v3/devices/${deviceId}.json`
  );
  const details = normalizeDeviceDetails(data);
  if (!details) {
    throw new Error(`Invalid device details response for id=${deviceId}`);
  }
  return details;
}

function normalizeDeviceDetails(raw: unknown): ScalefusionDeviceDetails | null {
  const item = asRecord(raw);
  if (!item) return null;
  const nested = asRecord(item.device) ?? item;
  const id = nested.id ?? item.id;
  if (id == null) return null;

  const group = asRecord(nested.device_group);
  const license = asRecord(nested.license);

  return {
    id: Number(id),
    name: (nested.name ?? nested.device_name) as string | undefined,
    make: nested.make as string | undefined,
    model: (nested.model ?? nested.model_name) as string | undefined,
    os_version: nested.os_version as string | undefined,
    connection_status: nested.connection_status as string | undefined,
    connection_state: nested.connection_state as string | undefined,
    battery_status:
      nested.battery_status != null ? Number(nested.battery_status) : undefined,
    battery_charging:
      typeof nested.battery_charging === "boolean"
        ? nested.battery_charging
        : typeof nested.charging === "boolean"
          ? nested.charging
          : undefined,
    battery_health: nested.battery_health as string | undefined,
    phone_no: nested.phone_no as string | undefined,
    sim_network: nested.sim_network as string | undefined,
    licence_active:
      typeof nested.licence_active === "boolean"
        ? nested.licence_active
        : undefined,
    licence_expires_at:
      nested.licence_expires_at != null
        ? Number(nested.licence_expires_at)
        : undefined,
    last_seen_on: nested.last_seen_on as string | undefined,
    last_connected_at: nested.last_connected_at as string | undefined,
    device_group: group
      ? {
          id: group.id != null ? Number(group.id) : undefined,
          name: group.name as string | undefined,
        }
      : null,
    license: license
      ? {
          expire_date: license.expire_date as string | undefined,
          // intentionally omit license.code (secret)
        }
      : null,
  };
}

/**
 * Bulk location fetch — preferred for polling.
 * With ~73 devices and per_page=500 this is typically 1 request/cycle.
 */
export async function fetchLocationGeofence(): Promise<
  ScalefusionGeofenceDevice[]
> {
  const allDevices: ScalefusionGeofenceDevice[] = [];
  let cursor: number | undefined;
  let pages = 0;
  const maxPages = 20;

  do {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", String(cursor));
    // Max allowed is 5000; use 500 for smaller payloads.
    query.set("per_page", "500");

    const path = `/api/v1/devices/location_geofence.json?${query.toString()}`;
    const data = await scalefusionFetch<
      ScalefusionListResponse<ScalefusionGeofenceDevice> & {
        cursor?: number;
      }
    >(path);

    const batch = normalizeList(data, normalizeGeofenceDevice);
    allDevices.push(...batch);
    cursor = data.cursor ?? data.next_cursor;
    pages++;
  } while (cursor && pages < maxPages);

  console.log(
    `[scalefusion] location_geofence: ${allDevices.length} devices in ${pages} page(s)`,
    getRateLimitStats()
  );

  return allDevices;
}

/**
 * Per-device history — expensive. Prefer location_geofence for polling.
 * Use only for backfill, and always go through the rate limiter.
 */
export async function fetchDeviceLocations(
  deviceId: number,
  date?: string
): Promise<ScalefusionLocation[]> {
  const query = date ? `?date=${date}` : "";
  const data = await scalefusionFetch<
    | ScalefusionLocation[]
    | { locations?: ScalefusionLocation[]; data?: ScalefusionLocation[] }
  >(`/api/v1/devices/${deviceId}/locations.json${query}`);

  if (Array.isArray(data)) return data;
  return data.locations ?? data.data ?? [];
}

export function extractLocation(
  device: ScalefusionGeofenceDevice
): ScalefusionLocation | null {
  if (device.location?.latitude && device.location?.longitude) {
    return device.location;
  }

  if (device.latitude != null && device.longitude != null) {
    return {
      latitude: device.latitude,
      longitude: device.longitude,
      accuracy: device.accuracy,
      recorded_at: device.last_seen_at,
    };
  }

  if (device.last_location?.latitude && device.last_location?.longitude) {
    return device.last_location;
  }

  return null;
}

export function parseRecordedAt(location: ScalefusionLocation): Date {
  if (location.date_time != null) {
    const ms =
      location.date_time > 1_000_000_000_000
        ? location.date_time
        : location.date_time * 1000;
    const fromUnix = new Date(ms);
    if (!Number.isNaN(fromUnix.getTime())) return fromUnix;
  }

  const raw =
    location.recorded_at ??
    location.created_at_tz ??
    location.timestamp ??
    location.created_at;
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
