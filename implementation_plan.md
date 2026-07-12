# Feature Implementation Plan

I have comprehensively reviewed the current state of the application against the feature checklist you provided. Here is the breakdown of what is already implemented and the plan to implement the missing features.

## Implemented Features (Verified)

### Environmental
- [x] Configure Emission Factors
- [x] Calculate Carbon Emissions
- [x] Department Carbon Tracking
- [x] Environmental Dashboard

### Social
- [x] CSR Activities
- [x] Employee Participation

### Governance
- [x] ESG Policies
- [x] Policy Acknowledgements
- [x] Compliance Issues

### Gamification
- [x] XP tracking
- [x] Badges (Auto-award logic is implemented in the API when completing challenges)
- [x] Rewards (redeemable in store)
- [x] Leaderboards

### Settings & Administration
- [x] Departments management
- [x] Category management
- [x] ESG Configuration
- [x] Notification Settings

## Missing or Incomplete Features to Implement

> [!WARNING]
> Several requested features are either entirely missing from the backend (requiring Prisma schema updates) or are currently hardcoded with mock data in the frontend.

### 1. Sustainability Goals (Environmental)
Currently, carbon targets are hardcoded in the codebase (`DEPT_CARBON_TARGETS`).
- **Plan**: Add a `carbonTarget` field to the `Department` model in `schema.prisma`. Update the `SettingsPortal` to allow configuring these targets per department, and update `esg-calc.ts` to calculate scores based on dynamic targets.

### 2. Diversity Metrics (Social)
Currently, the Diversity dashboard is fully mocked with hardcoded text (e.g. "46% Female").
- **Plan**: Add demographic fields (e.g., `gender`, `ethnicity`) to the `Employee` model in the database. Update the seed script to randomize these. Calculate true diversity metrics based on the employee dataset in the server component and pass them to `SocialPortal.tsx`.

### 3. Training Completion (Social)
Currently, training courses are a hardcoded array in `SocialPortal.tsx` and completions are saved in local storage (they don't persist across devices or affect the actual database).
- **Plan**: Create new `TrainingCourse` and `EmployeeTraining` models in `schema.prisma`. Create REST API endpoints to fetch courses and mark them as complete. Update the `SocialPortal` to render real data.

### 4. Audits (Governance)
Currently, there is only a `ComplianceIssue` model. "Audits" are completely missing.
- **Plan**: Create an `Audit` model in the database (with fields like `title`, `date`, `auditor`, `status`, `findings`). Add a new tab/section in the `GovernancePortal.tsx` to list and create Audits.

### 5. Challenge Lifecycle (Gamification)
While the database supports statuses (`draft`, `active`, `under_review`, `completed`, `archived`), the UI immediately publishes challenges as `active` and provides no way to change the status.
- **Plan**: Add status dropdown controls in the Gamification dashboard for managers to transition challenges between the requested states: Draft → Active → Under Review → Completed/Archived. Filter the employee view so they only see `active` challenges.

## Open Questions

> [!IMPORTANT]
> - Do you want the **Diversity Metrics** (Gender/Ethnicity fields) to be editable by employees in a profile page, or is it sufficient to just add them to the database schema and randomize them in the seeder for demonstration purposes?
> - For **Audits**, should they be linked to a specific Department, or are they company-wide? (I will assume company-wide by default unless specified).

---
**Please review this plan and click "Proceed" to approve it, or provide any feedback!**
