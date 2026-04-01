You are a senior staff-level software engineer, UI/UX architect, and performance engineer.

Your task is to perform a **deep, production-grade audit** of my entire application (GS Center – a Windows system optimization + monitoring tool).

⚠️ IMPORTANT CONTEXT:

* This is a **highly polished, working application** used for system performance control, tweaks, diagnostics, and monitoring.
* You must **NOT break working logic** or suggest destructive refactors without strong justification.
* Assume the codebase is **large, multi-page, and production-ready** (likely Electron / React / TSX / Web-based UI).
* Your goal is **precision optimization, cleanup, and improvement — not rewriting everything**.

---

## 🔍 PHASE 1 — FULL CODEBASE ANALYSIS

Carefully scan and analyze:

### 1. Structure & Architecture

* Folder structure (components, pages, services, utils)
* Separation of concerns
* State management patterns
* Reusability of components
* Dead or duplicated architecture patterns

### 2. Unused / Redundant Code (CRITICAL)

Identify and list:

* Unused variables
* Unused functions
* Unused imports
* Dead components
* Unused hooks
* Unused services / API calls
* Unused CSS classes / styles
* Duplicate logic across files
* Deprecated patterns

For each item:

* Show file location
* Explain why it's unused
* Confirm if safe to delete
* Risk level (LOW / MEDIUM / HIGH)

---

### 3. UI / UX Audit (Based on Provided Screens)

Review ALL pages:

* Dashboard (System Details)
* Tweaks Page
* Network Diagnostics
* Any inferred pages (Apps, Utilities, Disk, etc.)

Evaluate:

* Visual hierarchy
* Information density
* Accessibility
* Consistency (spacing, typography, colors)
* UX friction points
* Missing affordances
* Over-engineered UI elements

Suggest:

* Specific improvements (not generic advice)
* Micro-interactions
* UX simplifications

---

### 4. Performance Audit

Check for:

* Unnecessary re-renders
* Inefficient state updates
* Heavy components
* Memory leaks
* Improper event listeners
* Blocking operations on UI thread
* Overuse of effects

Suggest:

* Concrete optimizations
* Code-level fixes
* Measurable improvements

---

### 5. Security & Stability Review

* Dangerous system-level tweaks
* Missing safeguards
* Lack of rollback protection
* Error handling gaps
* Edge cases that can break Windows configs

---

### 6. Code Quality

* Naming conventions
* Consistency
* Readability
* Maintainability
* Type safety (if TS/TSX used)

---

## 🧪 PHASE 2 — SAFE CLEANUP PLAN

Produce a **step-by-step SAFE CLEANUP STRATEGY**:

* What to remove first (low-risk)
* What to test after each step
* How to validate nothing breaks
* Rollback strategy

---

## 🚀 PHASE 3 — FEATURE & PRODUCT IMPROVEMENTS

Based on:

* Current features
* Industry-leading tools
* Gamer expectations

Suggest:

### A. Missing Features

### B. High-impact upgrades

### C. Advanced / “Pro-tier” features

### D. AI-driven ideas

### E. Competitive differentiation

---

## 📊 PHASE 4 — PRIORITIZED ROADMAP

Output:

* HIGH impact / LOW effort
* HIGH impact / HIGH effort
* LOW impact items

---

## 🧠 OUTPUT FORMAT

Be EXTREMELY structured:

1. Critical Issues
2. Unused Code Report
3. UI/UX Improvements
4. Performance Fixes
5. Security Risks
6. Cleanup Plan
7. Feature Suggestions
8. Final Verdict

---

## ⚠️ FINAL RULES

* Be brutally honest but precise
* Avoid generic advice
* Do NOT assume — verify
* Do NOT remove anything unless confident it's unused
* Think like a senior engineer reviewing production software

Take your time. This is a full deep audit.