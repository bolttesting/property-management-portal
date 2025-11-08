# 🚀 START HERE - Quick Setup Guide

## What I Need From You

To help you get the backend running, I need to know:

### Option 1: Do you have PostgreSQL installed?
- ✅ Yes → Tell me and I'll help you set it up
- ❌ No → I can guide you to install it

### Option 2: What error are you seeing?
- Copy and paste the error message
- Tell me what command you ran

### Option 3: What step are you on?
- [ ] PostgreSQL installed
- [ ] Database created
- [ ] .env password set
- [ ] Migrations run
- [ ] Server started

## Quick Commands to Try

### 1. Check if PostgreSQL is installed:
```powershell
psql --version
```

### 2. Check if database exists:
```powershell
psql -U postgres -l
```

### 3. Try to start the server and see what happens:
```powershell
cd backend
npm run dev
```

## Or Use the Helper Script

I created a helper script for you:
```powershell
cd backend
.\setup-database.ps1
```

This will:
- Check if PostgreSQL is installed
- Ask for your password
- Create the database
- Update .env file

## Most Common Issue

**Problem:** Database password not set in `.env`

**Solution:** Open `backend/.env` and set:
```
DB_PASSWORD=your_postgres_password
```

Usually it's `postgres` if you didn't change it.

---

**Just tell me what you need help with and I'll guide you through it!** 🎯

---

## 📧 Email Notifications (New)

To enable automated emails (maintenance alerts, move-permit updates, etc.), add these variables to your `backend/.env`:

```
SMTP_ENABLED=true
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@logixcontact.site
SMTP_PASS=YOUR_EMAIL_PASSWORD
SMTP_FROM_NAME=Property UAE Notifications
SMTP_FROM_EMAIL=noreply@logixcontact.site
```

> ⚠️ Replace `YOUR_EMAIL_PASSWORD` with the real password.  
> Emails will be sent through `noreply@logixcontact.site`.

