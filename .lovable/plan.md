

## Redesign "Hướng dẫn Mint FUN Money từ A đến Z"

### Current Issues
1. The guide is a single long vertical timeline inside a collapsible card -- dense and overwhelming
2. All 9 steps are listed linearly with small text, making it hard to scan
3. The 3-phase structure (Setup / Earn / Claim) is indicated only by dot colors -- not visually distinct enough

### Proposed New Design

Restructure into a **3-phase tab/accordion layout** with clear visual separation:

**Layout: 3 horizontal phase cards (on desktop) / stacked (on mobile)**

Each phase becomes its own visually distinct card:
- **Phase 1 "Thiết lập"** (blue): Steps 1-4 with blue accent
- **Phase 2 "Tích lũy"** (amber): Steps 5-6 with amber accent  
- **Phase 3 "Nhận FUN"** (green): Steps 7-9 with green accent

Each phase card contains:
- Phase header with icon + number badge showing step count
- Compact step list with icon + title only (descriptions expand on click)
- Action buttons/links inline

**Additional changes:**
- Keep the Epoch info banner at the top but make it more compact
- Remove the collapsible wrapper -- show the 3 phase cards directly (less hiding = better discoverability)
- Use `Tabs` component for phase switching on mobile to save space
- Steps within each phase use a clean checklist style instead of timeline dots

### Files to modify
- `src/components/mint/MintGuideFullFlow.tsx` -- Complete redesign of the component layout

### Technical approach
- Use responsive grid: `grid-cols-1 md:grid-cols-3` for the 3 phase cards
- Each step inside a phase is a mini-collapsible (click title to see description + tips)
- Phase card headers use gradient backgrounds matching phase colors
- Keep all existing data (steps, tips, links, contract address) -- just restructure the presentation

