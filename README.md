# 🍀 EcoSphere: ESG Management & ERP Integration Platform

EcoSphere is a unified **Environmental, Social, and Governance (ESG)** management platform designed to integrate corporate sustainability tracking directly into day-to-day Enterprise Resource Planning (ERP) operations. By combining real-time operational data processing, compliance auditing, policy tracking, and employee engagement through gamification, EcoSphere transforms sustainability metrics from dry reports into active corporate culture.

---

## 🎯 Value Proposition

Many ERP systems capture manufacturing, logistics, and expense data, but ESG reporting remains a manual, disconnected, and retroactively compiled task. EcoSphere solves this by:
* **Automating Carbon Accounting** through operational spending logs parsed with local Emission Factors.
* **Cultivating Active Social Engagement** via community CSR activities, training courses, and participation evidence tracking.
* **Enforcing Transparent Governance** using policy sign-offs, compliance issue escalation, and third-party ISO audits.
* **Incentivizing Green Behaviors** using a comprehensive employee gamification module featuring XP, badges, and a points-based rewards catalog.

---

## 🛠️ Core Modules & Features

### 1. 🍀 Environmental (Scope 1 & 2 Emissions)
* **Automated Emission Engine:** Toggles via app settings to automatically convert daily operational expenditures (Purchase, Manufacturing, Expenses, Fleet) into CO2e carbon transactions using custom configured Emission Factors.
* **Emission Factor Registry:** Manage factors such as Grid Electricity ($kWh$), Natural Gas ($m^3$), Fleet Diesel ($Liters$), or Air Travel ($km$).
* **Department Carbon Tracking:** Track real-time carbon footprints against configurable department-level sustainability targets.
* **Interactive SVG Visualization:** Real-time data visualization showing trends across recent carbon transactions.

### 2. 🤝 Social (CSR & Engagement)
* **CSR Campaigns Portal:** Publish and organize corporate social responsibility drives (e.g., Beach Cleanups, Tree Plantings).
* **Demographic Representation:** Dynamic diversity metrics tracking (Gender, Ethnicity) directly populated from employee records.
* **Interactive Training Center:** Interactive course lists covering ESG Code of Conduct, Carbon Auditing, and Sustainable Procurement to build employee compliance skills.
* **Evidence Validation:** Mandates proof file uploads (e.g., photo evidence) before CSR participation is marked approved for XP.

### 3. ⚖️ Governance (Auditing & Compliance)
* **ESG Policy Hub:** Central repository for publishing core organizational directives (e.g., Sustainable Procurement Policies) with mandatory employee review and policy acknowledgement logs.
* **Audit Registry:** Tracks internal and third-party audits (e.g., ISO 14001 certification audits) including auditor names, statuses (passed/failed), and formal findings reports.
* **Compliance Issue Tracker:** Log violations, assign explicit owners, define due dates, and flag overdue issues with automatic escalation alerts.

### 4. 🏆 Gamification & Employee Portal
* **XP & Badging System:** Automatic badge-granting Engine (e.g., *Eco Novice*, *Green Champion*) that triggers instantly when an employee's cumulative XP or challenge counts meet custom JSON-defined unlock conditions.
* **Redeemable Reward Catalog:** Employees earn points for ESG activity completions and exchange them for sustainable merchandise (e.g., Bamboo Travel Mugs, Solar Powerbanks).
* **Challenge Lifecycle Manager:** Allows managers to control challenges via a full lifecycle (Draft $\rightarrow$ Active $\rightarrow$ Under Review $\rightarrow$ Completed $\rightarrow$ Archived).
* **Leaderboards:** Department-level and peer-level rankings to foster healthy, sustainable competition.

### 5. 📊 Reports & Custom Builder
* **Report Generator:** Generate distinct Environmental, Social, and Governance reports.
* **Custom Report Builder:** Filter and drill down data by Department, Date Range, Module, Employee, Challenge, and ESG Category.
* **Data Export:** Export custom tables directly to **PDF, Excel, or CSV** formats.

---

## 📂 Database Schema Overview

The database runs on **SQLite** using **Prisma ORM**. The primary data models include:

* **Department:** Configures department hierarchies, employee counts, and carbon cap limits (`carbonTarget`).
* **Employee:** Tracks credentials, roles (`employee`, `manager`, `officer`), XP, points balance, and demographic tags.
* **SpendingRecord:** Stores transactions in categories (`purchase`, `manufacturing`, `expense`, `fleet`) representing physical quantities that drive automated carbon calculations.
* **CarbonTransaction:** Documents emissions in kilograms of $CO_2e$ linked to an `EmissionFactor`.
* **CSRActivity & Participation:** Stores voluntary green events and records individual employee completions along with uploaded proof attachments.
* **Challenge & ChallengeParticipation:** Tracks gamified sustainability quests and progress values.
* **Badge & EmployeeBadge:** Standard rules-based achievements and records of unlocks.
* **ESGPolicy & PolicyAcknowledgement:** Policies and their corresponding employee sign-offs.
* **ComplianceIssue & Audit:** Tracks operational violations and formal third-party certificates.
* **TrainingCourse & EmployeeTraining:** Interactive training catalog and completions.
* **Notification:** Feeds the in-app notification center for badges, compliance alerts, and approvals.

---

## 🧮 ESG Scoring Formulas

EcoSphere computes real-time ESG metrics dynamically inside [esg-calc.ts](file:///c:/Users/Yaswanth%20Nadh%20G/OneDrive/Documents/odoo%20hackathon%202026/src/lib/esg-calc.ts). The mathematical breakdown is:

### 1. Environmental Score ($Score_{Env}$)
The score evaluates actual $CO_2e$ emissions against the department's configured target.
$$\text{Score}_{Env} = \max\left(0, \min\left(100, 100 - \frac{\text{Actual } CO_2e}{\text{Carbon Target}} \times 50\right)\right)$$
* *If Actual Emissions = 0:* Score is $100$.
* *If Actual Emissions = Carbon Target:* Score is $50$.
* *If emissions exceed $2 \times$ target:* Score drops to $0$.

### 2. Social Score ($Score_{Soc}$)
The score is split 50/50 between approved CSR activity participation rates and XP goal achievement:
$$\text{Score}_{Soc} = \left(\text{Score}_{Participation} \times 0.5\right) + \left(\text{Score}_{XP} \times 0.5\right)$$
* **Participation score:** Evaluates approved participations against a baseline target of 0.5 per employee:
  $$\text{Score}_{Participation} = \min\left(100, \frac{\text{Approved Participations}}{\text{Employee Count} \times 0.5} \times 100\right)$$
* **XP score:** Evaluates total department XP against a baseline target of 150 XP per employee:
  $$\text{Score}_{XP} = \min\left(100, \frac{\text{Total Department XP}}{\text{Employee Count} \times 150} \times 100\right)$$

### 3. Governance Score ($Score_{Gov}$)
Evaluates policy compliance and penalizes outstanding, unresolved violations:
$$\text{Score}_{Gov} = \max\left(0, \min\left(100, \text{Policy Acknowledgement Rate} \times 100 - (\text{Overdue Open Issues} \times 20)\right)\right)$$
* **Policy Acknowledgement Rate:** $\frac{\text{Total Acknowledged}}{\text{Employee Count} \times \text{Active Policies}}$
* **Overdue Penalty:** Deducts $20$ points from the governance score for every unresolved compliance issue past its due date.

### 4. Overall ESG Score ($Score_{Overall}$)
A weighted average of the individual dimension scores, configurable in the settings panel (Default weighting: Env **40%**, Social **30%**, Governance **30%**):
$$\text{Score}_{Overall} = (w_{Env} \cdot Score_{Env}) + (w_{Soc} \cdot Score_{Soc}) + (w_{Gov} \cdot Score_{Gov})$$

---

## 💻 Tech Stack

* **Core Framework:** Next.js 16.2 (App Router) & React 19.2
* **Styling Engine:** Tailwind CSS v4 & PostCSS
* **Database Driver:** SQLite via `better-sqlite3` and `@prisma/adapter-better-sqlite3`
* **Object-Relational Mapping:** Prisma 7.8
* **Languages & Compilers:** TypeScript & Next Compiler

---

## 🚀 Getting Started & Local Setup

Follow these commands to configure the development environment locally:

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (copied from the `.env` template):
```env
DATABASE_URL="file:./prisma/dev.db"
```

### 3. Build & Initialize SQLite Database
Migrate the SQLite schema and deploy database tables:
```bash
npx prisma db push
```

### 4. Seed Mock Data
Run the seeding script to populate initial departments, mock employees, policies, compliance logs, badges, rewards, and historical transactions:
```bash
npx tsx prisma/seed.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser to view the application.

---

## 👤 Seeding Login Credentials

The following pre-configured employee accounts are available in the database for testing the various roles and approval flows:

| Employee Name | Email Address | Password | Role | Primary Department |
| :--- | :--- | :--- | :--- | :--- |
| **John Doe** | `john@ecosphere.com` | `john123` | `employee` | Logistics |
| **Jane Smith** | `jane@ecosphere.com` | `jane123` | `employee` | Manufacturing |
| **Elena Rostova** | `elena@ecosphere.com` | `elena123` | `manager` | Corporate |
| **Dr. Alan Turing** | `alice@ecosphere.com` | `alice123` | `employee` | R&D |
| **Marcus Vance** | `marcus@ecosphere.com` | `marcus123` | `officer` | Corporate |

### Roles Capability Matrix:
* **Employee:** Log spending records, submit CSR activities with proof, acknowledge policies, participate in active challenges, and redeem points for rewards in the catalog.
* **Manager / Officer:** Manage settings, change configurations, toggle automated rules, transition challenge lifecycle states, create new policies, log compliance violations, publish third-party audits, and approve or reject employee CSR/challenge submissions.
