# Project Purpose

This is a personal budgeting web application built specifically for my wife and me. The primary goal is not commercial viability or multi-tenant user scaling, but rather friction-free ease of use and a tailored UX designed around our exact financial workflow. It helps us track spending, monitor savings, and maintain our budget.

## Design Principles

### Clean Aesthetic & High Scannability
While the application is private, it must maintain a professional visual standard. Prioritize core design fundamentals: consistent alignment, purposeful whitespace, visual hierarchy, and proximity. The UI should look like a premium fintech dashboard but remain ultra-focused.

### Minimum Friction, Maximum Speed
Because this is built to be used daily by us, minimizing user friction is paramount:
* **One-Click Actions:** Access to common tasks (like adding an expense) should be as close to zero-clicks as possible (e.g., using preset quick-select category chips).
* **Smart Defaults:** Input forms should automatically default to the current date and common fallback values to eliminate repetitive typing.

### Clean, Consistent, and Predictable Code
Code must be organized, highly readable, and closely adhere to existing layout patterns. AI-generated changes should lean toward:
* Straightforward, readable implementations over complex, dry abstractions.
* Highly semantic, expressive variable and component naming.
* Maintaining a single state architecture where data cleanly cascades to child components.

### Pragmatic Security & Data Integrity
We do not expect external users, but we are storing our private financial history and savings goals. 
* **Baseline Security:** Ensure secure handling of API routes, no hardcoded secrets, and safe parsing of financial floats.
* **No UX Disruption:** Do not implement high-friction security loops like multi-factor authentication (MFA) or aggressive session timeouts that disrupt daily usage.

### Traceability for AI-Initiated Actions
Every modification should leave a clean trail. Pull requests, code comments, and documentation adjustments must explicitly reveal the *intent* behind architectural and behavioral decisions.

## Guidance for Future AI Work
When suggesting changes, always prioritize user velocity and clean UI presentation. Avoid massive architectural shifts, unnecessary third-party package dependencies, or refactoring stable code unless explicitly requested.