# 🚀 Employee Management & HR Portal

A modern, secure, and scalable HR Management System with Microsoft SSO, employee onboarding workflow, document management, and role-based access. Integrates with Microsoft Entra ID (Azure AD) for authentication and email, and supports cloud deployment (AWS, GCP, Azure, Hostinger VPS).

---

## 👩‍💼👨‍💼 Key Features

- **Employee Profile Management** (personal details, contact info)
- **Document Management** (PAN, Aadhar, Resume, etc.)
- **Role-Based Access** (Admin, HR, Employee)
- **Employee Onboarding Workflow**
- **Microsoft SSO Integration** (Azure AD/Entra ID)
- **Automated Email Notifications**
- **Account Deactivation/Revocation**
- **Audit Logging**
- **Cloud-Ready (Docker, 3-tier architecture)**

---

## 📝 Onboarding & SSO Workflow

1. **MS ID Creation & Assignment**
   - HR/admin initiates onboarding in the HR portal.
   - System creates/assigns a Microsoft (MS) ID via MS Graph API or SSO.
   - New joinee receives SSO login instructions by email.
2. **Joinee Creates Credentials**
   - Joinee logs in via SSO, sets up credentials if needed.
   - System flags user as "pending verification" after first login.
3. **HR Notification & Verification**
   - System notifies HR of new pending user.
   - HR verifies and approves access in the portal.
   - User status updated to "verified".
4. **Redirect to Personal Details**
   - Verified users are redirected to fill personal details.
   - Profile status updated to "profile completed" after submission.
5. **Deactivation on MS ID Removal**
   - If MS ID is deleted/deactivated, SSO fails on next login.
   - System denies access and logs the event for audit.

---

## 🔐 Microsoft Entra ID (Azure AD) Setup

- **App Registration**: Register your app in Azure Portal (Entra ID)
- **Redirect URIs**: Must match exactly (use `http://localhost:8000/accounts/microsoft/login/callback/` for local dev)
- **Permissions** (Delegated & Application):
  - `Mail.Send`, `Mail.ReadWrite` (optional)
  - `User.Read.All`, `Directory.Read.All`
  - `Calendars.ReadWrite`, `OnlineMeetings.ReadWrite.All`
- **Client Credentials**: Store `client_id`, `secret`, and `tenant_id` securely (e.g., in `.env`)
- **Consent**: Admin consent required for some permissions

---

## ⚙️ Setup Instructions

### 1. Clone & Install

```bash
git clone <your_repo_url>
cd Billing-Site/backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### 2. Configure Environment

- Copy `.env.example` to `.env` and fill in:
  - `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, etc.
- Set allowed hosts in Django settings for your domain/ngrok URL.

### 3. Run the Server

```bash
python manage.py migrate
python manage.py runserver
```

### 4. Frontend

```bash
cd ../frontend
npm install
npm start
```

---

## 🛠️ Troubleshooting

- **AADSTS50011**: Redirect URI mismatch. Ensure the URI in Azure matches your Django settings exactly (use `localhost`, not `127.0.0.1`).
- **DisallowedHost**: Add your ngrok/public domain to `ALLOWED_HOSTS` in Django settings.
- **Email/SSO Issues**: Check Azure permissions and consent status.

---

## 🌐 Deployment & Cost Comparison

| Provider    | Infra (3-tier) | Est. Monthly Cost (INR) | Notes |
|-------------|----------------|------------------------|-------|
| AWS         | EC2, RDS, S3   | ₹3,000 – ₹8,000        | Scalable, managed |
| GCP         | Compute, SQL   | ₹2,800 – ₹7,500        | Similar to AWS    |
| Azure       | VM, SQL, Blob  | ₹3,200 – ₹8,500        | Native AD/SSO     |
| Hostinger VPS | VPS, manual   | ₹1,200 – ₹2,500        | DIY, less managed |

- **Production**: Register your production domain in Azure Redirect URIs.
- **Docker**: Recommended for scalable deployment.

---

## 📚 References & Useful Links

- [Azure Portal – App Registrations](https://portal.azure.com)
- [Django Social Auth Docs](https://django-allauth.readthedocs.io/)
- [Microsoft Graph API Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [ngrok](https://ngrok.com/)

---

## 🤝 Contributors

- Neha Sureshkumar ([nehasureshkumar](mailto:nehas@appglide.io))
- Prashant ([ajPrashant](https://github.com/ajPrashant))

---

## 📬 Need Help?

Raise an issue or contact the maintainers for support, deployment help, or feature requests.
