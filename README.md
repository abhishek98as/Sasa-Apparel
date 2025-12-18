# Sasa Apparel - Manufacturing Portal

A comprehensive cloth manufacturing management system built with Next.js and MongoDB. This multi-tenant portal supports Admin, Vendor, and Tailor roles with real-time production tracking, shipment management, and profit analytics.

## Features

### Admin Portal
- **Dashboard**: Real-time KPIs including cutting received, in-production, completed, shipped pieces
- **Vendor Management**: CRUD operations for vendors with contact details and GST info
- **Style Management**: Create and manage product styles with fabric types
- **Tailor Management**: Manage tailoring workforce
- **Fabric & Cutting**: Track fabric receipts and cutting records (in-house and pre-cut)
- **Distribution Engine**: Auto-suggest tailor assignments based on capacity
- **Production Tracking**: Monitor job status, QC, and returned pieces
- **Shipments**: Create shipments with challan numbers
- **Rates & Profit**: Set vendor rates and view style-wise profit analytics
- **Reports**: Generate and export production, tailor, shipment, and fabric reports
- **User Management**: Create role-based user accounts

### Vendor Portal (Read-only)
- View assigned styles
- Track production progress
- View shipment history
- Style-wise status breakdown

### Tailor Portal
- View assigned jobs
- Submit completed work (returned pieces)
- Track earnings
- View work history

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: NextAuth.js with credentials provider
- **Charts**: Recharts
- **Export**: XLSX for Excel exports
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cloth-manufacturing-portal
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/cloth_manufacturing
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-in-production
```

5. Seed the database with sample data:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sasa.com | admin123 |
| Vendor | vendor@test.com | vendor123 |
| Tailor | tailor@test.com | tailor123 |

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin portal pages
│   │   ├── dashboard/
│   │   ├── vendors/
│   │   ├── styles/
│   │   ├── tailors/
│   │   ├── fabric-cutting/
│   │   ├── distribution/
│   │   ├── production/
│   │   ├── shipments/
│   │   ├── rates/
│   │   ├── reports/
│   │   └── users/
│   ├── vendor/          # Vendor portal pages
│   │   ├── dashboard/
│   │   ├── styles/
│   │   ├── shipments/
│   │   └── progress/
│   ├── tailor/          # Tailor portal pages
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   └── history/
│   ├── api/             # API routes
│   │   ├── auth/
│   │   ├── vendors/
│   │   ├── styles/
│   │   ├── tailors/
│   │   ├── users/
│   │   ├── fabric-cutting/
│   │   ├── tailor-jobs/
│   │   ├── shipments/
│   │   ├── rates/
│   │   ├── profit/
│   │   ├── reports/
│   │   ├── admin/
│   │   ├── vendor/
│   │   └── tailor/
│   └── login/
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── providers.tsx    # SessionProvider, ToastProvider
│   └── ui/              # Reusable UI components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── mongodb.ts       # MongoDB connection
│   ├── types.ts         # TypeScript types
│   ├── utils.ts         # Utility functions
│   └── validations.ts   # Zod schemas
└── middleware.ts        # RBAC middleware
```

## Database Collections

- **users**: User accounts with roles
- **vendors**: Vendor companies
- **styles**: Product styles/designs
- **tailors**: Tailor workforce
- **fabricCutting**: Fabric receipt and cutting records
- **tailorJobs**: Work assignments to tailors
- **shipments**: Shipments to vendors
- **rates**: Vendor rates per style
- **events**: Audit log (for future use)

## Business Flow

```
Vendor sends Fabric/Cutting
        ↓
Admin records in Fabric & Cutting
        ↓
Admin distributes to Tailors (Distribution Engine)
        ↓
Tailors complete work & submit returns
        ↓
Admin performs QC
        ↓
Admin creates Shipment to Vendor
        ↓
Profit calculated (Vendor Rate - Tailoring Cost)
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Admin APIs
- `GET/POST /api/vendors` - Vendor CRUD
- `GET/POST /api/styles` - Style CRUD
- `GET/POST /api/tailors` - Tailor CRUD
- `GET/POST /api/users` - User CRUD
- `GET/POST /api/fabric-cutting` - Cutting records
- `GET/POST /api/tailor-jobs` - Job assignments
- `GET/POST /api/shipments` - Shipments
- `GET/POST /api/rates` - Vendor rates
- `GET /api/profit` - Profit analytics
- `GET /api/reports` - Generate reports
- `GET /api/admin/dashboard` - Admin dashboard metrics

### Vendor APIs
- `GET /api/vendor/dashboard` - Vendor dashboard

### Tailor APIs
- `GET /api/tailor/dashboard` - Tailor dashboard

## Production Deployment

### Environment Variables

For production, ensure you set:

```env
MONGODB_URI=<your-production-mongodb-uri>
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-secret>
NODE_ENV=production
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Build

```bash
npm run build
npm start
```

### Recommended Hosting

- **Application**: Vercel, Railway, or DigitalOcean App Platform
- **Database**: MongoDB Atlas

## Backup Strategy

For MongoDB backup:

```bash
# Daily backup script
mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)
```

Consider using MongoDB Atlas automated backups for production.

## Security Considerations

1. Change default passwords immediately
2. Use HTTPS in production
3. Set secure session cookies
4. Implement rate limiting (recommended)
5. Regular security audits

## License

Private - All rights reserved.

## Support

For support, contact the development team.

