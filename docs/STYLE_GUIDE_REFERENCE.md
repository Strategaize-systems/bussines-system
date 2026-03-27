# StrategAIze Cockpit V2 - Style Guide

>
 **Premium Strategic Operations Cockpit**  
> Design-System für hochwer
tige SaaS-Dashboards mit Brand-Farben #120774, #4454b8, #00a84f, #4dcb8b, #f2b705

---

## 📸 Screenshots Referenz

1. **Overview Page** - KPI-Cards mit Gradient-Highlights
2. **Slices Page** - Premium-Tabelle mit Action-Icons
3. **Features Page** - Feature-Übersicht mit Status-Badges
4. **Backlog Page** - Sprint-Planning mit Story Points
5. **Reports Page** - Report-Liste mit Category-Badges
6. **Next Step Page** - Task-Priorisierung mit Prompt-Generator
7. **Releases Page** - Timeline mit Release-Details
8. **Roadmap Page** - Projekt-Roadmap mit Meilensteinen

---

## Inhaltsverzeichnis

1. Brand & Farben
2. Typografie
3. Layout & Shell
4. Navigation & Sidebar
5. Cards & KPI
6. Tables
7. Forms
8. Buttons
9. Status, Tags & Alerts
10. Progress & Charts
11. Empty, Loading & Feedback States
12. Interaction States
13. Do's & Don'ts

---

## 1. BRAND & FARBEN

### Brand Colors
```css
--primary-dark: #120774;
--primary-main: #4454b8;
--success-dark: #00a84f;
--success-light: #4dcb8b;
--warning-dark: #f2b705;
--warning-light: #ffd54f;
Gradients
/* Primary */
background: linear-gradient(to right, #120774, #4454b8);

/* Success */
background: linear-gradient(to right, #00a84f, #4dcb8b);

/* Warning */
background: linear-gradient(to right, #f2b705, #ffd54f);

/* Sidebar */
background: linear-gradient(to bottom, #0f172a, #0f172a, #020617);
Wann welche Farbe?
Primary Blue Gradient → Call-to-Action, Active States
Green Gradient → Success, Completed
Yellow Gradient → Warning, In Progress
Red → Error, High Priority
Slate Gray → Neutral, Secondary
2. TYPOGRAFIE
Font Stack
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
Font Sizes
--text-3xl: 1.875rem;  /* 30px - Page Title */
--text-xl: 1.25rem;    /* 20px - Subtitle */
--text-base: 1rem;     /* 16px - Body */
--text-sm: 0.875rem;   /* 14px - Small Body */
--text-xs: 0.75rem;    /* 12px - Caption */
Typography Rules
Element	Size	Weight	Color
Page Title	30px	700	slate-900
Section Title	16px	600	slate-900
Body Text	14px	500	slate-900
Caption	12px	500	slate-500
Table Headers	12px	700 UPPERCASE	slate-700
3. LAYOUT & SHELL
Page Container
max-width: 1400px;
margin: 0 auto;
padding: 2rem;
Spacing Scale (8px-Basis)
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
Border Radius
--radius-md: 0.5rem;   /* 8px - Badges */
--radius-lg: 0.75rem;  /* 12px - Cards, Buttons */
--radius-xl: 1rem;     /* 16px - Large Cards */
Shadows
/* Card */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

/* Card Hover */
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);

/* Premium Glow (Brand) */
box-shadow: 0 8px 16px rgba(68, 84, 184, 0.3);

/* Success Glow */
box-shadow: 0 8px 16px rgba(0, 168, 79, 0.2);
4. NAVIGATION & SIDEBAR
Sidebar Container
width: 16rem; /* 256px */
background: linear-gradient(to bottom, #0f172a, #0f172a, #020617);
Navigation Item (Active)
background: linear-gradient(to right, #4454b8, #120774);
color: #ffffff;
box-shadow: 0 10px 15px -3px rgba(68, 84, 184, 0.25);
padding: 0.625rem 0.75rem;
border-radius: 0.5rem;
Navigation Item (Hover)
color: #ffffff;
background-color: rgba(255, 255, 255, 0.05);
Section Header
font-size: 0.625rem; /* 10px */
font-weight: 600;
color: #64748b;
text-transform: uppercase;
letter-spacing: 0.12em;
5. CARDS & KPI
Base Card
background: #ffffff;
border: 1px solid #e2e8f0;
border-radius: 0.75rem;
padding: 1.5rem;
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
transition: all 300ms;
KPI Card (Farbig - Success)
/* Top Border */
&::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(to right, #00a84f, #4dcb8b);
  border-radius: 0.75rem 0.75rem 0 0;
}

/* Gradient Value */
.kpi-value {
  font-size: 1.875rem;
  font-weight: 700;
  background: linear-gradient(to right, #00a84f, #4dcb8b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Hover Glow */
&:hover {
  border-color: #6ee7b7;
  box-shadow: 0 10px 15px -3px rgba(0, 168, 79, 0.1);
}
Wann farbige KPI vs. neutrale?
✅ Farbig: Wichtige Metriken (Completed, In Progress), max. 3-4 pro Row ✅ Neutral: Total-Zahlen, weniger kritische Metriken

6. TABLES
Table Container
background: #ffffff;
border: 1px solid #e2e8f0;
border-radius: 0.75rem;
overflow: hidden;
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
Gradient Top Border
height: 4px;
background: linear-gradient(to right, #120774, #4454b8, #00a84f);
Table Header (Sortable)
background: linear-gradient(to bottom, #f8fafc, rgba(248, 250, 252, 0.5));
border-bottom: 2px solid #e2e8f0;
padding: 1rem 1.5rem;
font-size: 0.75rem;
font-weight: 700;
color: #334155;
text-transform: uppercase;
letter-spacing: 0.05em;

&:hover {
  color: #4454b8;
}
Table Row (Hover)
background: linear-gradient(to right, rgba(239, 246, 255, 0.5), transparent);
border-left: 4px solid #4454b8;

.cell-id {
  color: #4454b8;
}

.cell-title {
  color: #120774;
}

.action-icons {
  opacity: 1;
}
Status Dot (in Title Cell)
width: 0.5rem;
height: 0.5rem;
border-radius: 9999px;

/* Success */
background: linear-gradient(to bottom right, #00a84f, #4dcb8b);
box-shadow: 0 0 8px rgba(0, 168, 79, 0.3);

/* Warning (mit Pulse) */
background: linear-gradient(to bottom right, #f2b705, #ffd54f);
box-shadow: 0 0 8px rgba(242, 183, 5, 0.3);
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

/* Neutral */
background: #cbd5e1;
Action Icons
display: flex;
align-items: center;
justify-content: flex-end;
gap: 0.25rem;
opacity: 0;
transition: opacity 200ms;

.icon-button {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  color: #64748b;
  
  /* View/Edit Hover */
  &:hover {
    background: #eff6ff;
    color: #4454b8;
  }
  
  /* Delete Hover */
  &.delete:hover {
    background: #fef2f2;
    color: #dc2626;
  }
}
REGEL: Action-Icons nur bei Hover sichtbar, max. 4 Icons pro Row

7. FORMS
Input Field
width: 100%;
padding: 0.625rem 0.875rem;
border: 1px solid #e2e8f0;
border-radius: 0.5rem;
font-size: 0.875rem;
color: #0f172a;
background: #ffffff;
transition: all 200ms;

&:focus {
  outline: none;
  border-color: #4454b8;
  box-shadow: 0 0 0 3px rgba(68, 84, 184, 0.1);
}

&:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}
Checkbox / Radio (Checked)
width: 1.125rem;
height: 1.125rem;
border: 2px solid #cbd5e1;
background: linear-gradient(to right, #120774, #4454b8);
border-color: #4454b8;
8. BUTTONS
Primary Button
padding: 0.75rem 1rem;
background: linear-gradient(to right, #120774, #4454b8);
color: #ffffff;
font-size: 0.875rem;
font-weight: 600;
border-radius: 0.5rem;
box-shadow: 0 4px 6px rgba(68, 84, 184, 0.3);
transition: all 200ms;

&:hover {
  box-shadow: 0 10px 15px rgba(68, 84, 184, 0.4);
  transform: translateY(-1px);
}
Secondary Button
padding: 0.75rem 1rem;
background: #ffffff;
color: #64748b;
border: 1px solid #e2e8f0;
border-radius: 0.5rem;

&:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #4454b8;
}
Ghost Button
padding: 0.75rem 1rem;
background: transparent;
color: #64748b;

&:hover {
  background: rgba(68, 84, 184, 0.05);
  color: #4454b8;
}
REGEL: Max. 1 Primary Button pro Section

9. STATUS, TAGS & ALERTS
Status Badge - Success
display: inline-flex;
align-items: center;
gap: 0.375rem;
padding: 0.375rem 0.75rem;
background: linear-gradient(to right, #00a84f, #4dcb8b);
color: #ffffff;
font-size: 0.75rem;
font-weight: 600;
border-radius: 0.5rem;
box-shadow: 0 4px 6px rgba(0, 168, 79, 0.2);
Status Badge - Warning
background: linear-gradient(to right, #f2b705, #ffd54f);
box-shadow: 0 4px 6px rgba(242, 183, 5, 0.2);

/* Optional: Spinning Icon */
svg {
  animation: spin 1s linear infinite;
}
Status Badge - Neutral
background: #f1f5f9;
color: #334155;
border: 1px solid #e2e8f0;

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #94a3b8;
}
Priority Badge - High
background: #fef2f2;
color: #b91c1c;
border: 1px solid #fecaca;

.priority-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #dc2626;
  margin-right: 0.5rem;
}
Category Badge
background: #f3e8ff; /* purple-50 */
color: #6b21a8; /* purple-700 */
border: 1px solid #e9d5ff;
padding: 0.375rem 0.625rem;
font-size: 0.75rem;
font-weight: 600;
border-radius: 0.5rem;
Alert - Success
padding: 1rem;
background: #f0fdf4;
border: 1px solid #86efac;
border-left: 4px solid #22c55e;
border-radius: 0.5rem;
REGEL: Gradient-Badges nur für finale States (Success, Warning)

10. PROGRESS & CHARTS
Progress Bar
.progress-container {
  width: 100%;
  height: 0.5rem;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, #00a84f, #4dcb8b);
  border-radius: 9999px;
  box-shadow: 0 0 8px rgba(0, 168, 79, 0.2);
  transition: width 500ms ease-out;
}
Chart Colors
const CHART_COLORS = {
  primary: '#4454b8',
  secondary: '#00a84f',
  tertiary: '#f2b705',
  quaternary: '#8b5cf6',
  quinary: '#ef4444',
};
REGEL:

100%: Green (Completed)
50-99%: Blue (In Progress)
1-49%: Yellow (Started)
0%: Gray (Not Started)
11. EMPTY, LOADING & FEEDBACK STATES
Empty State
.empty-state {
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  background: #f8fafc;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
Loading Spinner
.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f1f5f9;
  border-top-color: #4454b8;
  border-radius: 9999px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
Toast Notification
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  min-width: 320px;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  animation: toast-slide-in 300ms ease-out;
}

.toast.success {
  border-left: 4px solid #22c55e;
}
12. INTERACTION STATES
Hover States (Allgemein)
/* Cards */
&:hover {
  border-color: lighter;
  box-shadow: elevated;
  transform: translateY(-2px);
}

/* Buttons */
&:hover {
  box-shadow: elevated;
  transform: translateY(-1px);
}

/* Table Rows */
&:hover {
  background: subtle-gradient;
  border-left: 4px solid brand-color;
}
Focus States
&:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(68, 84, 184, 0.1);
}
Disabled States
&:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.6;
}
Animation Timing
/* Micro-Interactions */
transition: all 200ms ease-out;

/* Cards / Larger Elements */
transition: all 300ms ease-out;

/* Progress / Smooth Animations */
transition: all 500ms ease-out;
REGEL: Alle interaktiven Elemente MÜSSEN Hover, Focus, Active und Disabled States haben!

13. DO'S & DON'TS
✅ DO'S
Layout:

✅ 8px-Spacing-Basis (8, 16, 24, 32...)
✅ Max-width 1400px
✅ Min. 32px Padding auf Containern
✅ Min. 24px Gap zwischen Cards
Farben:

✅ Gradients für Active States & CTAs
✅ Max. 4 Farben pro Section
✅ Konsistente Bedeutung (Grün = Success)
✅ Min. WCAG AA Kontrast
Typografie:

✅ Max. 3 Font-Weights pro Page
✅ Line-height min. 1.5 für Body
✅ Uppercase nur für Labels
✅ Bold für Zahlen & Headlines
Komponenten:

✅ Hover-States überall
✅ Icons bei wichtigen Actions
✅ Loading States bei Async
✅ Empty States mit CTA
Tables:

✅ Action-Icons nur bei Hover
✅ Status-Dots neben Titel
✅ Sortierbare Header
✅ Min. 20px Cell-Padding
❌ DON'TS
Layout:

❌ Inkonsistente Spacing (13px, 17px...)
❌ Zu enge Layouts (<16px Padding)
❌ Zu breite Container (>1600px)
Farben:

❌ Mehr als 5 Farben gleichzeitig
❌ Gradients ohne Bedeutung
❌ Unleserliche Kontraste
Typografie:

❌ Zu viele Font-Sizes (max. 6-7)
❌ Touch-Targets <40px
❌ All-Caps für lange Texte
Komponenten:

❌ Buttons ohne Hover
❌ Fehlende Focus-States
❌ Mehr als 1 Primary Button pro Section
Tables:

❌ Action-Icons immer sichtbar
❌ Mehr als 4 Action-Icons
❌ Cell-Paddings <16px
🎯 PREMIUM-PRINZIPIEN
Kontrollierte Energie

Gradients & Glows sparsam
Nur für wichtige States
Keine aggressiven Animationen
Hierarchie durch Gewicht

Bold: Zahlen & Headlines
Semibold: Navigation & Labels
Medium: Body
Regular: Secondary
Ruhe durch Raum

Genug Whitespace
Keine überfüllten Screens
Clear Visual Grouping
Konsistenz über alles

Gleiche Patterns für gleiche Actions
Konsistente Spacing, Colors, States
✅ COMPONENT CHECKLIST
Neue Komponente erstellen? Prüfe:

 Hover State?
 Focus State (Keyboard)?
 Active State?
 Disabled State?
 Loading State (async)?
 Empty State (Liste)?
 Error State?
 Mobile Responsive?
 Accessibility (ARIA, Contrast)?
 Animations smooth (200-300ms)?
 Spacing konsistent (8px-Grid)?
 Colors aus Style Guide?
 Typography aus Style Guide?
Ende des Style Guides - Version 2.0 - StrategAIze Cockpit Premium Design System