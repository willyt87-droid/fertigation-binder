/**
 * AROYA public API — plan only. Not called in v1.
 * Swagger: https://api.aroya.io/public_api/swagger/
 * Base:    https://api.aroya.io/public_api/
 *
 * Auth later: Authorization: Bearer <key> from AROYA support (generic API user).
 * Validate later: GET /public_api/validate/
 *
 * Read-only endpoints we will use in a later release:
 * - GET /public_api/facilities/
 * - GET /public_api/rooms/   (room_type PROP|VEG|FLOWER|DRY|CURE|STORAGE|OTHER,
 *                             substrate_type GENERIC|ROCKWOOL|COCO|PEAT|SOIL|SOILLESS, zones[])
 * - GET /public_api/devices/ (facility, room, zone, serial_number, model_key)
 * - GET /public_api/rooms/{id}/chart/
 * - GET /public_api/devices/{id}/chart/
 *
 * Do not import this module from runtime UI in v1. Settings store a key and ids only.
 */
export const AROYA_PUBLIC_BASE = 'https://api.aroya.io/public_api'

export const AROYA_ENDPOINTS = {
  validate: '/validate/',
  facilities: '/facilities/',
  rooms: '/rooms/',
  devices: '/devices/',
  roomChart: (id: string) => `/rooms/${id}/chart/`,
  deviceChart: (id: string) => `/devices/${id}/chart/`,
} as const

export type AroyaConnectionStatus = 'not_connected' | 'key_saved'

/** Unused in v1 — live pull is a later release. */
export function aroyaStatus(apiKey: string | null): AroyaConnectionStatus {
  return apiKey && apiKey.trim() ? 'key_saved' : 'not_connected'
}
