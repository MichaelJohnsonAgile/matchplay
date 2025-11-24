# Backend Scripts

Utility scripts for managing the MatchPlay backend.

## Available Scripts

### Athlete Management

**`npm run athletes:manage`**

Clears all existing athletes and bulk imports new ones.

**Usage:**

1. Open `scripts/manage-athletes.js`
2. Edit the `NEW_ATHLETES` array with your athlete data:
   ```javascript
   const NEW_ATHLETES = [
     { name: 'John Smith', email: 'john@example.com' },
     { name: 'Jane Doe', email: 'jane@example.com' },
     // Add more...
   ]
   ```
3. Set `CONFIRM_DELETE = true` to enable the script
4. Run: `npm run athletes:manage`

**Features:**
- Validates athlete data before importing
- Shows preview of current athletes
- Displays summary of changes
- Requires explicit confirmation to prevent accidents
- Assigns ranks automatically based on order (1, 2, 3...)

**Safety:**
- Built-in confirmation flag prevents accidental deletion
- Validates all data before making changes
- Shows clear error messages if validation fails

**Example Output:**
```
============================================================
🏓 MatchPlay Athlete Management Script
============================================================

📋 Current Athletes:
────────────────────────────────────────────────────────────
  1. John Smith (john@example.com)
  2. Sarah Johnson (sarah@example.com)
  ...
────────────────────────────────────────────────────────────
Total: 12 athletes

🔍 Validating athlete data...
✅ All athletes valid

⚠️  WARNING: This will DELETE all existing athletes and add new ones!

📊 Summary:
   - Will delete: ALL existing athletes
   - Will add: 8 new athletes

🗑️  Clearing existing athletes...
✅ Deleted 12 athletes

➕ Adding 8 new athletes...
  1. New Athlete Name
  2. Another Athlete
  ...

✅ Successfully added 8 athletes
```

### Database Initialization

**`npm run db:init`**

Initializes the database schema and inserts sample data.

See `database/README.md` for more details.

---

## Creating New Scripts

When creating utility scripts:

1. Create in `scripts/` directory
2. Use ES6 modules (type: "module" in package.json)
3. Add `#!/usr/bin/env node` shebang
4. Import database functions from `../database/`
5. Add npm script in package.json
6. Document in this README

**Example:**
```javascript
#!/usr/bin/env node
import { query } from '../database/db.js'

async function main() {
  // Your script logic here
}

main()
```

