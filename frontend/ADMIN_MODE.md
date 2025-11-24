# Admin Mode

The MatchPlay app includes an admin mode that provides additional controls for managing game days, athletes, and matches.

## Enabling Admin Mode

Add `?admin=true` to any URL in the app:

**Dashboard:**
```
https://your-app.com/?admin=true
```

**Game Day Page:**
```
https://your-app.com/gameday/gd-123?admin=true
```

Admin mode will now persist as you navigate throughout the app!

## Admin Features

### Dashboard (`/?admin=true`)

- **Create Game Day** - Green "+" button to create new game days
- **Delete Game Day** - Trash icon appears when hovering over game day cards
- **Add Athlete** - Green "+" button in the leaderboard section

### Game Day Page (`/gameday/[id]?admin=true`)

- **Delete Game Day** - Red button at the top (only if no matches exist)
- **Add Athletes** - Add athletes to the game day
- **Remove Athletes** - Remove athletes from the game day
- **Generate Matches** - Create match schedule for the first round
- **Generate Next Round** - Create matches for subsequent rounds (when current round is complete)

### Athletes Tab (Admin Mode)

- Add athletes to the game day
- Remove athletes from the game day
- Generate initial draw

### Matches Tab (Admin Mode)

- Generate next round when current round is complete
- Update match scores

## Security Note

Currently, admin mode is **NOT password protected**. Anyone who knows to add `?admin=true` to the URL can access admin features.

This is suitable for:
- Internal team use
- Trusted user groups
- Development/testing environments

For production use with untrusted users, consider implementing proper authentication (see `HANDOFF.md` for future feature notes).

## Implementation Details

Admin mode is managed via URL query parameters and persists across navigation using the `useAdminMode` and `useNavigateWithAdmin` hooks located in `src/hooks/useAdminMode.js`.

When navigating between pages, the `?admin=true` parameter is automatically preserved so you don't need to re-add it on each page.

