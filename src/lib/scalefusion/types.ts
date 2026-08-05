export interface ScalefusionDevice {
  id: number;
  device_name?: string;
  name?: string;
  model?: string;
  status?: string;
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
