# 2 Hands Massage & Wellness — Web-Based Management System

A full-stack web application prepared for the **2 Hands Massage & Wellness – San Jose del Monte, Bulacan Branch**. It follows the business modules described in the uploaded Chapter 1 and Chapter 2 thesis document.

## Technology

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Authentication:** JSON Web Token stored in an HttpOnly cookie
- **Security:** bcrypt password hashing, CSRF double-submit token, Helmet security headers, login rate limiting, role-based access control, parameterized database queries, and audit logs

## 1. Requirements

Install these before opening the project:

1. **Node.js 20 LTS or newer** (Node.js 22 LTS is also supported).
2. **Visual Studio Code**.
3. Internet connection for the first `npm install` so npm can download the project packages.

Check your Node.js and npm versions in the VS Code terminal:

```bash
node -v
npm -v
```

## 2. Open the project in VS Code

1. Extract `2hands-spa-management.zip` to a folder on your computer.
2. Open Visual Studio Code.
3. Select **File → Open Folder**.
4. Choose the extracted `2hands-spa-management` folder (the folder containing `package.json`).
5. Open **Terminal → New Terminal**.

## 3. Install the dependencies

In the VS Code terminal, run:

```bash
npm install
```

Wait for the installation to finish. This may take a few minutes the first time.

## 4. Create your environment file

Copy `.env.example` and name the copy `.env`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**Windows Command Prompt:**

```cmd
copy .env.example .env
```

Open `.env`. For local testing, the default settings will work. Before deploying the system, replace `JWT_SECRET` with a long, random secret and set `NODE_ENV=production`.

Example:

```env
PORT=4000
TZ=Asia/Manila
NODE_ENV=development
JWT_SECRET=replace-this-with-a-long-random-secret-before-deployment
DB_PATH=./server/data/2hands.sqlite
```

## 5. Run the system

In the VS Code terminal, run:

```bash
npm run dev
```

This starts both the Express backend and the React development server.

- **Web application:** http://localhost:5173
- **Backend health check:** http://localhost:4000/api/health
- **Customer appointment request page:** http://localhost:5173/book

Keep the terminal open while using the system. To stop the application, press **Ctrl + C** in the terminal.

## 6. Demo login accounts

The database automatically creates sample accounts on the first run.

| Role | Email | Password |
|---|---|---|
| Business Owner | `owner@2hands.demo` | `Owner@123` |
| Administrator | `admin@2hands.demo` | `Admin@123` |
| Receptionist | `reception@2hands.demo` | `Reception@123` |
| Massage Therapist | `therapist@2hands.demo` | `Therapist@123` |

The login screen is prefilled with the Business Owner demo account. You can also use the other accounts to test role-based access.

**Important:** These are demonstration credentials, not production credentials. After logging in, use the lock icon beside your account in the lower-left sidebar to change the password. Create real staff accounts from **User Accounts** before using actual customer information.

## 7. Main system functions

| Module | What it does |
|---|---|
| Dashboard | Shows today's appointments, pending requests, recorded sales, low-stock alerts, and upcoming schedules. |
| Appointments | Accepts online requests, records walk-ins, assigns therapists, checks schedule conflicts, and updates appointment status. |
| Customers | Adds, searches, updates, and retrieves customer records. |
| Therapists | Maintains therapist profiles and displays active appointment workload. |
| Services & Prices | Maintains the service list, prices, descriptions, and appointment durations. |
| Inventory | Adds products and supplies, records stock-in and stock-out, and flags low-stock items. |
| Transactions | Records payments received at the branch and displays transaction history. |
| Sales Reports | Generates daily, weekly, and monthly summaries and exports transaction details to CSV. |
| User Accounts | Creates staff accounts, assigns roles, links therapist accounts, and activates/deactivates eligible accounts. |
| Online Booking | Lets customers submit an appointment request without accessing internal business records. |

## 8. First-time setup checklist

Before entering real branch operations:

1. Sign in as the Business Owner.
2. Open **Services & Prices** and replace the sample zero prices and 60-minute durations with the branch's actual service prices and durations. The thesis lists Basic Facial, Signature Massage, Foot Spa, Pedicure, and Manicure; it does not provide their prices or durations.
3. Open **Therapists** and replace the placeholder names `Therapist 1` through `Therapist 7` with the actual therapist names and contact details.
4. Open **Inventory** and add the branch's actual products and supplies with their current quantities and minimum stock levels.
5. Open **User Accounts** and create individual accounts for authorized staff. Link each therapist login to the correct therapist profile.
6. Change all demo passwords. Do not use demo accounts for real customer information.
7. Test a customer booking at `/book`, confirm it from **Appointments**, and record a test payment before entering actual transactions.

## 9. Role permissions

- **Business Owner / Administrator:** Access to the dashboard, appointments, customer and therapist records, services, inventory, transactions, sales reports, and user accounts.
- **Receptionist:** Access to customer records, appointments, therapist information, inventory viewing, and payment/transaction recording. Cannot change system settings, prices, user accounts, or inventory quantities.
- **Massage Therapist:** Can view the dashboard and appointments assigned to their linked therapist profile. Cannot view customer directories, payments, inventory controls, or administrative settings.
- **Customers:** Can submit appointment requests through the public booking page. Requests remain pending until authorized staff review and confirm them.

## 10. Database location and reset

The SQLite database is created automatically at:

```text
server/data/2hands.sqlite
```

The database stores users, customers, therapists, services, appointments, payments, inventory items, stock movements, and audit logs.

To reset the project to its original demo data:

1. Stop the application with **Ctrl + C**.
2. Delete `server/data/2hands.sqlite` (and any `2hands.sqlite-shm` or `2hands.sqlite-wal` files if present).
3. Run `npm run dev` again.

**Warning:** Resetting the database permanently deletes all data entered into the local system.

## 11. Build and run the production bundle locally

After installing dependencies, run:

```bash
npm run build
npm start
```

Then open http://localhost:4000. Express serves the compiled React app from the `dist` folder and the API from `/api`.

For a real deployment, use HTTPS, a strong private `JWT_SECRET`, secure server/database backups, restricted server access, and a production hosting environment. The included demo is a local development project and has not been independently penetration-tested or configured for a specific hosting provider.

## 12. Notes and scope

- Appointment requests are reviewed and confirmed by authorized staff; they are not automatically approved.
- The application prevents overlapping appointments for the same customer or assigned therapist and observes the branch operating hours: Monday–Friday, 9:00 AM–10:00 PM; Saturday–Sunday, 10:00 AM–10:00 PM.
- Payments are **recorded** by authorized staff after payment is received. There is no online payment gateway or automatic money transfer.
- The system is browser-based and responsive on mobile screens; it is not a native Android or iOS application.
- Inventory is included with product/supply records, stock-in, stock-out, available quantity, low-stock alerts, and movement history. Automated purchasing and supplier integrations are not included.
- Prices, durations, inventory items, and therapist names are not specified in the thesis source, so the project uses editable placeholders rather than presenting invented branch details as actual data.
