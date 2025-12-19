Smart Procure – Inventory Optimization & Procurement Management System

An intelligent web-based system designed to optimize inventory management and streamline procurement for electronic components. The platform helps track suppliers, monitor component usage, automate procurement alerts, and send email notifications using Supabase Edge Functions.

🚀 Features
Core Functionality

Inventory Management

Manage electronic components with stock levels

Track reorder thresholds

Monitor usage history

Supplier Management

Add, edit, and delete supplier details

Maintain supplier contact information

Associate suppliers with supplied components

Procurement Automation

Automated low-stock alerts

Supplier-wise component tracking

Historical price tracking

Email & Notification System

Automated Email Alerts

Low-stock procurement alerts

Supplier notification emails

Email Delivery

Supabase Edge Functions

Resend SMTP integration

Custom Email Triggers

Send emails to supplier email IDs

Test emails by replacing supplier email with your own

User Experience

Modern UI

Responsive dashboard

Card-based supplier view

Search and filter functionality

Interactive Components

Expandable supplier details

Component lists per supplier

Toast Notifications

Success and error feedback for actions

🛠 Technology Stack
Frontend

React (Vite + TypeScript)

Tailwind CSS

ShadCN UI

Lucide Icons

Backend & Database

Supabase

PostgreSQL database

Row Level Security (RLS)

Authentication

Supabase Edge Functions

Serverless email handling

Resend

SMTP-based email delivery

📦 Project Structure
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

⚙️ Prerequisites

Node.js 18+

Supabase account

Resend account

Git & GitHub

🔧 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/yourusername/smart-procure.git
cd smart-procure

2️⃣ Install Dependencies
npm install

3️⃣ Configure Environment Variables

Create a .env file:

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key

4️⃣ Supabase Setup

Link your project:

npx supabase login
npx supabase link


Push database schema:

npx supabase db push

5️⃣ Email Configuration (Resend)

Enable Custom SMTP in Supabase → Authentication → Email

SMTP details:

Host: smtp.resend.com
Port: 587
Username: resend
Password: re_your_resend_api_key
Sender Email: onboarding@resend.dev


Set secret for Edge Functions:

npx supabase secrets set RESEND_API_KEY=re_your_resend_api_key


Deploy functions:

npx supabase functions deploy

▶️ Running the Project
npm run dev


Open:

http://localhost:5173

📧 Email Testing

Supplier emails are fetched from the suppliers table

To test email delivery:

Replace a supplier’s email with your own Gmail

Click Send Email

You will receive the email in your inbox

🧠 How It Works

Inventory Monitoring

Tracks component quantities

Detects low-stock conditions

Supplier Mapping

Links components to suppliers

Edge Functions

Trigger server-side email logic

Email Delivery

Supabase → Resend → Supplier inbox

📈 Future Enhancements

Analytics dashboard for stock trends

Supplier performance scoring

Role-based access control

PDF export of procurement reports

AI-based demand forecasting

👩‍💻 Author

Pooja S
📧 Email: poojashree2266@gmail.com

🐙 GitHub: Pooja0629

📜 License

This project is licensed under the MIT License.

⭐ Acknowledgments

Supabase for backend and serverless functions

Resend for reliable email delivery

Open-source community for UI and tooling support
