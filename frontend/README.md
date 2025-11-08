# Property Management Frontend

Modern, responsive frontend for Property & Tenancy Management UAE platform.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

Create `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Run Development Server

```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## 🎨 Features

- ✅ Modern, attractive UI with Tailwind CSS
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Landing page with property listings
- ✅ Authentication (Login, Register)
- ✅ Tenant Dashboard
- ✅ Property Dealer Dashboard with filters
- ✅ Admin Portal for approving dealers
- ✅ Property search and filtering
- ✅ Beautiful property cards

## 📱 Pages

- `/` - Landing page
- `/properties` - Property listings
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/tenant/dashboard` - Tenant dashboard
- `/owner/dashboard` - Property dealer dashboard
- `/admin/dashboard` - Admin dashboard
- `/admin/owners/pending` - Approve property dealers

## 🎯 Design System

- **Colors:** Primary Blue (#0066CC), Accent Gold (#FFB800)
- **Typography:** Inter (body), Poppins (headings)
- **Components:** Tailwind CSS with custom utilities
- **Icons:** Lucide React

## 📦 Technology Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Axios (API Client)
- React Hook Form (Forms)
- React Query (Data Fetching)

