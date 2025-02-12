# Hafaloha Frontend

This is the **frontend** of the Hafaloha application. It provides two main functionalities:
1. **Reservations** interface (for booking tables/seats).
2. **Ordering** interface (for placing food orders).

The frontend is built with React.js with Typescript and is hosted on **Netlify**.

---

## **Key Features**

- **Reservation Management**: Users can book reservations, view availability, and manage their bookings.
- **Online Ordering**: Customers can browse the menu, add items to a cart, and place orders.
- **Notifications**: Integrated with ClickSend (SMS) and SendGrid (email) for customers, as well as Wassenger (WhatsApp group messages) for internal staff notifications (these are triggered by the backend).
- **Hosted on Netlify**: Automated deployments from the main branch.

---

## **Project Structure**
```
.
├── .env
├── README.md
├── directoryStructure.json
├── eslint.config.js
├── generateTree.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── _redirects
│   └── hafaloha-logo-white-bg.png
├── src
│   ├── GlobalLayout.tsx
│   ├── RootApp.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── ordering
│   │   ├── OnlineOrderingApp.tsx
│   │   ├── assets
│   │   │   ├── Hafaloha-circle-logo.png
│   │   │   ├── hafaloha-logo.png
│   │   │   └── hafaloha_hero.jpg
│   │   ├── components
│   │   │   ├── CartPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── CustomizationModal.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── MenuItem.tsx
│   │   │   ├── MenuPage.tsx
│   │   │   ├── OrderConfirmation.tsx
│   │   │   ├── admin
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AnalyticsManager.tsx
│   │   │   │   ├── InventoryManager.tsx
│   │   │   │   ├── MenuManager.tsx
│   │   │   │   ├── OrderManager.tsx
│   │   │   │   └── PromoManager.tsx
│   │   │   ├── auth
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignUpForm.tsx
│   │   │   ├── location
│   │   │   │   └── PickupInfo.tsx
│   │   │   ├── loyalty
│   │   │   │   └── LoyaltyTeaser.tsx
│   │   │   ├── profile
│   │   │   │   └── OrderHistory.tsx
│   │   │   ├── reservation
│   │   │   │   └── ReservationModal.tsx
│   │   │   └── upsell
│   │   │       └── UpsellModal.tsx
│   │   ├── context
│   │   │   └── AuthContext.tsx
│   │   ├── data
│   │   │   └── menu.ts
│   │   ├── lib
│   │   │   └── api.ts
│   │   ├── store
│   │   │   ├── authStore.ts
│   │   │   ├── inventoryStore.ts
│   │   │   ├── loadingStore.ts
│   │   │   ├── menuStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   ├── orderStore.ts
│   │   │   └── promoStore.ts
│   │   └── types
│   │       ├── auth.ts
│   │       ├── inventory.ts
│   │       ├── menu.ts
│   │       ├── order.ts
│   │       └── promo.ts
│   ├── reservations
│   │   ├── ReservationsApp.tsx
│   │   ├── assets
│   │   ├── components
│   │   │   ├── AdminSettings.tsx
│   │   │   ├── FloorManager.tsx
│   │   │   ├── FloorTabs.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── RenameSeatsModal.tsx
│   │   │   ├── ReservationForm.tsx
│   │   │   ├── ReservationFormModal.tsx
│   │   │   ├── ReservationModal.tsx
│   │   │   ├── SeatLayoutCanvas.tsx
│   │   │   ├── SeatLayoutEditor.tsx
│   │   │   ├── SeatPreferenceMapModal.tsx
│   │   │   ├── SeatPreferenceWizard.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── StaffDashboard.tsx
│   │   │   ├── WaitlistForm.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── LayoutTab.tsx
│   │   │   │   ├── ReservationsTab.tsx
│   │   │   │   ├── SeatingTab.tsx
│   │   │   │   ├── SettingsTab.tsx
│   │   │   │   └── WaitlistTab.tsx
│   │   │   └── modals
│   │   ├── context
│   │   │   ├── AuthContext.tsx
│   │   │   └── DateFilterContext.tsx
│   │   ├── services
│   │   │   └── api.ts
│   │   └── types
│   │       └── index.ts
│   ├── shared
│   │   └── ScrollToTop.tsx
│   └── vite-env.d.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## **Environment Variables**

The frontend typically needs minimal environment variables. Common ones might be:

- `VITE_API_BASE_URL` – Base URL for the backend API (Rails on Render).

For Netlify, you can add these in **Site Settings → Build & Deploy → Environment**.

---

## **Local Development**

1. **Install dependencies**:
   ```bash
   npm install
   ```
1. **Start the Server**:
   ```bash
   npm run dev
By default, it runs at http://localhost:5173 (Vite’s default) or similar.

API Integration:

The frontend makes requests to VITE_API_BASE_URL. Make sure it points to the local backend (e.g. http://localhost:3000) when developing and to the production backend for production.

Relevant Services
Netlify – hosting for the frontend.
AWS S3 – storing menu item images (the frontend displays images from S3 URLs).
(Optional) Environment variables to configure the backend API endpoint.
Further Information
For details about the backend (ordering logic, SMS/WhatsApp, etc.), see the Backend README or your project’s main doc.

---