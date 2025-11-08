# Property & Tenancy Management UAE

A comprehensive property and tenancy management platform designed specifically for the UAE market, focusing on RERA compliance, multi-emirate support, and seamless tenant-owner interactions.

## 🏗️ Project Structure

```
property-tenancy-management-uae/
├── backend/          # Node.js + Express API
├── frontend/         # React + Next.js Web Application
├── docs/             # Documentation
└── package.json      # Root package.json (monorepo)
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0
- Redis (optional, for caching)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` in backend folder
   - Copy `.env.example` to `.env` in frontend folder
   - Update with your configuration

3. **Set up database:**
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API on `http://localhost:5000`
   - Frontend app on `http://localhost:3000`

## 📁 Modules

1. **Website + Web Portal** - Public-facing website + authenticated portals
2. **Tenant & Owner App** - Single mobile app (future)
3. **Property Manager Admin Portal** - Web-based admin dashboard
4. **Admin Mobile App** - Field operations support (optional)

## 🛠️ Technology Stack

### Backend
- Node.js + Express (TypeScript)
- PostgreSQL
- JWT Authentication
- Redis (caching)

### Frontend
- React + Next.js
- Tailwind CSS
- TypeScript

### Infrastructure
- Local file storage (development)
- Hostinger VPS (production deployment)

## 📝 Documentation

- [Project Analysis](./PROJECT_ANALYSIS.md) - Comprehensive technical analysis
- [Technical Decisions](./TECHNICAL_DECISIONS.md) - Technology choices
- [Requirements](./Property%20&%20Tenancy%20Management%20UAE.md) - Original requirements

## 🔐 Security

- JWT-based authentication
- OTP verification for mobile login
- Role-based access control (RBAC)
- Data encryption
- Secure file uploads

## 📱 Features

### For Tenants
- Property browsing and search
- Application submission
- Application status tracking
- Lease management
- Maintenance requests
- Live chat support

### For Owners
- Property portfolio management
- Tenant application review
- Lease agreement generation
- Financial overview
- Maintenance team management

### For Admins
- User management
- Property management
- Application pipeline
- Financial reports
- Compliance tracking

## 🚀 Deployment

### Development
- Local file storage for uploads
- PostgreSQL local instance
- Development environment variables

### Production (Hostinger VPS)
- Configured for VPS deployment
- File storage migration path
- Production environment setup

## 📄 License

Private - All Rights Reserved

## 👥 Support

For support and questions, please contact the development team.

