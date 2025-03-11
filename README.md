# Hafaloha Frontend

Frontend web application for the Hafaloha restaurant management system.

## Features

- Online ordering system with customizable menu items
- Reservation system with table layout visualization
- Admin dashboard for order management and analytics
- Customer profiles with order history
- VIP code system for exclusive access
- Merchandise store with variant support
- Real-time notifications
- Multi-language support (English, Japanese, Korean)
- Responsive design for mobile and desktop
- Inventory tracking system for menu items

## Inventory Tracking System

The application includes a comprehensive inventory tracking system for menu items, allowing restaurant staff to:

- Enable/disable inventory tracking per menu item
- Set and monitor stock quantities
- Record damaged items with reasons
- Update stock levels with audit trails
- Configure low stock thresholds
- See automatic status updates based on inventory levels

For detailed documentation, see [Inventory Tracking System Documentation](docs/inventory_tracking_system.md).

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- React Query
- Zustand (state management)
- i18next (internationalization)
- Chart.js (analytics)
- date-fns (date manipulation)

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/hafaloha-frontend.git
cd hafaloha-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Set up environment variables:
- Create a `.env.local` file in the project root with:
```
VITE_API_URL=http://localhost:3000
VITE_DEFAULT_LANGUAGE=en
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

By default, the application will run at `http://localhost:5173`.

## Project Structure

```
src/
├── shared/            # Shared components, hooks, and utilities
│   ├── api/           # API client and endpoints
│   ├── auth/          # Authentication related components
│   ├── components/    # Shared UI components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Global state management
│   └── utils/         # Utility functions
│
├── ordering/          # Online ordering system
│   ├── components/    # Ordering-specific components
│   ├── store/         # Ordering-specific state
│   ├── types/         # TypeScript types for ordering
│   └── utils/         # Ordering-specific utilities
│
├── reservations/      # Reservation system
│   ├── components/    # Reservation-specific components
│   ├── store/         # Reservation-specific state
│   └── types/         # TypeScript types for reservations
│
├── RootApp.tsx        # Main application component
└── main.tsx          # Entry point
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests (when implemented)

## Environment Variables

- `VITE_API_URL` - URL for the backend API
- `VITE_DEFAULT_LANGUAGE` - Default language for the application
- `VITE_ENABLE_MOCK_API` - Enable mock API for development (optional)
- `VITE_ENABLE_ANALYTICS` - Enable analytics tracking (optional)

## Deployment

The application is configured for deployment to Netlify. The `_redirects` file in the `public` directory ensures proper routing for single-page applications.

### Build for Production

```bash
npm run build
# or
yarn build
```

This will generate optimized static assets in the `dist` directory, which can be deployed to any static hosting service.

## Internationalization

The application supports multiple languages using i18next. Translation files are located in:

```
public/locales/{language-code}/{namespace}.json
```

Currently supported languages:
- English (en)
- Japanese (ja)
- Korean (ko)

To add a new language, create a new directory with the language code and copy the translation files from an existing language.

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests and ensure code quality (`npm run lint && npm run test`)
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Create a new Pull Request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
