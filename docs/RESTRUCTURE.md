# Frontend restructure list

From the 2026-11-12 review. Separate from `FRONTEND-GAPS.md` (performance,
dead files, codemod leftovers, error pages) — nothing here repeats it.

**When:** the admin items (§1–§3) are done *during* the API rewire, slice by
slice — rewriting a page to call the API is the cheapest moment to also move
it onto the shared pieces. The public-site items (§4–§5) wait for phase F1.

Status: ☐ to do · ☑ done

---

## 1. Delete, don't port — screens for sign-in flows we no longer use ✅ done 2026-11-13

Sign-in is now username + password, and invites are a link the admin sends.
The emailed-code sign-in, email verification and domain allowlist are gone
from the backend, so their screens and helpers go too (in the auth slice):

- ☑ `app/admin/signin/code/*`, `app/admin/signin/code/verify/route.ts`
- ☑ `app/admin/verify/*`, `(protected)/VerifyBanner.tsx`, the verification row in `settings/page.tsx` and `sendVerificationEmail`
- ☑ The emailed second-factor code in `admin/invite/[token]/actions.ts`
- ☑ `ALLOWED_DOMAINS` in `settings/team/*`
- ☑ `lib/auth/{allowlist,attempts,code,email,mailer,verify,remember,lookup,origin}.ts` and their tests; `auth.ts`
- ☑ Replace with: one username + password form, and an invite-accept form (username, name, password)

## 2. Shared admin building blocks — `components/admin/`

Each list/edit page today builds its own copy of the same pieces.

| ☐ | Shared piece | Replaces |
|---|---|---|
| ☐ | `<StatusTabs>`, `<SearchBox>`, `<FilterBar>`, `<Pager>`, `<EmptyState>`, `buildListHref()` | 6 local `Tab`s, 4 query builders, 4 search forms, 8 empty states, 8 local `Topbar` wrappers; paging exists only on posts |
| ☐ | `<FlashMessage>` + `makeMessages()` | The ok/error banner in 15 pages and 7 near-identical `messages.ts` files |
| ☐ | `<RowMenu items=[…]>` + `icons.tsx` | 4 `RowMenu.tsx` copies + 2 inline menus; ~140 inline SVGs (the pencil icon alone ×6) |
| ☐ | `<PublishToggle>` | Show/hide form repeated in reviews, popups, team |
| ☐ | `<ReorderButtons>` (calls the API's `PUT …/order`) | Hand-written move up/down forms; the swap logic in 3 `actions.ts` (the backend owns ordering now) |
| ☐ | `<ConfirmDialog>` everywhere | 3 different confirm styles (URL `?del=`, dialog, required checkbox) |
| ☐ | `<ImageUploadField>` (Cloudinary signed upload, preview, remove) | `posts/ImageField` (borrowed by popups), `MemberForm`'s own copy, unused `team/PhotoField.tsx` |
| ☐ | Move generic pickers to `components/admin/` | `AuthorDropdown`, `CategoryDropdown`, `DatePicker` (~760 lines of CSS) live in the posts folder |
| ☐ | `getAdmin()` returning the user + capability flags | `mayEdit = canEditContent(user.role)` repeated in ~12 pages |

## 3. One way to talk to the API — `lib/api/`

Today: 110 hand-written `formData.get(...)` calls in 9 `actions.ts`, 13
copies of redirect helpers, and 3 different submit styles.

- ☑ `lib/api/client.ts` (+ `server.ts`, `errors.ts`, `types.ts`) — typed `get/post/patch/put/delete`; forwards the admin's session cookie; throws `ApiError { status, message, issues }`
- ☐ `lib/api/<module>.ts` — one small file per backend module (faq, posts, …)
- ☐ `useApiForm()` + `<Field>` — submits, shows each backend validation message under its input (the API returns `issues: [{ path, message }]`)
- ☐ Most `messages.ts` error codes disappear; keep wording only for not-found / conflict
- ☐ Publish checklists: the API returns `missing[]`; keep the client copy only for the live checklist while typing

## 4. Remove or fix things that look like features but do nothing

- ☑ The topbar **search box** (no form, no handler — shown on 29 pages) → remove, or build real search later
- ☑ The topbar **bell** (no handler, dot always lit) → remove until notifications exist
- ☑ Unused: `addFaqItem` (faq/actions.ts), `moveTeamMember` (team/actions.ts), `team/PhotoField.tsx`, `settings/team/InfoTooltip.tsx` (2-line re-export)
- ☐ "Not connected to the public site yet" banner on the catalog page — remove when rates are wired
- ☐ "No database configured" notices (15 pages, 32 checks) → gone with the API; replaced by `error.tsx` (FRONTEND-GAPS D)

## 5. Public site (phase F1)

- ☐ `<FaqBlock ids>` from the CMS replaces the hardcoded 5-question FAQs on `/pricing`, `/qualify`, `/how-it-works`
- ◐ Booking URL now comes from one place (`BOOK_URL`, enforced by a test) — a shared `<BookCallButton placement>` component is still open (HomeHero has its own copy; Header, MobileNav, pricing hand-write the anchor)
- ☐ One `components/ui/Dialog` for the 4 modal implementations (booking, contact, popups, admin)
- ☑ ~~Move `useRail`~~ — not needed: only the two services rails use it (used by team, blog and interview rails)
- ☑ Data out of `components/`: `services/directory.tsx` and `how-it-works/phases.ts` → `lib/content/` (service data is split across 3 files today)

## 6. Naming and folders

- ☑ Rename admin `settings/team` → `settings/users` (it's admin accounts; "Team" is the public staff list) — matches the backend `users` module
- ☐ `lib/rates/getPublishedTiers.ts` → `lib/rates/content.ts` like the other loaders (or just `lib/api/catalog.ts` after the rewire)
- ☐ Two different `FaqAccordion` components (home + admin) → rename one
- ☐ Shared admin primitives loose in `(protected)/` (`MenuButton`, `ModalDialog`, `ConfirmDialog`, `InfoTooltip`, `RequiredMark`) → `components/admin/`
