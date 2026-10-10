# EVENT-HUB (Project Handover Document)

## 📌 Project Overview
**Project Name**: EVENT-HUB (Deployed as EVENT-ALEROPATH)
**Goal**: A platform for hosts to create, manage, and build custom websites for their events, complete with dynamic social sharing and customized branding.

## 🔗 Critical Links & Architecture
- **GitHub Repository**: [https://github.com/kishan-ict/Event-HUB.git](https://github.com/kishan-ict/Event-HUB.git)
- **Live URL**: `https://event-aleropath.pages.dev` (Replaced `event-hub.pages.dev`)
- **Frontend Framework**: React, Vite, Tailwind CSS, shadcn/ui.
- **Backend & Database**: Supabase (PostgreSQL, Storage, Auth).
- **Hosting**: Cloudflare Pages.
- **External Integration**: Connected to Lovable.dev (CRITICAL: Do not force push or rewrite git history, as it breaks Lovable sync).

## 🟢 Current Status & Existing Features
- **Dynamic Website Builder**: Hosts can edit their event website using a live preview, inserting widgets like Countdown Timers, FAQs, Sponsors, and Speakers.
- **Edge-Rendered Social Meta Tags**: Cloudflare Edge Functions (`functions/event/[[slug]].js`) intercept requests to inject dynamic Open Graph (OG) and Twitter card meta tags into the server response. This ensures WhatsApp, Discord, and Twitter scrapers fetch the correct custom event banner and logo instantly.
- **Client-Side Image Compression**: `src/lib/image-compressor.ts` automatically scales and compresses large banner/logo uploads down to < 250KB before sending them to Supabase, bypassing WhatsApp's strict 300KB preview limit.
- **Social Media Cache Management**: When a host updates an existing banner, the UI presents a 5-minute countdown timer. This manages expectations regarding how long social platforms (like WhatsApp) take to clear their internal caches.
- **Rate Limiting**: Banner updates are strictly limited to **5 times per day per event**. This limit is enforced by querying Supabase Storage for the exact number of files uploaded today.
- **Custom Branding**: Every event page has a mandatory footer stating "Hosted on EVENT-HUB" with the official logo.
- **Interactive Guided Tours (`driver.js`)**: Every host dashboard section (Form Builder, Schedule, Registrations, Judges, Attenders, Submissions, Announcements, Analytics) includes a one-time step-by-step interactive onboarding tour. The popovers are strictly styled to seamlessly match the platform's dark mode and glassmorphism theme via CSS overrides in `index.css`/`styles.css`.

## 🚀 Areas for Improvement (Next Steps)
1. **Analytics Dashboard**: Expand the host analytics to track page views, unique visitors, and widget interactions.
2. **Additional Website Widgets**: Add more pre-built components to the website builder (e.g., Image Galleries, Interactive Maps).
3. **Database Rules (RLS)**: Ensure Row Level Security in Supabase is fully optimized for production traffic.

## 🗣️ Discussion Mode Rules
To ensure efficient pair programming, we utilize a "Discussion Mode":
- **What it is**: When in Discussion Mode, the AI acts as an architect and consultant. It will brainstorm, plan, and debate ideas *without* rushing to write code or execute terminal commands.
- **The Rule**: The AI will remain purely conversational until the user decides on a concrete plan of action.
- **The Trigger to Exit**: To leave this mode and return to coding, the user must explicitly say something like: **"Exit discussion mode"**, "Let's code this", or "Stop discussing and build it".
