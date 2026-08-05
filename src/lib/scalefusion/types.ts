export interface ScalefusionDevice {
  id: number;
  device_name?: string;
  name?: string;
  model?: string;
  status?: string;
}

/** Subset of GET /api/v3/devices/{id}.json used by SPGPS (no secrets). */
export interface ScalefusionDeviceDetails {
  id: number;
  name?: string;
  make?: string;
  model?: string;
  os_version?: string;
  connection_status?: string;
  connection_state?: string;
  battery_status?: number;
  battery_charging?: boolean;
  battery_health?: string;
  phone_no?: string;
  sim_network?: string;
  licence_active?: boolean;
  licence_expires_at?: number;
  last_seen_on?: string;
  last_connected_at?: string;
  device_group?: { id?: number; name?: string } | null;
  license?: { expire_date?: string; code?: string } | null;
}

export interface ScalefusionLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  recorded_at?: string;
  timestamp?: string;
  created_at?: string;
  /** Unix timestamp — seconds or milliseconds depending on endpoint */
  date_time?: number;
  created_at_tz?: string;
}

export interface ScalefusionGeofenceDevice {
  id: number;
  device_id?: number;
  device_name?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    recorded_at?: string;
    timestamp?: string;
  };
  last_location?: ScalefusionLocation;
  last_seen_at?: string;
}

export interface ScalefusionListResponse<T> {
  devices?: T[];
  data?: T[];
  cursor?: number;
  next_cursor?: number;
}
