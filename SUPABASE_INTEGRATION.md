# Supabase Integration Guide

## ✅ Database Schema Updated

The Supabase PostgreSQL database has been updated with the comprehensive drone registration schema. All changes have been successfully applied to `db.gkvdkwpivhyayijqkxwk.supabase.co`.

### New Drone Table Fields

The `drone` table now includes:

```sql
-- New Columns Added
manufacturer VARCHAR(100)           -- Drone manufacturer (e.g., DJI)
model VARCHAR(100)                  -- Drone model (e.g., Matrice 350)
droneType ENUM (QUADCOPTER, FIXED_WING, HYBRID, OTHER)
serialNumber VARCHAR(100) UNIQUE    -- Unique serial number
registrationNumber VARCHAR(100) UNIQUE -- Government registration number (optional)
operationalStatus ENUM (ACTIVE, INACTIVE, MAINTENANCE) DEFAULT ACTIVE
dateAcquired DATE                   -- When drone was purchased
lastInspectionDate DATE             -- Last maintenance/inspection
notes VARCHAR(1000)                 -- Additional remarks
assignedOperatorId INT REFERENCES user(id) -- Assigned operator

-- New Indexes
- serialNumber (UNIQUE)
- assignedOperatorId
```

## 📦 Frontend Integration

The React app is now configured to connect directly to Supabase using the `@supabase/supabase-js` client library.

### Configuration

**File:** `.env`
```env
VITE_SUPABASE_URL=https://gkvdkwpivhyayijqkxwk.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
DATABASE_URL=postgresql://postgres:...  # For backend use
```

## 🔧 React Hooks for Database Operations

### `useDroneDatabase` Hook

Located in `src/hooks/useDroneDatabase.ts`, provides these functions:

```typescript
// Get all drones for an agency
const { getDronesByAgency } = useDroneDatabase()
const drones = await getDronesByAgency(agencyId)

// Get single drone
const drone = await getDroneById(droneId)

// Validate uniqueness (before creating)
const exists = await checkSerialNumberExists(serialNumber)

// Create new drone
const newDrone = await createDrone({
  callsign: 'Sentinel-1',
  manufacturer: 'DJI',
  model: 'Matrice 350 RTK',
  droneType: 'QUADCOPTER',
  serialNumber: 'DRN-001',
  registrationNumber: 'REG-2025-0001',
  operationalStatus: 'ACTIVE',
  dateAcquired: '2025-11-06',
  lastInspectionDate: '2026-08-15',
  notes: 'Primary rescue drone',
  assignedOperatorId: 42,
  agencyId: 1,
  addedBy: 1
})

// Update drone
const updated = await updateDrone(droneId, {
  operationalStatus: 'MAINTENANCE',
  lastInspectionDate: '2026-08-20'
})

// Delete drone
await deleteDrone(droneId)
```

## 🚀 Next Steps: Connect the Drone Registration Page

To use the Supabase database with the drone registration form:

### 1. Update `CommandStaffDroneRegistrationPage.tsx`

Replace the mock `registerDrone` function with the Supabase hook:

```typescript
import { useDroneDatabase } from '../hooks/useDroneDatabase'

export function CommandStaffDroneRegistrationPage() {
  const { createDrone, checkSerialNumberExists, isLoading, error } = useDroneDatabase()
  
  async function handleSubmit() {
    // Validate uniqueness
    const serialExists = await checkSerialNumberExists(formData.serialNumber)
    if (serialExists) {
      setStepError('Serial number already exists')
      return
    }

    // Create drone in database
    const newDrone = await createDrone({
      callsign: formData.name,
      manufacturer: formData.manufacturer,
      model: formData.model,
      droneType: formData.droneType as any,
      serialNumber: formData.serialNumber,
      registrationNumber: formData.registrationNumber,
      operationalStatus: formData.operationalStatus as any,
      dateAcquired: formData.dateAcquired,
      lastInspectionDate: formData.lastInspectionDate,
      notes: formData.notes,
      assignedOperatorId: formData.assignedOperatorId,
      agencyId: session.agencyId!,
      addedBy: session.id!
    })

    if (newDrone) {
      setRegisteredDrone({ id: newDrone.id, name: newDrone.callsign })
    }
  }
}
```

### 2. Update `CommandStaffDronesMediaPage.tsx`

Replace mock drones with database drones:

```typescript
import { useDroneDatabase } from '../hooks/useDroneDatabase'

export function CommandStaffDronesMediaPage() {
  const { getDronesByAgency, isLoading } = useDroneDatabase()
  const [drones, setDrones] = useState<DroneRecord[]>([])

  useEffect(() => {
    if (session?.agencyId) {
      getDronesByAgency(session.agencyId).then(setDrones)
    }
  }, [session?.agencyId])

  // ... rest of component
}
```

### 3. Update `CommandStaffDataProvider.tsx`

Replace mock drone operations with Supabase hook:

```typescript
import { useDroneDatabase } from '../../hooks/useDroneDatabase'

export function CommandStaffDataProvider({ children }: { children: ReactNode }) {
  const { createDrone } = useDroneDatabase()

  function registerDrone(input: DroneRegistrationData) {
    createDrone({
      callsign: input.name,
      manufacturer: input.manufacturer,
      model: input.model,
      droneType: input.droneType,
      serialNumber: input.serialNumber,
      registrationNumber: input.registrationNumber,
      operationalStatus: input.operationalStatus,
      dateAcquired: input.dateAcquired,
      lastInspectionDate: input.lastInspectionDate,
      notes: input.notes,
      assignedOperatorId: input.assignedOperatorId,
      agencyId: agencyId!,
      addedBy: session!.id
    })
  }

  // ... rest of provider
}
```

## 🔐 Security & Row-Level Security (RLS)

The Supabase database is currently using the public `anon` key. For production, enable Row-Level Security (RLS) policies:

### Enable RLS on drone table:

1. Go to Supabase Dashboard → Authentication → Policies
2. Create policy for `SELECT` (users can only see drones from their agency):
   ```sql
   SELECT on drone WHERE agencyId = auth.uid()
   ```

3. Create policy for `INSERT` (only Command Staff can create drones):
   ```sql
   INSERT on drone 
   WHERE (agencyId = (SELECT agencyId FROM "user" WHERE id = auth.uid()))
   AND EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND role = 'COMMAND_STAFF')
   ```

## 🧪 Testing

### Manual Database Test

```typescript
import { supabase } from './src/lib/supabase'

// Test connection
const { data, error } = await supabase
  .from('drone')
  .select('*')
  .limit(1)

console.log(data, error)
```

### Browser Console Test

```javascript
// In browser console
import { useDroneDatabase } from './src/hooks/useDroneDatabase'
const { getDronesByAgency } = useDroneDatabase()
const drones = await getDronesByAgency(1)
console.log(drones)
```

## 📝 Notes

- **Mock Data**: The app currently uses mock data from `src/data/mockDrones.ts`. These don't automatically sync with the database. You'll need to migrate mock data to Supabase if desired.
- **Authentication**: Currently using public Anon key. Implement proper authentication for production.
- **Real-time Updates**: To enable real-time drone list updates, use Supabase's `.on()` subscription:

  ```typescript
  const subscription = supabase
    .from('drone')
    .on('*', payload => {
      // Handle updates
    })
    .subscribe()
  ```

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
Run: `npm install @supabase/supabase-js`

### "Missing Supabase environment variables"
Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Database connection fails
- Check database is online: `https://supabase.com/dashboard`
- Verify credentials in `.env`
- Check Supabase IP whitelist if using restricted access

## 📚 Resources

- [Supabase JavaScript Documentation](https://supabase.com/docs/reference/javascript)
- [Prisma Schema Generated](./src/generated/)
- [Supabase Table Editor](https://supabase.com/dashboard)
