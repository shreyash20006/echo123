# ECHO.TGPCOP — BUILD COMPLETE TEAM RECRUITMENT APPLICATION SYSTEM

Act as a senior full-stack developer and UI/UX designer.

I want to build a complete recruitment application system directly inside the existing ECHO.TGPCOP website.

IMPORTANT: Do not use Google Forms. Create a native application form integrated into the existing website.

First inspect the entire project architecture, existing pages, authentication, Supabase configuration and database schema. Then implement the feature without breaking existing functionality.

## 1. APPLY NOW BUTTON

Add a prominent "Apply Now" button on the Join Our Team / Recruitment section.

On clicking:
- Open a dedicated recruitment application page or elegant multi-step form.
- Use a smooth transition.
- Show a progress indicator.
- Make the experience fully responsive.

Suggested route: `/join-us` or `/apply`.

## 2. APPLICATION FORM

### Section 1 — Personal Details
- Full Name (required)
- Email Address (required, validated)
- WhatsApp / Phone Number (required)
- College / Institution (required)
- Course / Department
- Current Academic Year
- Instagram Username (optional)
- Profile Photograph (optional)

### Section 2 — Department Preferences

Allow multiple selections:

- Photography
- Videography
- Video Editing
- Reels & Content Creation
- Cinematography
- Graphic Designing
- Poster & Banner Designing
- Social Media Management
- Content Writing
- Script Writing
- Anchoring / Hosting
- Public Relations
- Event Management
- Event Coordination
- Marketing & Promotions
- Sponsorship & Outreach
- Website / Technology
- Other

### Section 3 — Skills & Experience
- Current skills (multiple selection)
- Experience level: Beginner / Intermediate / Advanced / Professional
- Have you worked on previous projects or events? Yes / No
- Previous experience description (optional)
- Have you worked with any college club or organisation? Yes / No
- Previous role and organisation (optional)
- Software/tools known:
  Canva, Photoshop, Lightroom, Premiere Pro, DaVinci Resolve, CapCut, VN Editor, Other, None.

### Section 4 — Portfolio
Optional fields:
- Instagram profile URL
- Photography portfolio URL
- Video / Reel samples URL
- Graphic design samples URL
- Previous project / event coverage URL

Allow optional portfolio uploads if technically supported.

### Section 5 — Availability
- Weekly availability: 1–3 / 3–5 / 5–8 / 8+ hours
- Available for campus events and shoots? Yes / No / Depends
- Smartphone with camera available? Yes / No
- Comfortable working in a team? Yes / No / Need to learn
- Preferred role: Creative / Production / Management / Both / Open to any role

### Section 6 — Motivation
- Why do you want to join ECHO.TGPCOP? (required)
- What makes you suitable for our team? (required)
- What new ideas would you bring? (optional)
- What would you like to learn at ECHO? (optional)

### Section 7 — Declaration
Required checkboxes:
- I confirm my information is accurate.
- I understand that application does not guarantee selection.
- I agree to be contacted regarding recruitment.
- I understand that permission will be obtained before using my work publicly.

## 3. DESIGN & USER EXPERIENCE

Use ECHO branding:
- Royal Blue #004BFE
- Yellow #FFD400
- Navy #001C78
- White

Create a premium, modern recruitment experience:
- Multi-step form.
- Step progress bar.
- Smooth section transitions.
- Beautiful input fields.
- Animated focus states.
- Department selection cards.
- Responsive layout.
- Clear validation messages.
- Back and Continue buttons.
- Final Review Application screen.
- Submit Application CTA.

Mobile-first design is mandatory.

## 4. SUPABASE DATABASE INTEGRATION

Inspect the existing Supabase project and schema before creating anything.

Create a suitable table such as `echo_team_applications` if it does not already exist.

Suggested fields:
- id (UUID primary key)
- full_name
- email
- phone
- college
- course
- academic_year
- instagram
- departments (text array)
- skills (text array)
- experience_level
- previous_experience
- previous_organisation
- software_tools (text array)
- portfolio_links (JSONB)
- weekly_availability
- event_availability
- smartphone_available
- preferred_role
- motivation
- suitability
- ideas
- learning_goals
- declaration_accepted
- status (default: pending)
- created_at

Use appropriate data types and constraints.

Do not duplicate existing tables. If an existing application table is suitable, extend or reuse it safely.

## 5. SECURITY

- Use Supabase RLS.
- Public applicants may submit applications only through a secure, validated flow.
- Applicants must not read other applicants' records.
- Only authorised ECHO administrators can access the application directory.
- Never expose Supabase service-role keys in frontend code.
- Validate all fields server-side or through a secure trusted backend.
- Add basic spam protection and rate limiting.
- Validate uploaded file types and sizes.
- Do not allow public access to private application data.

Inspect existing authentication and role management before implementing admin permissions.

## 6. APPLICATION SUCCESS PAGE

After a successful submission:

Show a premium success screen:

"APPLICATION SUBMITTED!"

"Thank you for your interest in joining ECHO.TGPCOP. Your application has been received successfully. Our team will review your profile and contact you regarding the next steps."

Show:
- Application reference ID.
- Submitted email.
- Back to Home button.
- Instagram link.

Do not show success if the database submission fails.

Prevent accidental duplicate submissions.

## 7. ADMIN APPLICATION MANAGEMENT

Integrate an application management section into the existing authorised admin dashboard.

Features:
- View all applications.
- Search by applicant name or email.
- Filter by department and experience level.
- View complete application details.
- View portfolio links.
- Review uploaded files securely.
- Change status: Pending / Under Review / Shortlisted / Selected / Rejected.
- Add internal admin notes.
- Export applications as CSV.

Only authorised admins may access this section.

## 8. EMAIL NOTIFICATIONS

If an existing secure email service is configured, integrate it.

- Send an application received confirmation to the applicant.
- Notify the authorised ECHO recruitment team.
- Do not expose email API keys.
- If email delivery fails, preserve the successfully saved application and log the notification failure.

## 9. TESTING

Test:
- Complete application submission.
- Required field validation.
- Email and URL validation.
- Multiple department selection.
- Mobile layout.
- File upload.
- Database persistence.
- Duplicate submission prevention.
- Admin access restrictions.
- Search, filters and status updates.
- Success and error states.

Do not break existing website pages, authentication, gallery or other features.

## FINAL REQUIREMENT

Implement the complete working recruitment system in the existing ECHO.TGPCOP website.

Do not stop after designing the UI. Connect the form to Supabase, implement security and admin management, run the production build and report all modified files and tests.

Never claim deployment or successful database changes unless actually completed.