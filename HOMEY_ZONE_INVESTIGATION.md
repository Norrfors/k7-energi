är det klart
# Homey Zone Investigation - 2026-02-27 Kväll

## Utgångspunkt
Vi är på v0.34 med fungerande INNE/UTE klassificering, men **zones från Homey visar null/404**.

Backend försöker hämta från `/api/manager/zones` men får 404.

---

## Fynd från Earlier Versions (v0.22-v0.25)

### ✅ v0.25 - HAD WORKING ZONE HANDLING
Found i `backend/src/modules/homey/homey.service.ts`:

**HomeyDevice interface hade:**
```typescript
interface HomeyDevice {
  id: string;
  name: string;
  zoneName?: string;  // 👈 Zone kom HÄRIFRÅN
  capabilities: string[];
  capabilitiesObj: Record<string, HomeyDeviceCapability>;
}
```

**Plus manuell mappning:**
```typescript
private deviceZoneMapping: Record<string, string> = {
  "Outdoor Occupancy Sensor GARAGE": "Garage",
  "Outdoor Occupancy Sensor HUVUDENTRE": "Huvudentre",
  "k7 ÔÇö ├ûV Huvudsovrum": "Huvudsovrum",
  // ... etc
};

private getZoneForDevice(deviceName: string): string {
  // Först: Kolla manuell mappning
  if (this.deviceZoneMapping[deviceName]) {
    return this.deviceZoneMapping[deviceName];
  }
  // Sedan: Extrahera från namn
  // Fallback: "Okänd"
}
```

### 🔍 v0.24 - LESS DETAIL
Had `zoneName?: string` in interface but not used in actual response.

---

## NEXT ACTIONS FOR MORNING

### 1. CHECK v0.25 FULLY
- Get complete `homey.service.ts` from v0.25
- See if `zoneName` was populated from Homey directly OR manually via mapping
- If manually mapped: check if that mapping still works in v0.34

### 2. TEST API ENDPOINTS
- ❌ `/api/manager/zones` → returns 404 (doesn't exist or wrong auth)
- ✅ `/api/manager/devices/device/` → works (we're using this)
  
**Theory:** Zone might come INSIDE device object, not separate endpoint
  - Check if device has `zone` or `zoneName` or `zone.id` or `zone.name`

### 3. DEBUG STRATEGY
```bash
# Get raw device from Homey to see structure
curl -H "Authorization: Bearer <TOKEN>" \
  http://192.168.1.122/api/manager/devices/device/ | jq . | grep -i zone

# Check if zones are embedded in each device
```

### 4. IMPLEMENTATION OPTIONS
- **Option A:** Extract zoneName directly from device object (if it exists)
- **Option B:** Use manual mapping like v0.25 did (proven to work)
- **Option C:** If zoneName exists on device, cache it like v0.25 approach

---

## FILES TO CHECK IN MORNING

1. `git show v0.25:backend/src/modules/homey/homey.service.ts`
   - Full implementation with zone handling
   
2. `git show v0.23:backend/src/modules/homey/homey.service.ts`
   - Check progression

3. Backend logs from successful startup
   - See if zones were ever actually fetched

---

## CURRENT STATE

**Working:** ✅
- INNE/UTE klassificering (saved to DB)
- Display on dashboard
- All three services running

**Broken:** ❌
- Zone display shows null
- `/api/manager/zones` returns 404

**Next Step:** Understand how v0.25 got zones to work, then restore that logic.

