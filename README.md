# Smart Delivery Management System

Full-stack college project using HTML, CSS, JavaScript, Node.js, Express.js and MySQL.

## Features

- Customer registration and login
- JWT authentication and role-based access
- Product catalogue and search
- Shopping cart
- Checkout with COD, UPI, Card and Net Banking demo options
- Order history and tracking
- Delivery partner dashboard
- Admin dashboard
- Product CRUD
- User role management
- Delivery assignment
- Reviews
- MySQL relational database

## Setup

1. Install Node.js and MySQL.
2. Create the database by running `database/schema.sql` in MySQL Workbench. If you already created the database manually, back it up first because the script recreates the tables.
3. Copy `backend/.env.example` to `backend/.env`.
4. Put your MySQL root password in `backend/.env`.
5. From the backend folder run:

```powershell
npm install
node server.js
```

6. Open:

`http://localhost:5000`

## Admin account

Register a normal account first. Then in MySQL run:

```sql
USE smart_delivery;
UPDATE users SET role='admin' WHERE email='your-email@example.com';
```

Log in again so the new JWT contains the admin role.

## Delivery account

Register another account and promote it:

```sql
UPDATE users SET role='delivery' WHERE email='delivery@example.com';
```

## Security

- Never commit `backend/.env`.
- Never use real payment credentials in this college project.
- The payment module is a demo; it does not charge real cards/UPI.
