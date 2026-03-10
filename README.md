# 📖 Jollof Pages

**Continuity and workflow platform for serialized graphic novel creation.**

Jollof Pages helps creators keep canon, character state, scene sequence, page structure, panel intent, revision history, and visual references connected in a single workflow.

---

## 🎯 Project Goal

Build an end-to-end creative command center for graphic novel production — one environment where story structure, character continuity, scene scripting, page layouts, and visual references all stay connected.

---

## ✅ Currently Completed Features (Foundation Stage — Step 6)

This is **Phase 1: Minimal UI Screens**. The interface shell has been established.

### index.html — Splash / Landing Page
- Hero section with headline, subheadline, CTA buttons
- Dashboard mini-preview card (mock of the app interface)
- Intro section explaining the problem
- Problem section with chaos-to-connected visualization
- Features grid (6 feature cards)
- Feature checklist summary
- Closing CTA section
- Fixed navigation bar with logo, Sign In, Get Started buttons
- Footer with logo and theme toggle
- Dark/light theme toggle (stored in `localStorage`)
- Responsive across all breakpoints

### login.html — Authentication Page
- Username/email input field
- Password input field with show/hide toggle (👁/🙈)
- Demo credentials displayed visibly on page
- "Use Demo Credentials" auto-fill button
- Front-end credential validation
- Error message display with shake animation
- Redirect to `dashboard.html` on successful login
- Minimal top bar with back-to-home link and theme toggle
- Fully accessible form with ARIA labels

### dashboard.html — Application Dashboard
- Fixed top bar with logo, breadcrumb, user pill, theme toggle
- Collapsible sidebar with organized navigation sections:
  - Series (Overview, Series Setup)
  - Story (Characters, World, Scenes)
  - Production (Pages, Panels, Visual References)
  - Quality (Continuity, Revisions)
  - Utility (Settings, Docs & Help, Back to Home)
- Mobile hamburger toggle with overlay
- Welcome panel with headline, subtitle, action buttons
- Status bar (4 stat cards: Series, Characters, Scenes, Continuity Score)
- Module grid (8 placeholder cards): Series Setup, Characters, World, Scenes, Pages, Panels, Continuity, Visual References
- Recent Activity panel with initial activity entries
- Quick Start panel with 6 action items
- Build Roadmap banner showing future phases
- Toast notification system for all module interactions
- Sidebar active state management
- Mobile sidebar open/close with overlay

### style.css — Design System
- CSS custom property system for all design tokens
- Dark theme: cinematic, deep, premium
- Light theme: clean, modern, professional
- Brand accent color: `#E8622A` (orange)
- Responsive breakpoints: 1200px, 992px, 768px, 480px
- Scroll-triggered fade animations via IntersectionObserver
- Reusable component classes: buttons, cards, panels, badges, pills
- Scrollbar styling
- Keyframe animations: fadeUp, fadeIn, shake

### script.js — Client-Side Logic
- Theme toggle + `localStorage` persistence (key: `jp_theme`)
- Theme applied before page render (no flash)
- Login form validation
- Demo credential auto-fill
- Redirect to dashboard on successful login
- Dashboard sidebar mobile toggle
- Module card click interactions
- Quick start item click interactions
- Toast notification system
- IntersectionObserver scroll animations
- Smooth scroll for anchor links
- Topbar scroll transparency effect

---

## 🔗 Entry Points / URI Summary

| Page | Path | Description |
|------|------|-------------|
| Landing Page | `index.html` | Splash page, marketing, CTA |
| Login | `login.html` | Authentication form |
| Dashboard | `dashboard.html` | Main application shell |

### Demo Credentials
| Field | Value |
|-------|-------|
| Username | `jollof` |
| Password | `pages` |

---

## 🗂 File Structure

```
index.html       — Splash / landing page
login.html       — Login / authentication page
dashboard.html   — Main application dashboard
style.css        — All styles, design system, responsive layout
script.js        — Theme, login logic, dashboard interactions
README.md        — This file
```

---

## 🛠 Tech Stack

| Concern | Technology |
|---------|-----------|
| Markup | Plain HTML5 |
| Styling | Plain CSS3 (custom properties, grid, flexbox) |
| Behavior | Plain JavaScript (ES5-compatible IIFE) |
| Fonts | Google Fonts — Inter |
| Icons | Unicode emoji (no external icon library) |
| Data persistence | `localStorage` (theme preference only) |
| Backend | None (static, browser-only) |

---

## 🚧 Features Not Yet Implemented

The following belong to future build phases:

| Phase | Feature |
|-------|---------|
| Step 1 | Data model definition |
| Step 2 | Database schema |
| Step 3 | CRUD for core entities (Series, Character, Location, Scene) |
| Step 4 | End-to-end scene workflow |
| Step 5 | Continuity checking engine |
| Step 7 | AI-assisted drafting |
| Step 8 | Timeline, canon wiki, story planning |
| Step 9 | Visual continuity system |
| Step 10 | Agent console |
| Step 11 | Full connected production system |

---

## 📐 Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| > 1200px | Full desktop, 4-column modules, sidebar visible |
| ≤ 1200px | 3-column modules, 2-column status bar |
| ≤ 992px | Sidebar collapses to hamburger overlay, 2-column modules |
| ≤ 768px | Hero actions stack, 2-column modules, footer stacks |
| ≤ 480px | Single column everything, touch-friendly sizing |

---

## 🎨 Design Tokens (Key Values)

| Token | Dark | Light |
|-------|------|-------|
| Background base | `#111013` | `#f4f2f8` |
| Background surface | `#1a1820` | `#ffffff` |
| Background card | `#201e28` | `#ffffff` |
| Text primary | `#f0edf8` | `#1a1625` |
| Text secondary | `#a89ec0` | `#5a5270` |
| Brand accent | `#E8622A` | `#E8622A` |
| Border | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.09)` |

---

## 🔮 Recommended Next Steps

1. **Define data models** — Series, Character, Location, Scene, Page, Panel, VisualReference
2. **Connect to RESTful Table API** — enable real data persistence for characters and scenes
3. **Build Character CRUD** — create, read, update, delete character profiles
4. **Build Scene CRUD** — create scenes, attach characters and locations
5. **Build the scene script editor** — rich text writing interface for scene drafts
6. **Implement page/panel breakdown** — split scenes into pages, pages into panels
7. **Add continuity check logic** — flag mismatches in character state across scenes
8. **Add visual reference upload** — attach images to characters, scenes, panels
9. **Build timeline view** — visualize story arc structure across chapters
10. **Expand sidebar navigation** — link modules to actual content pages

---

*Jollof Pages — Build your graphic novel without losing the story.*
