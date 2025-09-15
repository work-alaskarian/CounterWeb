# GEMINI.md

## Project Overview

This project is a SvelteKit web application that serves as a surveillance camera system dashboard. Its primary purpose is to monitor real-time occupancy levels across a hierarchical organization structure, which includes divisions, locations, floors, and individual cameras. The application is designed as a single-page, dark-themed dashboard, optimized for TV display, and presented in Arabic.

The frontend is built with SvelteKit and Vite, and the code is written in TypeScript. The application uses Svelte stores for state management and simulates real-time data updates to provide a dynamic and live feel to the dashboard.

## Building and Running

The project uses `npm` for package management. The following scripts are available:

*   **`npm run dev`**: Starts the development server with hot-reloading.
*   **`npm run build`**: Compiles the application for production.
*   **`npm run preview`**: Serves the production build for preview.
*   **`npm run check`**: Runs the Svelte and TypeScript type checkers.

To get started, first install the dependencies:

```sh
npm install
```

Then, run the development server:

```sh
npm run dev
```

## Development Conventions

*   **Language**: The project is written in TypeScript and Svelte.
*   **Styling**: The styling is done using CSS within the Svelte components. The application uses a dark theme.
*   **Component Structure**: The application is structured into Svelte components, with a main `ArabicTVDashboard.svelte` component that serves as the primary UI.
*   **State Management**: Svelte stores are used for managing the application's state, including the organization data and UI state.
*   **Data**: The application uses sample data generated in `src/lib/sampleData.ts` to simulate the hierarchical organization structure and real-time occupancy data.
*   **Internationalization**: The UI is in Arabic, with translations managed in `src/lib/translations.ts`.
