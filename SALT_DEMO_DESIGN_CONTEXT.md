# SALT Demo Design Foundations

Durable product and UX context for AI-assisted design and implementation.

This document defines the stable principles that should guide the SALT customer demo over time. It is intentionally independent of any current wireframe, component structure, fixture, visual style, or interaction pattern.

## 1. Purpose

The SALT customer demo exists to help a prospective customer understand:

- where SALT can fit within an existing product workflow;
- what changes when SALT is introduced;
- why that change may be useful to the host product or its users; and
- what a credible next step or pilot could validate.

The demo is not primarily a feature catalogue, technical dashboard, or simulation of SALT as a standalone consumer product.

The experience should communicate SALT through a plausible customer context. A viewer should be able to understand the role SALT plays before they need to understand how it is implemented.

## 2. Source-of-Truth Hierarchy

When product, technical, research, and prototype materials disagree, use the following order of authority.

### 2.1 Current SALT repository

The current SALT product repository is the source of truth for:

- implemented capabilities;
- schemas and response states;
- serving behaviour;
- technical constraints;
- geographic coverage;
- supported integrations;
- operational limitations; and
- functionality that does or does not exist.

Do not infer current SALT capability from this document, the demo repository, historical summaries, or prototype fixtures when the product repository can be inspected directly.

### 2.2 Customer and market research

Use research materials as evidence for:

- customer workflows;
- jobs to be done;
- observed pain points;
- likely adoption triggers;
- customer-owned context;
- potential value created by SALT; and
- hypotheses worth validating.

Clearly distinguish between direct evidence, external evidence, inference, and speculation.

Do not convert an inferred need into a confirmed customer requirement.

### 2.3 Design and usability evidence

Use prototype reviews, user feedback, and design critique as evidence about:

- comprehension;
- interaction clarity;
- information hierarchy;
- cognitive load;
- credibility;
- product-positioning confusion; and
- communication effectiveness.

These findings may justify changing the demo even when the current implementation is technically correct.

### 2.4 Current demo implementation

Treat the demo codebase as a working experiment, not a product specification.

Existing components, copy, layouts, interaction patterns, and fixtures may be replaced when a better solution is supported by the principles above.

## 3. Product Model

SALT is a B2B venue-data infrastructure product.

The strongest current product framing is not general discovery or recommendation. SALT is most relevant after a product already has a known venue, candidate set, or user intent and needs reliable information before the user acts.

A useful abstract model is:

existing intent or candidate set → SALT venue feasibility / trust signals → host product decides what to show or do

This model should guide the demo without forcing any specific interface.

## 4. Product Boundaries

A core design requirement is maintaining a clear boundary between SALT, the host product, and any orchestration layer.

### 4.1 The host product may own

Depending on the use case, the customer product may own:

- the end-user relationship;
- user intent;
- saved or selected venues;
- trip, task, or session context;
- dates and times;
- party size or equivalent constraints;
- itinerary or workflow state;
- content provenance;
- ranking and recommendation logic;
- presentation;
- notifications;
- booking or commerce handoff; and
- the final user experience.

### 4.2 SALT may contribute

Subject to current repository truth, SALT may contribute signals such as:

- venue identity;
- operating status;
- reservation capability;
- live availability;
- alternative times; and
- explicit uncertainty or unsupported states.

### 4.3 The host or orchestration layer may derive

A customer may combine SALT output with its own context to create additional value.

For example, a host product may compare a SALT-supplied restaurant time with an event already present in the user's itinerary and surface a scheduling warning.

Derived behaviour must not be presented as native SALT capability unless SALT actually provides the required context and reasoning.

## 5. Important Non-Capabilities

Unless the current SALT repository demonstrates otherwise, the demo must not imply that SALT provides:

- taste or preference modelling;
- restaurant ranking;
- personalised recommendations;
- ratings or reviews;
- cuisine, ambience, menu, or pricing intelligence;
- general-purpose semantic discovery;
- route optimisation;
- itinerary generation;
- booking completion;
- inventory holding;
- payment processing; or
- a consumer travel application.

The demo may show SALT participating in a workflow that contains these functions, but ownership must remain clear.

## 6. Research Foundation

Research to date indicates that SALT is easier to understand when it enters a workflow where the customer already possesses meaningful intent or context.

Relevant inputs may include:

- known or saved venues;
- a destination;
- dates;
- a time or planning window;
- party size;
- a user request; or
- an existing plan.

The need appears at the point where the host product must determine whether a known choice is still actionable.

This is more specific than the broad category of "AI travel" or "restaurant discovery."

Potential customer contexts may include saved-place products, itinerary tools, conversational assistants, concierge products, and other systems that already know what venue a user is interested in.

These categories are examples, not fixed design requirements.

## 7. Demo Communication Principles

### 7.1 Demonstrate a change, not a list of features

The demo should make a meaningful before/after difference visible.

A viewer should be able to identify:

1. the existing product state;
2. the decision or action boundary;
3. what SALT contributes;
4. how the host experience becomes more useful or trustworthy.

The transformation is more important than showing the maximum number of SALT capabilities.

### 7.2 Keep SALT distinct from the host product

A realistic host-product simulation can improve comprehension, but it also creates a risk that viewers mistake the example product for SALT itself.

The framing should make it clear that:

- SALT is the product being demonstrated;
- the visible consumer or workflow product is an example customer context; and
- SALT acts as infrastructure within or alongside that experience.

This relationship should be communicated primarily through structure and visual hierarchy rather than explanatory paragraphs.

### 7.3 Prefer visual communication over literal explanation

Where practical, communicate meaning through:

- hierarchy;
- grouping;
- containment;
- state changes;
- spacing;
- typography;
- iconography;
- contrast;
- progressive disclosure; and
- motion.

Use copy when it resolves genuine ambiguity, not when it repeats information the interface already communicates.

Conciseness must not come at the expense of accessibility or factual clarity.

### 7.4 Preserve host-product ownership

The host product should remain the owner of the user experience.

SALT should not visually take over the interface unless the use case explicitly requires a SALT-owned surface.

A strong demo should allow a prospective customer to imagine SALT improving their product rather than replacing it.

## 8. Credibility and Claims Discipline

The demo must remain technically and semantically credible.

### 8.1 Do not overstate certainty

Avoid language that implies facts not supported by the underlying data.

Examples that require particular care include:

- "has a table";
- "only one table left";
- "secured";
- "booked";
- "best";
- "recommended by SALT";
- "perfect for your trip";
- "live" when a result is deterministic.

Prefer wording that reflects the actual response or state.

### 8.2 Keep simulated and live behaviour distinct

A deterministic prototype may use representative SALT-shaped data to communicate value consistently.

It must not imply that a live SALT request occurred when it did not.

If a live technical proof is added later, it should be clearly separable from the deterministic customer experience.

A useful hierarchy is:

understand the value first → optionally inspect or prove the technology

### 8.3 Preserve uncertainty where it matters

SALT's product behaviour should not silently convert uncertainty into a false positive or false negative.

Unknown or unsupported states do not need to dominate the demo narrative, but they should be handled honestly wherever they appear.

### 8.4 Maintain internal consistency

Data shown in different parts of the experience must agree.

If a product surface shows a subset of results, that subset should follow an understandable rule rather than arbitrary presentation logic.

Unexplained inconsistency damages trust and can accidentally imply hidden ranking or recommendation behaviour.

## 9. Action and Booking Boundaries

SALT can help a host product determine that an action is feasible without completing the action itself.

The experience should not make a user believe that:

- a table has been held;
- a booking has been completed;
- payment has occurred; or
- inventory is owned by SALT.

Where relevant, the host product may hand the user to an external reservation or booking provider.

The transition should be understandable without turning the demo into a full booking flow.

## 10. Negative and Preventative Value

SALT may create value by preventing a user from acting on stale or invalid venue information.

Examples may include a venue that is no longer operating or a choice that cannot be confirmed for a relevant context.

Negative information should be presented proportionately.

The demo should not become a warning dashboard, but it should be able to demonstrate that trust and prevention are part of the value proposition when supported by the product.

## 11. Technical Transparency

Because SALT is infrastructure, some prospective customers may need to understand the integration model.

When technical transparency is useful, prefer exposing a concise contract-level view such as:

host context → SALT request → structured response → host presentation

This may include tool inputs, response fields, or a simplified integration example.

Avoid using raw implementation source code as the main explanation of product value.

Technical proof should support the customer story rather than replace it.

## 12. Design Evaluation Criteria

An iteration should be considered stronger when it improves the following without violating product truth.

### Product comprehension

A first-time viewer can understand that:

- SALT is the product being demonstrated;
- the example experience belongs to a customer or host product;
- SALT has a specific role inside that workflow; and
- SALT does not own more of the workflow than the product actually supports.

### User-value comprehension

The viewer can see:

- what was difficult, uncertain, or incomplete before SALT;
- what changes after SALT is introduced; and
- why the resulting experience is potentially more useful, actionable, or trustworthy.

### Credibility

The experience:

- does not imply unsupported capabilities;
- distinguishes deterministic from live behaviour;
- uses internally consistent data;
- handles uncertainty honestly; and
- respects booking and ownership boundaries.

### UX quality

The experience:

- has an understandable primary interaction;
- minimises unnecessary explanation;
- avoids contradictory or redundant information;
- uses visual structure effectively;
- feels like a plausible modern product experience rather than a slide or feature dashboard.

### B2B relevance

The demo helps a prospective customer imagine:

- where SALT could enter their own workflow;
- what they could build or improve with it; and
- what a realistic pilot or technical conversation might examine next.

## 13. AI Builder Decision Authority

AI design and coding agents should be allowed to iterate without unnecessary human intervention.

### AI may generally decide

- layout;
- spacing;
- visual hierarchy;
- component structure;
- responsive behaviour;
- interaction mechanics;
- progressive disclosure;
- visual state treatment;
- information density;
- accessibility implementation;
- microcopy where the underlying meaning does not change;
- whether redundant UI should be removed; and
- high-fidelity presentation once the interaction model is sound.

### Human input is required when a change would materially alter

- what SALT claims to do;
- the customer or job the demo is centred on;
- what SALT owns versus the host product;
- whether behaviour is real, simulated, or live;
- a factual product claim;
- the central product narrative; or
- the introduction of a substantial new capability or workflow.

Agents should not escalate routine interface choices simply because multiple acceptable solutions exist.

## 14. Working Method for AI-Assisted Iteration

When iterating on the demo:

1. Inspect the current SALT repository when technical truth matters.
2. Read this document for durable design and product context.
3. Treat the current demo implementation as a hypothesis.
4. Run and experience the product as a first-time viewer.
5. Identify the highest-impact comprehension or UX problem.
6. Determine whether the issue is a design problem or a product-truth ambiguity.
7. Make a coherent change.
8. Re-run and review the full flow.
9. Compare the result with the previous state.
10. Keep improvements and revert regressions.
11. Validate accessibility, responsiveness, tests, lint, and build.
12. Stop iterating when remaining issues are primarily subjective polish or require a genuine product decision.

Do not optimise indefinitely for cosmetic preference.

## 15. Scope Guardrails

Unless a task explicitly reopens them, do not allow the demo to drift into:

- a consumer SALT travel product;
- a broad discovery feed;
- taste or personalisation;
- route optimisation;
- full itinerary generation;
- booking or payments;
- a customer analytics dashboard;
- a raw source-code viewer;
- a general-purpose AI assistant; or
- a feature catalogue built for completeness rather than comprehension.

New use cases may be explored when supported by research, but they should not be added simply to make the demo appear broader.

## 16. Guiding Question

When a design decision is uncertain, use this question as the primary lens:

Does this experience help a prospective customer understand what useful change SALT can enable inside a product they already have, without implying that SALT owns more of that product than it actually does?

This question is a design principle, not a prescribed interface.
