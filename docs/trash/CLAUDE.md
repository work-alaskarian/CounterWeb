# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CounterWeb is a hierarchical people counting system built with SvelteKit 5 and TypeScript. It provides real-time monitoring and analytics across multiple organizational levels.

## Hierarchical Architecture

The system follows a strict hierarchical structure:
- **Organization** (top level) - company-wide analytics
- **Division/Department** (optional) - business unit groupings  
- **Location/Building** - physical sites with addresses
- **Floor/Zone** - areas within locations
- **Camera/Counter** - individual counting devices

Each level aggregates data from its children and provides analytics appropriate to that scope.

## Key Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:5173
npm run build           # Build for production
npm run preview         # Preview production build
npm run check           # Run svelte-check for TypeScript validation
```

## Core Architecture

### Data Models (`src/lib/types.ts`)
- Comprehensive TypeScript interfaces for the entire hierarchy
- Historical data structures (hourly, daily, weekly, monthly)
- Alert and threshold management
- Real-time count tracking

### State Management (`src/lib/stores/organization.ts`)
- Centralized Svelte stores for organization data
- Derived stores for current view context
- Navigation state management
- Real-time update mechanisms

### Component Structure
- `AppRouter.svelte` - Main routing logic based on current view
- `OrganizationDashboard.svelte` - Top-level overview
- `DivisionView.svelte` - Division-specific analytics
- `LocationView.svelte` - Building-level monitoring  
- `Chart.svelte` - Reusable chart component for trends
- Navigation through `navigateToEntity(type, id)` function

### Sample Data (`src/lib/sampleData.ts`)
- Comprehensive mock data generator
- Realistic hierarchical relationships
- Random but plausible occupancy patterns
- Alert and threshold examples

## Development Patterns

### Adding New Views
1. Create component in `src/lib/components/`
2. Add import to `AppRouter.svelte`
3. Update router logic to handle new view type
4. Add navigation from parent components

### Styling Conventions
- Tailwind-inspired utility classes
- Consistent color scheme: primary blue (#3b82f6), success green (#10b981), warning orange (#f59e0b), danger red (#ef4444)
- Mobile-first responsive design
- Card-based layouts with subtle shadows

### State Updates
- Use store.update() for data modifications
- Real-time updates via WebSocket (planned)
- Derived stores for computed values
- Immutable update patterns

## Navigation Flow
Organization → Division → Location → Floor → Camera

Each level provides:
- Real-time occupancy counts
- Historical trend charts
- Capacity utilization metrics
- Alert management
- Drill-down navigation

## Features Implementation Status

✅ Hierarchical data structure and stores
✅ Organization-level dashboard  
✅ Division/department components
✅ Location/building views
🔄 Floor/zone analytics (in progress)
⏳ Camera/counter components
⏳ Real-time count display
⏳ Historical data views
⏳ Alerts and thresholds system
⏳ Reports and export functionality

## Performance Considerations
- Efficient store derivations to minimize re-renders
- Chart data slicing for large datasets
- Lazy loading for deep navigation
- Optimized component reactivity patterns