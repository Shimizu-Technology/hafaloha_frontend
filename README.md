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
│   │   │   └── ...
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript type definitions
│   ├── reservations/           # Reservations application
│   │   ├── ReservationsApp.tsx
│   │   ├── components/
│   │   │   ├── dashboard/      # Reservation management dashboard
│   │   │   └── ...
│   │   └── types/
│   └── shared/                 # Shared modules across applications
│       ├── api/                # Shared API client and endpoints
│       ├── auth/               # Authentication components and store
│       ├── components/         # Shared UI components
│       │   ├── auth/           # Authentication forms
│       │   ├── navigation/     # Header and Footer
│       │   ├── profile/        # User profile components
│       │   ├── restaurant/     # Restaurant context provider
│       │   └── ui/             # Reusable UI components
│       ├── i18n/               # Internationalization
│       ├── store/              # Shared state stores
│       ├── types/              # Shared type definitions
│       └── utils/              # Utility functions
└── public/
    └── locales/                # Translation files
        ├── en/                 # English
        ├── ja/                 # Japanese
        └── ko/                 # Korean
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

- **AdminDashboard** - Main admin interface with persistent order notifications
- **MenuManager** - Manage menu items and categories
- **OrderManager** - View and process orders with real-time auto-refresh functionality
- **AnalyticsManager** - View business metrics
- **RestaurantSettings** - Configure restaurant information with real-time updates
  - **Notification Channels** - Configure email and SMS preferences for customer communications
- **GeneralSettings** - Manage site-wide settings like hero and spinner images
- **RestaurantSelector** - Switch between restaurants (for super admins)
- **AllowedOriginsSettings** - Configure CORS for restaurant frontends (currently hidden)

### 5. Shared Components

- **Header/Footer** - Navigation components used across all applications
- **ProfilePage** - User profile management
- **RestaurantProvider** - Provides restaurant context to components

---

## **Code Organization**

The codebase has been reorganized to improve maintainability and reduce duplication:

1. **Shared Components** - Common components like Header, Footer, and authentication forms have been moved to the shared directory
2. **Shared API Client** - A unified API client is used across all applications
3. **Shared Auth Store** - Authentication state is managed in a single location
4. **Shared Types** - Common TypeScript interfaces are defined once and reused

This organization allows for:
- Consistent UI/UX across applications
- Reduced code duplication
- Easier maintenance
- Better type safety

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

## **Real-time Updates and Polling**

Hafaloha implements intelligent polling mechanisms to provide real-time updates without requiring manual page refreshes:

### 1. Intelligent Toast Notification System

The application implements a sophisticated toast notification system with different behaviors for different types of notifications:

```typescript
// In RootApp.tsx - Global toast configuration
<Toaster 
  position="top-right" 
  reverseOrder={false}
  containerStyle={{
    maxHeight: '100vh',
    overflow: 'auto',
    paddingRight: '10px',
    scrollBehavior: 'smooth'
  }}
  containerClassName="scrollable-toast-container"
  gutter={8}
  toastOptions={{
    // Default duration of 5 seconds for regular toasts
    duration: 5000,
    // Customize for different screen sizes
    className: '',
    style: {
      maxWidth: '100%',
      width: 'auto'
    }
  }}
/>
```

Key features of this implementation:
- **Differentiated Notification Types**: Regular success/error messages auto-dismiss after 5 seconds, while important order notifications persist until acknowledged
- **Robust Dismissal Mechanism**: Uses multiple toast removal methods with delayed attempts to ensure notifications are properly removed
- **Scrollable Interface**: When multiple notifications appear, users can scroll through them all

The implementation includes responsive design considerations for different device sizes:

```css
/* Mobile optimization */
@media (max-width: 480px) {
  /* Mobile phones */
  .scrollable-toast-container > div > div {
    width: 95% !important;
    max-width: 95vw !important;
    margin-left: auto;
    margin-right: auto;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  /* Tablets and iPad mini */
  .scrollable-toast-container > div > div {
    width: 90% !important;
    max-width: 400px !important;
    margin-left: auto;
    margin-right: auto;
  }
}
```

Key features of this implementation:
- **Full-height Scrolling**: Uses the entire viewport height for notifications
- **Responsive Design**: Optimized for mobile, tablet, and desktop views
- **Touch-friendly**: Enhanced scrolling behavior for touch devices
- **Consistent UI**: Maintains the same look and feel across all device sizes
- **Improved Accessibility**: Ensures all notifications are accessible via scrolling

### 2. Order Notifications and Acknowledgment

The AdminDashboard implements a server-side order acknowledgment system that ensures important notifications persist across page refreshes:

```typescript
// Function to acknowledge an order via the API
const acknowledgeOrder = async (orderId: number) => {
  try {
    await api.post(`/orders/${orderId}/acknowledge`);
    console.log(`[AdminDashboard] Order ${orderId} acknowledged`);
  } catch (err) {
    console.error(`[AdminDashboard] Failed to acknowledge order ${orderId}:`, err);
  }
};

// Check for unacknowledged orders on component mount
const checkForUnacknowledgedOrders = async () => {
  try {
    // Get unacknowledged orders from the last 24 hours
    const url = `/orders/unacknowledged?hours=24`;
    const unacknowledgedOrders: Order[] = await api.get(url);
    
    // Display notifications for unacknowledged orders
    unacknowledgedOrders.forEach(order => {
      displayOrderNotification(order);
    });
  } catch (err) {
    console.error('[AdminDashboard] Failed to check for unacknowledged orders:', err);
  }
};
```

Key features of this implementation:
- **Server-side Persistence**: Order acknowledgments are stored in the database, ensuring they persist across sessions
- **User-specific Acknowledgments**: Each admin user has their own acknowledgment status for orders
- **Automatic Recovery**: Unacknowledged notifications reappear after page refresh
- **Time-based Filtering**: Only shows unacknowledged orders from the last 24 hours by default
- **Scrollable Interface**: When multiple notifications appear, users can scroll through them all

### 2. Order Management Auto-refresh

The OrderManager component automatically refreshes order data every 30 seconds using an optimized approach:

```typescript
// Constants for configuration
const POLLING_INTERVAL = 30000; // 30 seconds

// Set up polling with visibility detection
useEffect(() => {
  // Initial fetch with loading state
  fetchOrders();
  
  let pollingInterval: number | null = null;
  
  // Function to start polling
  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = window.setInterval(() => {
      // Use the quiet fetch that doesn't trigger loading indicators
      useOrderStore.getState().fetchOrdersQuietly();
    }, POLLING_INTERVAL);
  };
  
  // Start polling immediately
  startPolling();
  
  // Pause polling when tab is not visible
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Clean up on unmount
  return () => {
    if (pollingInterval) clearInterval(pollingInterval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [fetchOrders]);
```

Key features of this implementation:
- **Quiet Fetching**: Uses `fetchOrdersQuietly()` which updates data without triggering loading states, preventing UI "shake"
- **Visibility Detection**: Pauses polling when the browser tab is not visible to save resources
- **Automatic Resumption**: Immediately fetches fresh data when the tab becomes visible again
- **Clean Cleanup**: Properly removes intervals and event listeners on component unmount

### 2. Restaurant Data Polling

As shown earlier, the RestaurantProvider also implements polling to keep restaurant data fresh:

```typescript
// Set up polling to keep data fresh
const intervalId = setInterval(() => {
  fetchRestaurant();
}, 30000);

return () => clearInterval(intervalId);
```

These polling mechanisms ensure that admins always see the most up-to-date information without manual intervention.

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
