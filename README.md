# **Hafaloha Frontend**

A React-based frontend for the Hafaloha multi-tenant restaurant management SaaS platform.

## **Overview**

Hafaloha frontend provides user interfaces for:

1. **Online Ordering** - Browse menus, customize items, and place orders
2. **Reservations** - Book tables, view availability, and manage reservations
3. **Admin Dashboard** - Manage menus, track orders, configure restaurant settings, and view analytics

The frontend is built with **React.js** with **TypeScript**, styled with **Tailwind CSS**, and uses **Zustand** for state management. It communicates with the Hafaloha API backend through a RESTful interface.

---

## **Multi-tenant Architecture**

Hafaloha is designed as a SaaS (Software as a Service) platform that supports multiple restaurants, each with their own branding, configuration, and data. The frontend supports this multi-tenant approach through several key features:

### 1. Restaurant Context

The frontend maintains restaurant context through:

- **JWT Tokens** - Contains restaurant_id claim for authenticated users
- **Default Restaurant ID** - For public pages (configured in environment)
- **Restaurant Selector** - For super admin users managing multiple restaurants

```typescript
// src/shared/config.ts
export const config = {
  // API base URL
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // Default restaurant ID (for public endpoints)
  restaurantId: import.meta.env.VITE_RESTAURANT_ID || '1',
};
```

### 2. API Client with Restaurant Context

The API client automatically adds restaurant context to requests:

```typescript
// Add restaurant_id to the data payload if needed
if (needsRestaurantContext(endpoint) && !data.restaurant_id) {
  const token = localStorage.getItem('token') || '';
  const restaurantId = getRestaurantId(token) || DEFAULT_RESTAURANT_ID;
  
  if (restaurantId) {
    data = { ...data, restaurant_id: restaurantId };
  }
}
```

### 3. JWT Token Handling

The frontend extracts and uses restaurant context from JWT tokens:

```typescript
// Get restaurant ID from JWT token
export function getRestaurantId(token: string): string | null {
  if (!token) return null;
  
  try {
    const payload = decodeJwt(token);
    return payload.restaurant_id;
  } catch (e) {
    console.error('Error getting restaurant ID from token:', e);
    return null;
  }
}
```

### 4. Restaurant-Specific UI

For admin users who manage multiple restaurants, a RestaurantSelector component allows switching contexts:

```tsx
<RestaurantSelector
  restaurants={restaurants}
  currentRestaurantId={selectedRestaurantId}
  onChange={setSelectedRestaurantId}
/>
```

### 5. Restaurant Data Management

The application uses a centralized restaurant store to manage restaurant data and ensure real-time updates across all components:

```typescript
// src/shared/store/restaurantStore.ts
export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  restaurant: null,
  loading: false,
  error: null,
  fetchRestaurant: async () => {
    // Fetch restaurant data from API
  },
  updateRestaurant: async (data: Partial<Restaurant>) => {
    // Update restaurant data in both API and local state
  }
}));
```

The RestaurantProvider component ensures that restaurant data is always up-to-date:

```tsx
// src/shared/components/restaurant/RestaurantProvider.tsx
export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const { fetchRestaurant } = useRestaurantStore();
  
  useEffect(() => {
    // Fetch restaurant data on mount
    fetchRestaurant();
    
    // Set up polling to keep data fresh
    const intervalId = setInterval(() => {
      fetchRestaurant();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchRestaurant]);
  
  return <>{children}</>;
}
```

### 6. CORS Configuration Management

Admins can configure allowed origins for each restaurant through the AllowedOriginsSettings component (currently hidden in the UI but functionality is preserved):

```tsx
<AllowedOriginsSettings onSaved={handleSaved} />
```

---

## **Project Structure**

```
.
├── src/
│   ├── GlobalLayout.tsx        # Global layout wrapper
│   ├── RootApp.tsx             # Root application component
│   ├── main.tsx                # Application entry point
│   ├── ordering/               # Online ordering application
│   │   ├── OnlineOrderingApp.tsx
│   │   ├── components/
│   │   │   ├── admin/          # Admin dashboard components
│   │   │   ├── auth/           # Authentication components
│   │   │   └── ...
│   │   ├── context/
│   │   ├── lib/
│   │   │   └── api.ts          # API client for ordering
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript type definitions
│   ├── reservations/           # Reservations application
│   │   ├── ReservationsApp.tsx
│   │   ├── components/
│   │   │   ├── dashboard/      # Reservation management dashboard
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.ts          # API client for reservations
│   │   └── types/
│   └── shared/                 # Shared modules across applications
│       ├── config.ts           # Configuration including restaurant ID
│       └── utils/
│           └── jwt.ts          # JWT handling utilities
└── ...
```

---

## **Key Components**

### 1. Authentication

- **LoginForm/SignUpForm** - User authentication
- **AuthContext/AuthStore** - Manage authentication state
- **JWT Utilities** - Handle token expiration and restaurant context

### 2. Online Ordering

- **MenuPage** - Display menu items by category
- **MenuItem** - Individual menu item with customization options
- **CartPage** - Shopping cart management
- **CheckoutPage** - Complete order placement

### 3. Reservations

- **ReservationForm** - Book new reservations
- **SeatLayoutCanvas** - Visual table layout
- **SeatPreferenceWizard** - Select preferred seating

### 4. Admin Dashboard

- **AdminDashboard** - Main admin interface
- **MenuManager** - Manage menu items and categories
- **OrderManager** - View and process orders
- **AnalyticsManager** - View business metrics
- **RestaurantSettings** - Configure restaurant information with real-time updates
- **GeneralSettings** - Manage site-wide settings like hero and spinner images
- **RestaurantSelector** - Switch between restaurants (for super admins)
- **AllowedOriginsSettings** - Configure CORS for restaurant frontends (currently hidden)

---

## **Environment Variables**

The frontend requires these environment variables:

- `VITE_API_URL` - Base URL of the Hafaloha API (e.g., 'http://localhost:3000')
- `VITE_RESTAURANT_ID` - Default restaurant ID for public pages

For local development, create a `.env.local` file in the project root:

```
VITE_API_URL=http://localhost:3000
VITE_RESTAURANT_ID=1
```

For production, set these variables in your hosting environment (e.g., Netlify environment variables).

---

## **Local Development**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YourUsername/hafaloha-frontend.git
   cd hafaloha-frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   This will start the development server at `http://localhost:5173`.

4. **Build for Production**
   ```bash
   npm run build
   ```
   The built files will be in the `dist` directory.

---

## **Deployment**

### Netlify Deployment

1. **Connect your GitHub repository to Netlify**

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Set Environment Variables**
   - `VITE_API_URL` - Your production API URL
   - `VITE_RESTAURANT_ID` - Default restaurant ID

4. **Configure Redirects**
   Create a `_redirects` file in the `public` directory:
   ```
   /* /index.html 200
   ```
   This enables client-side routing for SPAs.

### Restaurant-Specific Deployments

For a true multi-tenant setup, you can deploy restaurant-specific frontends:

1. **Create a separate Netlify site for each restaurant**
2. **Set VITE_RESTAURANT_ID to the specific restaurant's ID**
3. **Use custom domains for each restaurant** (e.g., restaurant-name.hafaloha.com)
4. **Configure allowed origins in the restaurant settings in the admin dashboard**

---

## **Integration with Backend**

The frontend integrates with the Hafaloha API backend through RESTful API calls. Key integration points include:

1. **Authentication** - JWT tokens with restaurant context
2. **Restaurant Context** - Automatic filtering of data by restaurant
3. **Image Storage** - S3 URLs for menu item images and site assets
4. **Notifications** - Display status from backend notification systems

The backend README contains more details about the API endpoints and multi-tenant architecture.

---

## **Browser Compatibility**

Hafaloha frontend is compatible with:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest version)

---

## **Contact & Support**

For questions about the frontend architecture, React components, or state management, please contact the development team.

---

**Hafaloha - Your Restaurant Management SaaS Platform**
