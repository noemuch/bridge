# Settings — Account Information

## Description

A settings screen where users view and edit their personal account information: display name, email address, avatar/profile photo, and password. Accessed from the main navigation under Settings. Goal: let users keep their profile data accurate and their account secure. Context: authenticated desktop web app, available on all plans.

**Figma:** [pending — to be filled after generation]

---

## Visual Reference

> Knowledge base not yet built (setup pending). To be updated after `/design-workflow setup` populates the guides.

| | |
|---|---|
| **Pattern** | Settings / Form page — two-column (sidebar nav + content area) |
| **Screenshots studied** | [pending — add screenshots to `knowledge-base/ui-references/screenshots/` then re-run setup] |
| **Key composition rules** | Left sidebar for settings nav categories; right content area with stacked form sections; clear section headers; inline save per section or single sticky footer CTA |

**Composition notes:**
Standard settings layout: fixed-width sidebar (~240px) listing navigation categories (Account, Security, Notifications, Billing…), with the active item highlighted. Right content area scrollable, ~720px max-width, centered on wide viewports. Sections are separated by a horizontal divider and a bold section heading. Form fields are full-width within the content area. Destructive actions (delete account) are placed at the bottom and styled with danger tokens.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  App Header (global nav)                            │
├──────────────┬──────────────────────────────────────┤
│              │  Page Title: Account Information     │
│  Settings    ├──────────────────────────────────────┤
│  Sidebar     │  ┌─ Section: Profile ──────────────┐ │
│              │  │  Avatar + Name + Username        │ │
│  • Account ◀ │  └──────────────────────────────────┘ │
│  • Security  │  ┌─ Section: Contact ──────────────┐ │
│  • Notifs    │  │  Email + Secondary email         │ │
│  • Billing   │  └──────────────────────────────────┘ │
│  • Team      │  ┌─ Section: Password ─────────────┐ │
│              │  │  Change password fields          │ │
│              │  └──────────────────────────────────┘ │
│              │  ┌─ Section: Danger Zone ──────────┐ │
│              │  │  Delete account                  │ │
│              │  └──────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────┘
```

---

## Sections

### 1. Settings Sidebar

- **Purpose**: Navigate between settings categories; indicates current section
- **DS Components used**: `NavigationList` or `SidebarNav` (active state on "Account"); `NavItem` for each category
- **Figma key**: `[pending-setup]`
- **Content**: Account, Security, Notifications, Billing, Team (or subset per product tier)
- **Behavior**: Clicking a nav item routes to that settings section. Active item has highlighted/filled state.

---

### 2. Page Header

- **Purpose**: Titles the current settings section
- **DS Components used**: `PageHeader` or `Heading` (H1 / display-sm)
- **Figma key**: `[pending-setup]`
- **Content**: "Account Information" — no subtitle needed unless breadcrumbs are used
- **Behavior**: Static; no actions in the header for this screen

---

### 3. Profile Section

- **Purpose**: Edit display name, username, and avatar photo
- **DS Components used**:
  - `Avatar` (large, editable variant) — with upload overlay on hover
  - `FormField` / `Input` — for Display Name, Username
  - `Button` (primary) — "Save changes"
  - `Button` (secondary/ghost) — "Cancel" (only visible when form is dirty)
  - `HelperText` — under username field ("Used in @mentions and your public profile URL")
- **Figma keys**: `[pending-setup]`
- **Content**:
  - Avatar: current user photo or initials fallback
  - Display Name: "Sarah Chen"
  - Username: "sarahchen"
- **Behavior**:
  - Avatar upload on click/hover (opens file picker, crop modal)
  - Form fields editable inline
  - Save button disabled until form is dirty
  - On save: optimistic update + success Toast

---

### 4. Contact Section

- **Purpose**: View and update email address; add/manage secondary email for recovery
- **DS Components used**:
  - `FormField` / `Input` (with verified badge inline for primary email)
  - `Badge` ("Verified" — success/green variant) inline in email field
  - `Button` (secondary) — "Change email"
  - `Button` (ghost) — "Add recovery email" (if none set)
  - `InlineAlert` (info variant) — "A confirmation will be sent to the new address"
  - `HelperText` — under primary email
- **Figma keys**: `[pending-setup]`
- **Content**:
  - Primary email: "sarah.chen@company.com" + Verified badge
  - Secondary/recovery email: empty or "s.chen@personal.com"
- **Behavior**:
  - Primary email not directly editable inline — requires re-verification flow on change
  - Clicking "Change email" opens a modal or expands an inline form
  - Secondary email optional; can be removed once set

---

### 5. Password Section

- **Purpose**: Let user update their account password
- **DS Components used**:
  - `FormField` / `Input` (password type, with show/hide toggle) × 3
  - `PasswordStrengthIndicator` (if exists in DS, else `ProgressBar` or custom)
  - `Button` (primary) — "Update password"
  - `InlineAlert` (error variant, conditional) — validation errors
- **Figma keys**: `[pending-setup]`
- **Content**:
  - Current password (required)
  - New password
  - Confirm new password
- **Behavior**:
  - All fields masked by default, toggle reveals
  - Strength indicator shown after user starts typing new password
  - Submit disabled until all fields filled and passwords match
  - On success: all fields cleared + success Toast

---

### 6. Danger Zone Section

- **Purpose**: Irreversible destructive actions — account deletion
- **DS Components used**:
  - `Card` (danger/destructive variant, or bordered with danger border-color token)
  - `Text` (body) — explains consequences of deletion
  - `Button` (danger/destructive variant) — "Delete account"
- **Figma keys**: `[pending-setup]`
- **Content**:
  - Heading: "Danger Zone"
  - Body: "Permanently delete your account and all associated data. This action cannot be undone."
  - CTA: "Delete account"
- **Behavior**:
  - Button opens a confirmation modal with typed confirmation (user must type account name)
  - Modal has cancel + confirm (danger) actions

---

## States

| State | Description |
|-------|-------------|
| Default / clean | All fields populated with current data; Save buttons disabled |
| Form dirty | User has edited a field; Save + Cancel buttons enabled |
| Saving | Save button shows loading spinner; fields disabled |
| Save success | Toast notification "Changes saved"; form returns to clean state |
| Save error | Inline error on affected field or InlineAlert above form |
| Loading (initial) | Skeleton loaders in place of form fields while profile data fetches |
| Email unverified | Badge shows "Unverified" (warning variant) next to email; CTA to resend verification |

---

## DS Components Used

> Figma keys marked `[pending-setup]` — to be populated from `registries/components.json` after `/design-workflow setup`.

| Component | Variant/Size | Figma Key | Location |
|-----------|-------------|-----------|----------|
| `Avatar` | Large, editable | `[pending-setup]` | Profile section |
| `Input` | Default, password | `[pending-setup]` | All form sections |
| `FormField` | With label + helper | `[pending-setup]` | All form sections |
| `Button` | Primary, md | `[pending-setup]` | Profile, Contact, Password CTAs |
| `Button` | Secondary/ghost, md | `[pending-setup]` | Cancel + Change email |
| `Button` | Danger, md | `[pending-setup]` | Danger zone |
| `Badge` | Success (Verified) | `[pending-setup]` | Contact section |
| `Badge` | Warning (Unverified) | `[pending-setup]` | Contact section (error state) |
| `InlineAlert` | Info, Error variants | `[pending-setup]` | Contact, Password sections |
| `Toast` | Success, Error | `[pending-setup]` | Global — save feedback |
| `Card` | Danger border variant | `[pending-setup]` | Danger zone |
| `Divider` | Horizontal | `[pending-setup]` | Between sections |
| `Heading` | H2 / section-title | `[pending-setup]` | Section headers |
| `NavigationList` / `SidebarNav` | Default, active state | `[pending-setup]` | Settings sidebar |
| `Modal` | Default | `[pending-setup]` | Email change + Delete confirm |
| `PasswordStrengthIndicator` | — | `[pending-setup]` | Password section |

---

## New DS Components Required

> To be confirmed after `registries/components.json` is available from setup.

| Component Name | Used in Section | Description | Variants Needed |
|---------------|----------------|-------------|-----------------|
| `PasswordStrengthIndicator` | Password | Visual indicator of password strength (weak / fair / strong / very strong). Segmented bar or linear bar with label. Not covered by generic ProgressBar. | strength: weak, fair, strong, very-strong |

**Note:** If `PasswordStrengthIndicator` already exists in the DS, mark as "None". Confirm after setup.

---

## Content Structure

**User: Sarah Chen**

```
Profile
  Display Name:  Sarah Chen
  Username:      sarahchen
  Avatar:        Photo (sarah-avatar.jpg) — fallback: "SC" initials

Contact
  Primary email:    sarah.chen@company.com  [Verified]
  Recovery email:   s.chen@personal.com

Password
  Current password: ••••••••••••
  New password:     [empty]
  Confirm:          [empty]

Danger Zone
  "Permanently delete your account and all associated data."
  [Delete account]
```

---

## Design Tokens

> Token names are semantic placeholders — to be mapped to exact keys from `guides/tokens/` after setup.

### Layout
| Token | Semantic Role | Usage |
|-------|--------------|-------|
| `spacing/layout/sidebar-width` | ~240px | Settings sidebar fixed width |
| `spacing/layout/content-max-width` | ~720px | Content area max-width |
| `spacing/section/gap` | ~32–48px | Gap between form sections |
| `spacing/form/field-gap` | ~16–20px | Gap between form fields within a section |
| `spacing/section/padding` | ~24px | Internal section card padding |

### Colors
| Token | Semantic Role | Usage |
|-------|--------------|-------|
| `color/background/page` | Page background | Main canvas |
| `color/background/surface` | Section card background | Form section cards |
| `color/border/default` | Dividers, field borders | Section dividers, input borders |
| `color/border/danger` | Danger zone card border | Danger section card |
| `color/text/primary` | Body text | Field labels, values |
| `color/text/secondary` | Helper/muted text | Helper text under fields |
| `color/text/danger` | Destructive text | Delete account description |
| `color/interactive/primary` | Primary CTA | Save buttons |
| `color/interactive/danger` | Destructive CTA | Delete account button |
| `color/feedback/success` | Verified badge, success toast | Email verified state |
| `color/feedback/warning` | Unverified badge | Unverified email state |

### Typography
| Token | Semantic Role | Usage |
|-------|--------------|-------|
| `type/heading/lg` or `display-sm` | Page title | "Account Information" H1 |
| `type/heading/md` | Section heading | "Profile", "Contact", "Password", "Danger Zone" |
| `type/body/md` | Field labels, body | Form labels, body copy |
| `type/body/sm` | Helper text, captions | Helper text, field hints |

---

## Responsive Rules

| Breakpoint | Layout change |
|-----------|---------------|
| Desktop (>1024px) | Two-column: 240px sidebar + content area (max 720px, centered) |
| Tablet (768–1024px) | Sidebar collapses to top navigation tabs or a select dropdown; content full-width |
| Mobile (<768px) | Sidebar hidden, replaced by back nav + section title; single-column form; sticky save button at bottom |

---

## Acceptance Criteria

- [ ] Sidebar navigation visible with "Account" item in active state
- [ ] Profile section renders Avatar, Display Name, Username fields with current user data
- [ ] Avatar supports click-to-upload; shows hover overlay affordance
- [ ] Display Name and Username fields are editable inline
- [ ] Save button is disabled when form is in clean state; enabled when dirty
- [ ] Saving triggers loading state on the button; success shows a Toast
- [ ] Primary email displays with Verified / Unverified badge
- [ ] Changing email triggers a confirmation flow (modal or inline), not immediate
- [ ] Password section has 3 fields (current, new, confirm) all masked with toggle
- [ ] Password strength indicator appears once user starts typing in the new password field
- [ ] Update password disabled until all fields populated and new password == confirm
- [ ] Danger Zone section is visually differentiated (danger border / danger background token)
- [ ] Delete account button opens a confirmation modal with typed-confirmation requirement
- [ ] Skeleton loading state shown on initial page load
- [ ] Responsive: sidebar collapses to tabs/select on tablet, hidden on mobile
- [ ] All interactive elements are keyboard accessible (tab order, focus rings)
- [ ] All tokens are bound — no hardcoded hex colors or pixel values

---

## Open Questions

1. **Save pattern**: Per-section save (each section has its own Save button) or a single global "Save changes" button? Recommend per-section for clarity and to reduce risk of losing partial changes.
2. **PasswordStrengthIndicator**: Does the DS already include this component? Confirm after setup.
3. **Avatar crop**: Is there an existing crop/upload modal in the DS, or is it always an external service (e.g., Cloudinary widget)?
4. **Email change flow**: Inline expansion vs. separate modal? Recommend modal to isolate the re-verification flow.
5. **Sidebar scope**: Is the Settings sidebar a shared layout component (re-used across all settings pages) or scoped to this screen only? If shared, it should be specced/designed as a layout component first.
6. **Connected accounts / SSO**: Is there an "Authentication" or "Connected Accounts" section needed (Google, GitHub OAuth)? Not included in this spec — flag for a follow-up screen.
