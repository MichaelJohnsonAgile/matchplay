# Quick Start: Adding Your Athletes

Follow these steps to replace the example athletes with your own.

## Step 1: Prepare Your Athlete List

Gather your athlete names and emails (email is optional).

## Step 2: Edit the Script

Open: `backend/scripts/manage-athletes.js`

Find the `NEW_ATHLETES` array (around line 20):

```javascript
const NEW_ATHLETES = [
  { name: 'John Smith', email: 'john@example.com' },
  { name: 'Jane Doe', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' },
  // Add more athletes here...
]
```

Replace with your athletes. Email is optional:

```javascript
const NEW_ATHLETES = [
  { name: 'Your First Athlete', email: 'athlete1@email.com' },
  { name: 'Second Athlete' },  // Email optional
  { name: 'Third Athlete', email: 'athlete3@email.com' },
  // Keep adding...
]
```

## Step 3: Enable Confirmation

Find this line (around line 103):

```javascript
const CONFIRM_DELETE = false // Set to true to actually run
```

Change to:

```javascript
const CONFIRM_DELETE = true // Set to true to actually run
```

## Step 4: Run the Script

```bash
cd backend
npm run athletes:manage
```

## Expected Output

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
   - Will add: 15 new athletes

🗑️  Clearing existing athletes...
✅ Deleted 12 athletes

➕ Adding 15 new athletes...
  1. Your First Athlete
  2. Second Athlete
  3. Third Athlete
  ...

✅ Successfully added 15 athletes

📋 Current Athletes:
────────────────────────────────────────────────────────────
  1. Your First Athlete (athlete1@email.com)
  2. Second Athlete
  3. Third Athlete (athlete3@email.com)
  ...
────────────────────────────────────────────────────────────
Total: 15 athletes

✅ Athlete management complete!
```

## Important Notes

1. **Rank Assignment**: Athletes are ranked in the order you list them (1, 2, 3, etc.)
2. **Email Optional**: You can leave email blank or omit it entirely
3. **Safety**: Script requires `CONFIRM_DELETE = true` to prevent accidents
4. **Validation**: Script validates all data before making changes

## Troubleshooting

### Error: "Database connection failed"
Make sure your backend database is set up. Run:
```bash
npm run db:init
```

### Error: "Athlete at index X is missing a name"
One of your athletes doesn't have a name. Check your array.

### Script shows confirmation warning but doesn't run
You need to set `CONFIRM_DELETE = true` in the script.

---

## Ready to Give Me Your List?

Just paste your athlete names and I'll format the script for you! For example:

```
John Smith - john@email.com
Jane Doe
Bob Johnson - bob@email.com
...
```

I'll convert this into the proper format and update the script automatically.

