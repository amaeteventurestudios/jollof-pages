> This roadmap is the source of truth for Jollof Pages build sequencing. Update this file whenever phase status, scope, or build order changes.

# Jollof Pages Master Build Roadmap

## Status Legend

| Color  | Symbol | Meaning                              |
| ------ | -----: | ------------------------------------ |
| Green  |     🟢 | Built / Complete                     |
| Yellow |     🟡 | In Progress / Partially Built        |
| Red    |     🔴 | Immediate Blocker / Needs Action Now |
| Blue   |     🔵 | Planned / Later Phase                |

# Jollof Pages Product Definition

Jollof Pages is continuity and workflow infrastructure for serialized graphic novel creation.

It is not:

* a generic writing app
* a notes app
* a basic AI wrapper
* a generic SaaS dashboard
* a generic author publishing platform

Jollof Pages helps creators keep canon, revisions, scenes, pages, panels, visual state, and production handoff connected so they can execute serialized graphic novels without losing continuity.

The core wedge is:

> Jollof Pages helps graphic novel creators maintain canon, manage revisions, and move from story outline to page and panel execution without losing continuity.

The long-term vision is:

> Jollof Pages starts as continuity and workflow infrastructure for graphic novel creation, then expands into the operating system for visual storytelling teams.

# Current Operating State

| Item                              | Status                          |
| --------------------------------- | ------------------------------- |
| Product definition                | 🟢 Clear                        |
| Visual UI direction               | 🟢 Built from mockups           |
| Next.js app                       | 🟢 Built                        |
| TypeScript                        | 🟢 Working                      |
| Tailwind UI                       | 🟢 Working                      |
| Vercel deployment                 | 🟢 Working                      |
| Mobile responsiveness             | 🟢 Polished                     |
| Desktop full-width cockpit layout | 🟢 Fixed                        |
| Admin/backend audit               | 🟢 Completed                    |
| Admin auth guard                  | 🟢 Added                        |
| Admin pages                       | 🟢 Wired to services            |
| Supabase migrations               | 🟢 Applied                      |
| First workspace                   | 🟢 Created (seed script)        |
| DEMO_WORKSPACE_ID                 | 🔴 Need to set in .env.local and Vercel |
| Live admin data                   | 🔴 Pending DEMO_WORKSPACE_ID    |
| Real wiki CRUD                    | 🔵 Next major build             |
| Real Story OS integration         | 🔵 Later                        |
| Public API layer                  | 🔵 Later                        |
| AI layer                          | 🔵 Later                        |

# Immediate Operating Rule

Do not add major new product features until the live database foundation is active.

Current order:

1. Apply Supabase migrations.
2. Create or seed first workspace.
3. Set `DEMO_WORKSPACE_ID`.
4. Validate admin pages with real data.
5. Generate Supabase types.
6. Then build live Wiki CRUD.
7. Then build canon and story structure systems.

The UI shell is strong enough. The next unlock is live data.

# Core Architecture Rules

## Rule 1: Story OS Is the Source of Truth

All story data must live inside the canonical Story OS structure.

Examples:

```text
series/
books/book_XX/
trackers/
canon/
```

The system must read and write through structured data.

No story fact should exist only in UI state.

## Rule 2: AI Agents Generate, Humans Approve

AI can:

```text
suggest
draft
analyze
warn
organize
map beats
generate panels
validate continuity
extract canon
review pacing
review structure
review character state
generate image options
suggest visual references
```

AI cannot:

```text
approve
lock
overwrite approved canon
silently change continuity
replace the creator’s authority
publish without approval
mark images approved
replace locked reference art
overwrite approved visual canon
```

## Rule 3: Approved Data Is Protected

Objects marked:

```text
approved
locked
```

cannot be overwritten automatically.

Breaking revisions require explicit human approval.

This must be enforced at the service layer, not only in the UI.

## Rule 4: Canonical Story Hierarchy

The core hierarchy is:

```text
Series → Book → Scene → Page → Panel
```

Scenes are the main narrative unit.

Pages are derived from scenes.

Panels belong to pages.

Every reference must resolve to a real object.

Zero dangling references.

# Master Phase Chart

| Phase | Status | Phase Name                              | What It Builds                                                 | Key Features / Details                                                                                                              | Gate Before Moving On                                                              |
| ----: | -----: | --------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
|     0 |     🟢 | Product Direction Lock                  | Locks the product identity                                     | Graphic novel-first positioning, continuity-first workflow, creator authority, AI as production support                             | Product does not drift into a generic writing app                                  |
|     1 |     🟢 | Next.js Product Shell                   | Real app foundation                                            | Next.js, TypeScript, Tailwind, reusable components, routes, mock data, Vercel                                                       | App runs locally and deploys                                                       |
|     2 |     🟢 | Responsive UI / Layout System           | Mobile, tablet, desktop layout                                 | Mobile polish, tablet polish, desktop full-width cockpit, removed narrow constraints                                                | All screens readable and properly laid out                                         |
|     3 |     🟢 | Backend/Admin Foundation Audit          | Admin and backend readiness                                    | Supabase wiring, R2 wiring, helper RPCs, admin auth guard, admin pages, env docs, tests/build                                       | Backend/admin shell ready for live database                                        |
|     4 |     🟢 | Supabase Database Foundation            | Activates live database                                        | Apply migrations `001` through `006`, verify tables, RLS, RPCs, service role                                                        | Live DB exists and works                                                           |
|     5 |     🔴 | Workspace/Auth Ownership Layer          | Creates first real workspace                                   | Set admin env vars, create workspace, seed user/member, set `DEMO_WORKSPACE_ID`, test `/admin`                                      | Admin pages show real workspace data                                               |
|     6 |     🔵 | Live Wiki + Canon System                | First live creative database                                   | Wiki CRUD, tags, canon status, suggested canon queue, confirm/dispute/deprecate canon                                               | User can manage real canon/wiki data                                               |
|     7 |     🔵 | Creator Onboarding                      | Personalized setup flow                                        | Creator type, project type, genre, source material, output goal                                                                     | User lands in correct workspace path                                               |
|     8 |     🔵 | Import or Start Fresh                   | Supports existing and new creators                             | Import file, paste notes, guided builder, blank start, import review queue                                                          | Imported material becomes structured draft data                                    |
|     9 |     🔵 | Guided Story Builder                    | Beginner-friendly story creation                               | Plain-language prompts for character, want, need, flaw, world, trouble, villain, stakes                                             | Beginner can create usable story seed                                              |
|    10 |     🔵 | Creator Mode / Pro Mode                 | Different UX for different users                               | Guided Mode, Creator Mode, Pro Mode, Team Mode                                                                                      | User can choose guidance level                                                     |
|    11 |     🔵 | Visual Format + Style Setup             | Graphic novel visual production defaults                       | Page size, art style, font, reading direction, layout format, panel density, color mode, export intent                              | Project has clear visual production rules                                          |
|   12A |     🔵 | Media Library + Visual Reference System | Upload, generate, attach, version, and reuse visual references | Creator images, covers, character portraits, location refs, object refs, panel refs, moodboards, style samples, AI-generated images | Images can be attached to project objects and used as visual continuity references |
|    12 |     🔵 | AI Assistance Setup                     | Controls how much AI helps                                     | Manual, Assisted, AI Co-Creator                                                                                                     | AI behavior changes by selected mode                                               |
|    13 |     🔵 | AI Agent Permissions                    | Defines what AI can and cannot do                              | Agent-level permissions for Story Coach, Canon Keeper, Scene Writer, Panel Planner, Validator                                       | AI cannot exceed permissions                                                       |
|    14 |     🔵 | Story Framework Registry                | Stores reusable story frameworks                               | Lester Dent, Hero’s Journey, Save the Cat, Story Circle, 40-Beat, Mystery, Fichtean Curve, Scene-Sequel, Custom                     | Frameworks stored as templates                                                     |
|    15 |     🔵 | Framework Beat Library                  | Stores beats inside frameworks                                 | Beat order, beat purpose, beginner explanation, examples                                                                            | Every beat has purpose, order, explanation                                         |
|    16 |     🔵 | Framework Combiner                      | Lets creators mix frameworks                                   | Primary structure, tension engine, character arc, scene engine, page-turn engine                                                    | System can store and apply framework mix                                           |
|    17 |     🔵 | Book / Chapter / Issue Planner          | Defines story length and structure                             | Book, issue, chapter, episode, sequence, scene block, 12/24/32/36/38/40/custom                                                      | Creator can plan flexible structure                                                |
|    18 |     🔵 | Beat Map Generator                      | Maps structure into story units                                | Framework beats to chapters, chapters to scenes, required beat detection                                                            | Required beats mapped with no gaps                                                 |
|    19 |     🔵 | Tension Map Engine                      | Tracks story pressure                                          | Danger, urgency, mystery, betrayal, stakes, conflict, reversal, cliffhanger                                                         | Creator can see tension across book                                                |
|    20 |     🔵 | Story Bible UX                          | Project brain                                                  | Series, books, characters, factions, locations, objects, artifacts, timeline, canon, threads                                        | Story Bible usable from sidebar                                                    |
|    21 |     🔵 | Canon Manager                           | Manages truth state                                            | Suggested, confirmed, disputed, deprecated, locked, revision history, conflict warnings                                             | Canon is protected and reviewable                                                  |
|    22 |     🔵 | Character / Worldbuilding System        | Builds story world database                                    | Character profiles, relationships, factions, locations, artifacts, magic/tech, politics, history                                    | Characters/world are structured for AI and continuity                              |
|    23 |     🔵 | Character State Tracker                 | Tracks character state over time                               | Location, mood, injury, clothing, props, visual condition, costume, blood/injury marks                                              | Visual state persists across scenes/pages/panels                                   |
|    24 |     🔵 | Object / Artifact Tracker               | Tracks important items                                         | Owner, holder, first appearance, last location, object state, scene/page/panel appearances                                          | Objects cannot disappear or move without explanation                               |
|    25 |     🔵 | Faction / Location / Timeline Tracker   | Tracks groups, places, chronology                              | Factions, alliances, locations, visual refs, events, time jumps, sequence                                                           | System catches sequence/location/timeline conflicts                                |
|    26 |     🔵 | Continuity Validator                    | Detects contradictions                                         | Character mismatch, location mismatch, object mismatch, timeline error, canon contradiction, visual state mismatch                  | Critical continuity flags block approval                                           |
|    27 |     🔵 | Canon Extractor                         | Extracts canon from approved scenes                            | Suggested canon entries, source scene link, confidence score, human review status                                                   | Suggested canon enters human review queue                                          |
|    28 |     🔵 | Scene Writer Agent                      | Drafts scenes from structured context                          | Uses scene outline, story engine, beat, canon, character state, prior scene, tension target                                         | Draft references valid canon and remains draft                                     |
|    29 |     🔵 | Page and Panel Generator                | Converts approved scenes into visual plans                     | Page plan, panel descriptions, shot type, camera angle, dialogue, captions, environment, props, art notes                           | Panels match approved scene and page range                                         |
|    30 |     🔵 | Story Coach Panel                       | Gives contextual creative guidance                             | Warns about weak tension, missing antagonist pressure, unresolved mysteries, too much dialogue, missing beats                       | Coach gives advice without changing source data                                    |
|    31 |     🔵 | Character Appearance Matrix             | Tracks who appears where                                       | Character by book, chapter, scene, page, panel, POV, visual focus, antagonist presence                                              | Creator sees character distribution                                                |
|    32 |     🔵 | Heat Maps                               | Visualizes story density and risk                              | Character heat map, villain presence, faction, location, artifact, mystery thread, tension, visual continuity                       | Heat maps generated from live data                                                 |
|    33 |     🔵 | Production Metrics                      | Graphic novel-native analytics                                 | Scene count, page count, panel count, dialogue balloons, captions, SFX, flags, revisions                                            | Metrics update from live project data                                              |
|    34 |     🔵 | Review / Revision System                | Production-grade editorial workflow                            | Comments, suggestions, version history, compare changes, approve/reject AI edits, revision impact                                   | Every meaningful mutation is traceable                                             |
|    35 |     🔵 | LLM Provider Settings                   | Lets advanced users choose AI                                  | Fast/Balanced/Best, OpenAI, Anthropic, Google, OpenRouter, local/custom API                                                         | Provider/model settings secure and workspace-scoped                                |
|    36 |     🔵 | Chat / AI Production Panel              | Project-aware assistant                                        | Chat, Review, Story Coach, Continuity, AI Runs                                                                                      | Chat uses project context safely                                                   |
|    37 |     🔵 | Collaboration Lite                      | Team-ready foundation                                          | Comments, roles, reviewer access, share-ready foundation, approval logs, assignments, audit trail                                   | Solo mode works, team mode has foundation                                          |
|    38 |     🔵 | Export / Production Packager            | Exports approved materials                                     | Production package, character bible, world bible, scene packet, page plan, panel plan, artist handoff, continuity report            | Export blocked by critical unresolved flags                                        |
|    39 |     🔵 | API / Headless Publishing Layer         | Jollof as backend for story sites                              | Public/private API, project API keys, website tokens, published-only endpoints, visibility, slugs                                   | Story websites can read published content                                          |
|    40 |     🔵 | Reusable Story Website Framework        | Shared frontend for story worlds                               | Equanauts first, site config, theme config, trading cards, character/lore/timeline pages, Anteeza adaptation                        | New story sites built from config                                                  |
|    41 |     🔵 | Publishing / Reader Layer               | Laterpress-style public release layer                          | Web reader, serial release planner, chapter/issue scheduling, public story page, invite-only/public visibility                      | Approved stories can be released publicly                                          |
|    42 |     🔵 | Growth / Email / Audience Layer         | Audience-building tools                                        | Email capture, release notifications, beta reader feedback, comments, ratings/reviews, early access                                 | Creators can build audience around stories                                         |
|    43 |     🔵 | Monetization Hooks                      | Future paid story architecture                                 | Free/paid stories, locked chapters, subscriptions, one-time purchase, Stripe later, creator payouts later                           | Architecture can support monetization later                                        |
|    44 |     🔵 | End-to-End Story Test                   | Tests full workflow                                            | Create series, choose story engine, create canon, map beats, draft scenes, validate, approve, generate pages/panels, export         | One real story moves from idea to package                                          |
|    45 |     🔵 | Audit and Hardening                     | Reliability and security pass                                  | RLS, workspace isolation, permissions, audit logs, locked object protection, AI permissions, mock data removal                      | No major mock data remains where live data is needed                               |
|    46 |     🔵 | Private Alpha Polish                    | Make it usable privately                                       | Empty states, examples, tooltips, beginner explanations, errors, loading states, mobile/desktop cleanup, docs                       | Product usable privately end-to-end                                                |

# Detailed Phase 11: Visual Format + Style Setup

## Status

🔵 Planned

## Purpose

Set the visual production defaults for a graphic novel, comic, manga, webcomic, or illustrated story before the story moves into pages and panels.

This phase is important because Jollof Pages is not only helping creators write. It is helping creators build visual stories that must become pages, panels, lettering, art direction, and production-ready handoff materials.

## Features

| Feature                 | Purpose                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Comic / Project Name    | Names the visual story project                                                                                         |
| Format Type             | Defines whether the creator is making a graphic novel, comic issue, manga, webcomic, children’s comic, or pitch packet |
| Page Size               | Defines canvas dimensions                                                                                              |
| Orientation             | Portrait, landscape, or vertical scroll                                                                                |
| Reading Direction       | Left-to-right, right-to-left, or vertical scroll                                                                       |
| Art Style               | Defines the visual direction of the project                                                                            |
| Font / Lettering Style  | Controls dialogue, captions, SFX, and title typography                                                                 |
| Default Panel Density   | Sets expected average panels per page                                                                                  |
| Default Page Count      | Gives an initial production estimate                                                                                   |
| Color Mode              | Color, black-and-white, grayscale, limited palette                                                                     |
| Export Intent           | Print, web, mobile, pitch, artist handoff                                                                              |
| Visual Reference Upload | Allows creator to attach style references                                                                              |
| Style Lock              | Prevents accidental style drift later                                                                                  |

## Visual Format Options

| Format             | Best For                                    | Default Behavior                                                         |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------------ |
| Graphic Novel      | Long-form visual story                      | Page-based planning                                                      |
| Comic Issue        | Serialized issue format                     | Issue/page workflow                                                      |
| Manga-Style Series | Chapter-based visual storytelling           | Manga pacing, right-to-left option, black-and-white defaults if selected |
| Webcomic           | Digital-first web story                     | Flexible web format, can support vertical scroll                         |
| Webtoon            | Mobile vertical reading                     | Long vertical canvas                                                     |
| Children’s Comic   | Younger reader format                       | Larger panels, simpler text, playful design                              |
| Story Pitch Packet | Presenting to artists, partners, publishers | Shorter package, strong visuals                                          |
| Custom             | Advanced users                              | User defines settings manually                                           |

## Page Size Presets

| Preset                | Example Use                  |
| --------------------- | ---------------------------- |
| Webtoon Vertical      | Mobile scroll episodes       |
| Comic Page            | Standard comic-style page    |
| Manga Page            | Black-and-white manga layout |
| Graphic Novel Page    | Book-style page layout       |
| Square Social Preview | Marketing posts              |
| Custom Size           | User-defined dimensions      |

Early pixel presets:

```text
675 × 1050
1120 × 1664
Custom
```

Future print-ready fields:

```text
width_px
height_px
unit
dpi
safe_area
bleed_area
trim_area
```

## Art Style Presets

| Art Style       | Description                                                                                                              | Best For                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Superhero       | Bold, action-packed panels with dynamic characters, dramatic poses, high-impact movement, and strong visual energy.       | Action comics, heroic stories, battles, powers, large-scale conflict                |
| Manga           | Japanese-inspired art with distinctive character designs, expressive faces, cinematic pacing, and strong emotional beats. | Manga-style series, action, romance, fantasy, coming-of-age stories                 |
| Indie           | Experimental, personal, and flexible, often using diverse visual styles, unconventional layouts, and unique themes.       | Auteur stories, literary comics, experimental fiction, personal narratives          |
| Webcomics       | Digital-first format, often vertical scrolling. Styles range from simple sketches to polished illustrations.              | Mobile reading, serialized web stories, creator-owned releases                      |
| European Comics | Detailed artwork, rich colors, strong environments, and high-quality album-style presentation.                            | Adventure, fantasy, historical fiction, sci-fi, literary visual stories             |
| Graphic Novels  | Longer, self-contained visual storytelling with a novel-like structure. Art can range from realistic to highly stylized.  | Full-length graphic novels, memoir, prestige stories, serious fiction               |
| Cartoony Style  | Exaggerated proportions, playful shapes, simple designs, often with small bodies and large heads.                         | Kids comics, humor, light adventure, family-friendly stories                        |
| Realistic Style | Highly detailed and lifelike illustrations, often resembling fine art, film stills, or photography.                       | Drama, historical fiction, crime, grounded sci-fi, serious stories                  |
| Abstract Style  | Simplified or abstract visuals focused on shape, color, mood, symbolism, and minimal detail.                              | Experimental stories, dream sequences, psychological fiction, symbolic storytelling |
| Hybrid Styles   | A mix of traditions, such as manga-inspired Western comics or realistic characters with cartoony effects.                 | Creators with unique visual direction, genre blends, modern web-first stories       |

Art style preset IDs:

```text
style.superhero
style.manga
style.indie
style.webcomics
style.european_comics
style.graphic_novel
style.cartoony
style.realistic
style.abstract
style.hybrid
```

## Font / Lettering Settings

MVP fields:

| Setting              | Purpose                         |
| -------------------- | ------------------------------- |
| Dialogue Font        | Speech balloon lettering        |
| Caption Font         | Narration boxes                 |
| SFX Font             | Sound effects                   |
| Title Font           | Chapter/issue titles            |
| Case Style           | Uppercase, sentence case, mixed |
| Font Size Defaults   | Readability                     |
| Balloon Padding      | Lettering layout                |
| Export Font Handling | Production consistency          |

Important boundary:

Do not share or bundle proprietary/commercial font files with users.

Use font names and settings only unless licensing is properly handled.

# Detailed Phase 12A: Media Library + Visual Reference System

## Status

🔵 Planned

## Purpose

Build a first-class visual reference and media system for Jollof Pages.

This lets users upload, generate, attach, version, review, and reuse images across the project.

This phase is required because graphic novel production depends on visual continuity.

The system must remember:

```text
What does this character look like?
What is the approved costume?
What is the book cover?
What does this location look like?
What does this artifact look like?
What is the selected art direction?
Which image is approved?
Which image is only a draft reference?
```

## Core Media Actions

| Action                  | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| Upload Image            | User uploads image from computer                            |
| Generate Image with AI  | User describes image, AI generates options                  |
| Attach Existing Image   | User selects from Media Library and links it to an object   |
| Version Image           | User uploads or generates a newer version                   |
| Mark Primary            | User marks an image as the primary cover/portrait/reference |
| Review Image            | User approves, rejects, or keeps as draft reference         |
| Reuse Image             | Same image can be linked to multiple objects                |
| Export Image References | Approved references are included in artist handoff packages |

## Asset Types

| Asset Type                | Example Use                                  |
| ------------------------- | -------------------------------------------- |
| Creator profile image     | User/avatar/profile                          |
| Series cover image        | Main series identity                         |
| Series logo/banner        | Public identity and story branding           |
| Book/issue cover image    | Cover art for each book or issue             |
| Character portrait        | Character profile image                      |
| Character turnaround      | Front, side, back visual reference           |
| Costume reference         | Clothing, armor, accessories                 |
| Expression sheet          | Facial expression reference                  |
| Pose reference            | Body/action pose reference                   |
| Location reference        | Cities, rooms, landmarks, worlds             |
| Object/artifact reference | Weapons, devices, symbols, relics            |
| Faction logo              | Group insignia, banners, marks               |
| Page reference            | Layout inspiration                           |
| Panel reference           | Shot/composition reference                   |
| Moodboard image           | Tone, color, atmosphere                      |
| Art style sample          | Used to maintain visual direction            |
| AI-generated image        | Generated from prompt and attached to object |

## Where Images Should Appear

| Jollof Pages Area     | Image Support Needed                            |
| --------------------- | ----------------------------------------------- |
| Creator Profile       | Profile/avatar image                            |
| Series Command Center | Series cover, logo, banner                      |
| Book Dashboard        | Book/issue cover                                |
| Character Profile     | Portrait, turnaround, costume, expression sheet |
| Canon Vault           | Images for canon entries                        |
| Location Pages        | Environment references                          |
| Object/Artifact Pages | Item references                                 |
| Faction Pages         | Logos, uniforms, symbols                        |
| Page Planner          | Page layout references                          |
| Panel Studio          | Panel image references and AI concept images    |
| Story Bible           | Linked visual references                        |
| Export Package        | Include approved references for artist handoff  |

## Media Library Database Additions

| Table / Model             | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `media_assets`            | Stores uploaded and generated image metadata                      |
| `media_asset_links`       | Connects assets to characters, books, scenes, pages, panels, etc. |
| `visual_reference_assets` | Specific references used for visual continuity                    |
| `ai_generated_assets`     | Tracks images generated by AI                                     |
| `asset_versions`          | Tracks updated versions of images                                 |
| `asset_collections`       | Moodboards, style boards, character boards                        |
| `asset_usage_logs`        | Tracks where each image is used                                   |

## `media_assets` Fields

```text
id
workspace_id
project_id
asset_type
source_type
file_name
file_url
storage_key
mime_type
width
height
file_size
alt_text
description
tags
approval_status
is_primary
created_by_user_id
created_by_agent_id
created_at
updated_at
```

## `source_type`

```text
uploaded
ai_generated
imported
external_reference
```

## `asset_type`

```text
profile_image
series_cover
series_logo
series_banner
book_cover
character_portrait
character_turnaround
costume_reference
expression_sheet
pose_reference
location_reference
object_reference
artifact_reference
faction_logo
page_reference
panel_reference
moodboard
style_sample
generated_concept
```

## `approval_status`

```text
draft
suggested
approved
rejected
locked
deprecated
```

## `media_asset_links` Fields

```text
id
workspace_id
asset_id
linked_object_type
linked_object_id
relationship_type
is_primary
created_at
```

## `linked_object_type`

```text
user_profile
series
book
chapter
scene
page
panel
character
location
object
artifact
faction
canon_entry
style_profile
visual_format_profile
```

## `relationship_type`

```text
cover
portrait
reference
mood
style
turnaround
costume
expression
pose
layout
panel_composition
continuity_reference
logo
banner
```

## AI Image Generation Rules

AI image generation must follow the same human-control principle:

```text
AI can generate image options.
AI can suggest visual references.
AI can attach generated images as drafts.
AI cannot mark images as approved.
AI cannot replace locked reference art.
AI cannot overwrite approved visual canon.
```

## Storage Rules

Use the existing Cloudflare R2 direction.

Assets should be stored in the Jollof Pages asset bucket.

Do not store raw image files directly in Supabase tables.

Supabase should store metadata and storage keys.

## Media Safety / Validation

The Media Library should eventually validate:

```text
file type
file size
dimensions
workspace ownership
linked object exists
R2 upload success
R2 public/private URL behavior
asset approval status
```

# Visual Production Settings Database Additions

| Model / Table             | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `visual_format_profiles`  | Stores format type, page size, orientation, and reading direction |
| `page_size_presets`       | Stores reusable page/canvas sizes                                 |
| `art_style_presets`       | Stores visual style options                                       |
| `project_visual_settings` | Stores selected visual defaults per project/book                  |
| `lettering_profiles`      | Stores font and typography choices                                |
| `export_format_profiles`  | Stores print/web/mobile/export intent                             |
| `visual_reference_assets` | Stores uploaded visual references                                 |
| `style_locks`             | Tracks locked visual decisions                                    |

## `project_visual_settings` Fields

```text
id
workspace_id
project_id
series_id
book_id
format_type
page_width
page_height
page_unit
dpi
orientation
reading_direction
default_art_style_id
lettering_profile_id
color_mode
default_panels_per_page
export_intent
is_locked
created_at
updated_at
```

## `art_style_presets` Fields

```text
id
name
description
best_for
sample_image_url
style_tags
is_system_preset
created_by_user_id
created_at
updated_at
```

## `lettering_profiles` Fields

```text
id
workspace_id
project_id
dialogue_font
caption_font
sfx_font
title_font
default_font_size
case_style
balloon_padding
created_at
updated_at
```

# Suggested `art_style_presets` Seed Data

| ID                      | Name            | Tags                                                |
| ----------------------- | --------------- | --------------------------------------------------- |
| `style.superhero`       | Superhero       | bold, dynamic, action, heroic, dramatic             |
| `style.manga`           | Manga           | expressive, cinematic, Japanese-inspired, emotional |
| `style.indie`           | Indie           | experimental, personal, unconventional, creator-led |
| `style.webcomics`       | Webcomics       | digital-first, flexible, serialized, web-native     |
| `style.european_comics` | European Comics | detailed, colorful, album-style, environmental      |
| `style.graphic_novel`   | Graphic Novels  | long-form, literary, structured, prestige           |
| `style.cartoony`        | Cartoony Style  | playful, exaggerated, simple, expressive            |
| `style.realistic`       | Realistic Style | detailed, lifelike, grounded, cinematic             |
| `style.abstract`        | Abstract Style  | symbolic, minimal, shape-driven, mood-driven        |
| `style.hybrid`          | Hybrid Styles   | blended, mixed-influence, flexible, modern          |

# How Visual Format and Media Connect to Page and Panel Generation

When the Page and Panel Generator runs, it should read:

```text
Story engine
Scene content
Character state
Page size
Art style
Reading direction
Panel density
Lettering settings
Color mode
Export intent
Approved visual references
Draft visual references
Character portraits
Location references
Object references
```

## Example Effects

| Setting                     | AI / Planner Effect                                           |
| --------------------------- | ------------------------------------------------------------- |
| Webtoon format              | Generates vertical scrolling sequences                        |
| Manga style                 | Uses manga pacing and panel rhythm                            |
| Superhero style             | Suggests dynamic poses, impact panels, splash pages           |
| European Comics style       | Encourages detailed environments and rich establishing panels |
| Cartoony style              | Suggests simpler staging and exaggerated expressions          |
| Realistic style             | Encourages grounded staging and lifelike composition          |
| Abstract style              | Allows symbolic layouts and mood-driven panels                |
| Kids format                 | Suggests fewer panels, clearer expressions, larger text       |
| High panel density          | Warns about crowded pages                                     |
| Right-to-left reading       | Adjusts panel flow                                            |
| Dialogue-heavy page         | Warns about balloon crowding                                  |
| Approved character portrait | Used as visual continuity reference                           |
| Approved location image     | Used for environment consistency                              |
| Approved object reference   | Used to preserve object design                                |

# Visual Format and Media Continuity Rules

| Rule                        | Warning Example                                                              |
| --------------------------- | ---------------------------------------------------------------------------- |
| Art style drift             | “This page uses a different visual style than the book default.”             |
| Reading direction mismatch  | “Panel flow may conflict with selected reading direction.”                   |
| Page size mismatch          | “Page 12 uses a different canvas size than the book.”                        |
| Font mismatch               | “Dialogue font differs from project lettering profile.”                      |
| Panel density spike         | “This page has 11 panels. Your book average is 5.”                           |
| Text crowding               | “Dialogue may exceed safe balloon space.”                                    |
| Color mode mismatch         | “This panel uses full-color notes, but the book is set to black-and-white.”  |
| Export mismatch             | “This page may not fit the selected print/web/mobile export target.”         |
| Character reference missing | “This character has no approved portrait or visual reference.”               |
| Costume reference missing   | “This scene requires a costume state, but no costume reference is attached.” |
| Location reference missing  | “This location has no approved environment reference.”                       |
| Object reference missing    | “This object appears in a panel, but no visual reference exists.”            |
| Locked reference conflict   | “This generated image conflicts with a locked visual reference.”             |

# Production Metrics Additions

Add these metrics to Phase 33: Production Metrics.

| Metric                        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| Page size                     | Tracks production format                               |
| Average panels per page       | Pacing and art workload                                |
| Dialogue balloons per page    | Lettering density                                      |
| Caption boxes per page        | Narration density                                      |
| SFX count                     | Lettering/art workload                                 |
| Visual style consistency      | Flags style drift                                      |
| Format readiness              | Print/web/mobile readiness                             |
| Page overflow warnings        | Detects too much text/panel content                    |
| Safe area warnings            | Prevents important content from being cut off          |
| Reading direction consistency | Keeps panel flow aligned                               |
| Reference coverage            | Shows which objects have approved references           |
| Missing visual references     | Highlights characters/locations/objects without images |
| AI-generated draft assets     | Tracks generated but unapproved visuals                |

# Story Coach Additions

Add these visual-format and media coaching checks to Phase 30: Story Coach Panel.

| Story Coach Check           | Example                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual style clarity        | “Your selected style is Hybrid, but your panel notes are switching between realistic and cartoony. Do you want to define a clearer style rule?” |
| Panel overcrowding          | “This page has too many actions for the selected page size.”                                                                                    |
| Webtoon pacing              | “This scene may need more vertical spacing for a mobile scroll format.”                                                                         |
| Manga flow                  | “This action sequence may need clearer right-to-left panel direction.”                                                                          |
| Superhero pacing            | “This would be a good place for a splash panel or impact frame.”                                                                                |
| European detail             | “This location may need an establishing panel to support the selected visual style.”                                                            |
| Kids readability            | “Dialogue may be too dense for the selected children’s comic format.”                                                                           |
| Missing character reference | “This character appears in 6 scenes but has no approved visual reference.”                                                                      |
| Missing location reference  | “This location appears in 4 scenes but has no environment image.”                                                                               |
| Draft image not approved    | “This panel uses a draft AI-generated image. Approve or replace it before export.”                                                              |

# Updated Onboarding Flow

Add Visual Format + Style Setup and Media Library prompts into onboarding.

| Step | Screen            | Question                                                |
| ---: | ----------------- | ------------------------------------------------------- |
|    1 | Project Type      | What are you creating?                                  |
|    2 | Creator Type      | What best describes you?                                |
|    3 | Source Material   | Do you already have material?                           |
|    4 | Visual Format     | What format are you making?                             |
|    5 | Art Style         | What should it look like?                               |
|    6 | Lettering         | What lettering style should the project use?            |
|    7 | Visual References | Do you want to upload or generate reference images now? |
|    8 | Story Type        | What kind of story is this?                             |
|    9 | AI Help           | How much AI help do you want?                           |
|   10 | Story Engine      | Choose or combine story frameworks                      |

# Project Settings Pages

Add these workspace settings pages later.

| Settings Page                    | Purpose                                            |
| -------------------------------- | -------------------------------------------------- |
| Project Settings → Visual Format | Format, page size, orientation, reading direction  |
| Project Settings → Art Style     | Selected art style, style references, style lock   |
| Project Settings → Lettering     | Fonts, case style, balloon settings                |
| Project Settings → Media Library | Uploaded/generated assets, references, collections |
| Project Settings → Export        | Print, web, mobile, pitch, production package      |

# Updated Database / Schema Chart

| Group             | Models / Tables                                                                                                                                                                         | Purpose                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Onboarding        | `creator_profiles`, `project_setup_profiles`, `onboarding_steps`, `import_sessions`                                                                                                     | Store creator type, project type, source mode, onboarding progress                        |
| Visual Production | `visual_format_profiles`, `page_size_presets`, `art_style_presets`, `project_visual_settings`, `lettering_profiles`, `export_format_profiles`, `visual_reference_assets`, `style_locks` | Store page size, art style, font, reading direction, export intent, and visual references |
| Media Library     | `media_assets`, `media_asset_links`, `ai_generated_assets`, `asset_versions`, `asset_collections`, `asset_usage_logs`                                                                   | Store uploaded/generated image metadata, relationships, versions, and usage               |
| Story Engine      | `story_frameworks`, `framework_beats`, `story_engine_profiles`, `framework_combinations`, `book_structure_profiles`, `chapter_beats`, `scene_beats`, `tension_maps`                     | Store Lester Dent, 40-Beat, Hero’s Journey, framework combinations, beat maps             |
| AI                | `ai_assistance_profiles`, `agent_permissions`, `ai_provider_settings`, `ai_model_profiles`, `ai_runs`, `story_coach_notes`                                                              | Store AI modes, provider/model choices, permissions, agent runs, coaching notes           |
| Canon / Wiki      | `wiki_pages`, `canon_entries`, `canon_links`, `canon_revisions`, `canon_review_queue`                                                                                                   | Store confirmed/suggested/disputed/deprecated canon and wiki content                      |
| Story Structure   | `series`, `books`, `chapters`, `issues`, `scenes`, `pages`, `panels`                                                                                                                    | Store the Series → Book → Scene → Page → Panel hierarchy                                  |
| Character / World | `characters`, `relationships`, `factions`, `locations`, `objects`, `artifacts`, `timeline_events`, `world_rules`                                                                        | Store story world and character context                                                   |
| Continuity        | `character_appearances`, `character_visual_states`, `object_appearances`, `location_appearances`, `continuity_flags`                                                                    | Track continuity across scenes/pages/panels                                               |
| Analytics         | `heat_map_snapshots`, `production_metrics`, `review_reports`                                                                                                                            | Store heat maps, production metrics, and review outputs                                   |
| Publishing Hooks  | `publication_status`, `release_schedule`, `reader_visibility`, `export_targets`, `story_page_slug`, `audience_list_id`, `monetization_mode`, `custom_domain_config`                     | Prepare future publishing, audience, and monetization layers                              |

# Updated Build Order From Here

| Order | Status | Build Item                                    | Why It Comes Next                                                                    |
| ----: | -----: | --------------------------------------------- | ------------------------------------------------------------------------------------ |
|     1 |     🟢 | Apply Supabase migrations `001` through `006` | Done 2026-06-01                                                                      |
|     2 |     🟢 | Create/seed first workspace                   | Done — workspace `1dcf06ea-cf55-4a95-96a6-4d981bd73c5d`                             |
|     3 |     🔴 | Set `DEMO_WORKSPACE_ID` locally and in Vercel | Required for workspace-scoped services                                               |
|     4 |     🔴 | Test `/admin` with real data                  | Confirms backend is live                                                             |
|     5 |     🔴 | Generate Supabase types                       | Keeps TypeScript aligned with DB                                                     |
|     6 |     🔵 | Build real Wiki CRUD                          | First major live creative feature                                                    |
|     7 |     🔵 | Build Canon Manager                           | Protects story truth                                                                 |
|     8 |     🔵 | Add onboarding/import flow                    | Makes product usable for new and advanced creators                                   |
|     9 |     🔵 | Add Visual Format + Style Setup               | Adds page size, art style, fonts, reading direction, visual rules                    |
|    10 |     🔵 | Add Media Library + Visual Reference System   | Adds image upload, AI generation, attachments, versions, visual reference management |
|    11 |     🔵 | Add Story Engine + AI Assistance UX           | Adds Lester Dent, 40-Beat, framework combiner, AI modes                              |
|    12 |     🔵 | Add Story Bible + structure planner           | Connects canon to story planning                                                     |
|    13 |     🔵 | Add character/worldbuilding system            | Builds continuity substrate                                                          |
|    14 |     🔵 | Add beat maps + tension maps                  | Makes story structure actionable                                                     |
|    15 |     🔵 | Add AI permissions + provider settings        | Prepares controlled AI layer                                                         |
|    16 |     🔵 | Add Story Coach + AI panel                    | Adds guided AI help                                                                  |
|    17 |     🔵 | Add scene/page/panel generation               | Core graphic novel workflow                                                          |
|    18 |     🔵 | Add review/revision/export                    | Production-grade workflow                                                            |
|    19 |     🔵 | Add API/headless publishing hooks             | Future story websites                                                                |
|    20 |     🔵 | Add publishing/growth/monetization hooks      | Future public platform layer                                                         |

# Updated 90-Day Private Foundation Chart

| Month   |    Week | Focus                                   | Main Deliverables                                                                                                                                 |
| ------- | ------: | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Month 1 |  Week 1 | Database activation                     | Apply migrations, seed workspace, set `DEMO_WORKSPACE_ID`, validate admin                                                                         |
| Month 1 |  Week 2 | Live Wiki + Canon                       | Wiki CRUD, canon status, suggested canon queue                                                                                                    |
| Month 1 |  Week 3 | Onboarding + Import                     | Creator onboarding, import/start fresh, guided builder                                                                                            |
| Month 1 |  Week 4 | Visual Format + Media + Story Engine UX | Page size, art style, fonts, media library, upload/generate/attach references, Lester Dent, 40-Beat, Hero’s Journey, framework combiner, AI modes |
| Month 2 |  Week 5 | Story Engine + Visual + Media Schema    | Framework tables, beat tables, visual production tables, media tables, AI profile tables, permissions                                             |
| Month 2 |  Week 6 | Structure Planning                      | Chapter/issue planner, beat maps, tension maps                                                                                                    |
| Month 2 |  Week 7 | Character + World                       | Character records, factions, locations, objects, world rules                                                                                      |
| Month 2 |  Week 8 | Continuity Intelligence                 | Character matrix, visual continuity, heat maps, production metrics, continuity dashboard                                                          |
| Month 3 |  Week 9 | AI Foundation                           | LLM provider settings, AI permissions, AI chat panel                                                                                              |
| Month 3 | Week 10 | AI Agents                               | Continuity Validator, Canon Extractor, Scene Writer                                                                                               |
| Month 3 | Week 11 | Page/Panel + Export                     | Page/Panel Generator, Review/Revision, Production Packager                                                                                        |
| Month 3 | Week 12 | End-to-End Polish                       | Full story test, audit, hardening, docs, commit, push                                                                                             |

# Updated 10-Prompt Implementation Chart

Because Phase 12A is now added, update the implementation chart to 10 prompts.

| Prompt | Status | Scope                                                                                                         | Expected Result                                                         |
| -----: | -----: | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
|      1 |     🔵 | Audit current app against expanded roadmap                                                                    | Clear gap report                                                        |
|      2 |     🔴 | Apply migrations, seed workspace, validate admin                                                              | Live DB foundation active                                               |
|      3 |     🔵 | Build live Wiki CRUD and Canon Manager                                                                        | Real canon/wiki system                                                  |
|      4 |     🔵 | Add onboarding and import/start-fresh UX                                                                      | Creator setup flow                                                      |
|      5 |     🔵 | Add Visual Format + Style Setup                                                                               | Page size, art style presets, fonts, reading direction, format settings |
|      6 |     🔵 | Add Media Library + Visual Reference System                                                                   | Upload/generate/attach/version image references                         |
|      7 |     🔵 | Add Story Engine, framework combiner, AI Assistance UX                                                        | Lester Dent, 40-Beat, AI modes                                          |
|      8 |     🔵 | Add Story Bible, outline planner, chapter/issue planner UX                                                    | Structure planning UI                                                   |
|      9 |     🔵 | Add schema support for visual settings, media assets, frameworks, beats, AI profiles, permissions             | Database supports new UX                                                |
|     10 |     🔵 | Add beat maps, tension maps, character matrix, heat maps, metrics, Story Coach, live data audit, commit, push | Integrated private foundation                                           |

# Immediate Next Step

The immediate next step does not change.

## Phase 4 Status: 🟢 Complete

Applied 2026-06-01. All 6 migrations ran successfully via Supabase SQL Editor.

**Verified:**
- All tables from migrations 001–006: ✅ present
- RLS enabled on all tables: ✅
- Service role access: ✅
- Helper RPCs (006): ✅ all 9 functions exist
- Project: ✅ Jollof Pages (`gsxuezwxmgbrgaaplyza`)
- First workspace seeded: ✅ `1dcf06ea-cf55-4a95-96a6-4d981bd73c5d` (Jollof Pages)
- Auth user created for admin email

**Remaining for Phase 5:**
- Set `DEMO_WORKSPACE_ID=1dcf06ea-cf55-4a95-96a6-4d981bd73c5d` in `.env.local`
- Set same value in Vercel environment variables
- Test `/admin` loads real workspace data

## Phase 4: Apply Supabase Migrations

Run the six migrations in order:

```text
001_identity_workspaces.sql
002_story_containers.sql
003_wiki_system.sql
004_planning_boards_workflow.sql
005_assets_jobs_events.sql
006_helper_functions.sql
```

Then verify:

| Check                      | Needed |
| -------------------------- | ------ |
| Tables exist               | Yes    |
| RLS enabled                | Yes    |
| RPC helper functions exist | Yes    |
| Admin service role works   | Yes    |
| First workspace exists     | Yes    |
| `DEMO_WORKSPACE_ID` set    | Yes    |
| `/admin` loads real data   | Yes    |

After that, move to:

```text
Phase 6: Live Wiki + Canon System
```

Then add:

```text
Creator Onboarding
Import / Start Fresh
Visual Format + Style Setup
Media Library + Visual Reference System
Story Engine + AI Assistance
```

# Final Product Boundary

Jollof Pages may eventually support publishing, readers, websites, audience growth, and monetization.

But the private foundation build must stay focused on:

```text
graphic novels first
canon
continuity
scene-to-page workflow
page-to-panel execution
visual style setup
media library
image upload
AI-generated visual references
lettering setup
page size and format setup
visual storytelling
revision-aware production
creator-controlled AI
human approval authority
production export
```
