#  Smart Procure – Inventory Optimization & Procurement Management System

Smart Procure is an intelligent, web-based platform designed to optimize inventory management and streamline procurement processes for electronic components. It enables organizations to efficiently manage stock levels, track suppliers, automate procurement alerts, and send real-time email notifications using Supabase Edge Functions.

---

##  Features

### Core Functionality

####  Inventory Management

* Manage electronic components with real-time stock levels
* Configure and track reorder thresholds
* Monitor component usage history

####  Supplier Management

* Add, edit, and delete supplier records
* Maintain supplier contact details
* Associate suppliers with specific components

####  Procurement Automation

* Automated low-stock alerts
* Supplier-wise component mapping
* Historical price tracking for components

####  Email & Notification System

**Automated Email Alerts**

* Low-stock procurement notifications
* Supplier communication emails

**Email Delivery**

* Supabase Edge Functions
* Resend SMTP integration

**Custom Email Triggers**

* Send emails directly to supplier email IDs
* Test email functionality using personal email addresses

---

##  User Experience

* Modern, responsive dashboard
* Card-based supplier views
* Search and filter functionality
* Expandable supplier details
* Component lists per supplier
* Toast notifications for success and error feedback

---

##  Technology Stack

### Frontend

* React (Vite + TypeScript)
* Tailwind CSS
* ShadCN UI
* Lucide Icons

### Backend & Database

* Supabase
* PostgreSQL
* Row Level Security (RLS)
* Supabase Authentication

### Serverless & Email

* Supabase Edge Functions
* Resend (SMTP-based email delivery)

---

##  Project Structure

```bash
Smart-Procure/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── integrations/
│   │   └── supabase/
│   └── hooks/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── send-supplier-alert/
│   │   └── send-supplier-message/
│   └── config.toml
│
├── .env
├── package.json
└── README.md
```

---

##  Prerequisites

* Node.js 18+
* Supabase account
* Resend account
* Git & GitHub

---

##  Installation & Setup

###  Clone the Repository

```bash
git clone https://github.com/yourusername/smart-procure.git
cd smart-procure
```

###  Install Dependencies

```bash
npm install
```

###  Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

###  Supabase Setup

Login and link your project:

```bash
npx supabase login
npx supabase link
```

Push the database schema:

```bash
npx supabase db push
```

---

##  Email Configuration (Resend)

1. Enable **Custom SMTP** in Supabase:

   * Supabase Dashboard → Authentication → Email

2. SMTP Configuration:

   * **Host:** smtp.resend.com
   * **Port:** 587
   * **Username:** resend
   * **Password:** `re_your_resend_api_key`
   * **Sender Email:** [onboarding@resend.dev](mailto:onboarding@resend.dev)

3. Set Edge Function secret:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_resend_api_key
```

4. Deploy Edge Functions:

```bash
npx supabase functions deploy
```

---

##  Running the Project

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:5173
```

---

##  Email Testing

* Supplier email addresses are fetched from the `suppliers` table
* To test email delivery:

  1. Replace a supplier’s email with your personal email (e.g., Gmail)
  2. Click **Send Email**
  3. Verify email delivery in your inbox

---

##  System Workflow

1. **Inventory Monitoring** – Tracks component quantities and detects low-stock conditions
2. **Supplier Mapping** – Links components with registered suppliers
3. **Edge Functions** – Executes server-side email logic
4. **Email Delivery** – Supabase → Resend → Supplier inbox

---

## Future Enhancements

* Analytics dashboard for inventory trends
* Supplier performance scoring
* Role-based access control (RBAC)
* PDF export for procurement reports
* AI-based demand forecasting

---

##  Author

**Pooja S**
 Email: [poojashree2266@gmail.com](mailto:poojashree2266@gmail.com)

 GitHub: [Pooja0629](https://github.com/Pooja0629)

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Acknowledgments

* Supabase for backend services and Edge Functions
* Resend for reliable email delivery
* Open-source community for UI libraries and tooling

##  Project Links

* **Repository:** [https://github.com/Pooja0629/Smart-Procure](https://github.com/Pooja0629/Smart-Procure)
* **Issues:** [https://github.com/Pooja0629/Smart-Procure/issues](https://github.com/Pooja0629/Smart-Procure/issues)

---

**“Optimizing inventory decisions through automation, real-time alerts, and scalable cloud infrastructure.”**

