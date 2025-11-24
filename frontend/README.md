# MatchPlay Frontend

A mobile-first React application for pickleball scoring and league management.

## Tech Stack

- React 18
- Vite
- React Router
- Tailwind CSS

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will run at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── gameday/
│   │   ├── AthletesTab.jsx    # Athletes opt-in management
│   │   ├── GroupsTab.jsx      # Group performance with round tabs
│   │   └── MatchesTab.jsx     # Match draw display
│   ├── Skeleton.jsx           # Skeleton loading components
│   └── Tabs.jsx               # Reusable tabs component
├── pages/
│   └── GameDay.jsx            # Main game day page
├── App.jsx                    # App routing
├── main.jsx                   # App entry point
└── index.css                  # Global styles with Tailwind
```

## Design Guidelines

- **Minimal Design**: White background, black text/borders
- **Buttons Only**: Colors reserved for button states only
- **Mobile-First**: Optimized for touch and small screens
- **Simple & Clean**: Focus on functionality and readability

## Features

- **Game Day Management**: Three-tab interface for managing game days
- **Athletes Tab**: Opt-in system for player selection
- **Groups Tab**: Performance tracking with round-by-round views
- **Matches Tab**: Draw visualization with group filtering
- **Skeleton Loading**: Proper loading states without mock data

