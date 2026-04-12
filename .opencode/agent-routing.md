# Contract Agent Routing Plan

## Primary Assignment

1. `contract-architect-opus` -> overall architecture, orchestration, implementation sequencing, handoff decisions, and difficult cross-cutting technical choices

## Supporting Assignments

1. `contract-code-writer-free-model` -> simple pages, forms, shared UI, type definitions, route handlers, and low-risk scaffolding
2. `contract-antigravity-gemini-3` -> more complex integration work, full feature completion, persistence wiring, and remaining implementation gaps
3. `contract-test-free` -> smoke tests, route checks, browser console verification, server runtime verification, and Playwright E2E verification after finished tasks
4. `contract-openai-gpt5-4` -> code review after each milestone, regression finding, maintainability review, and release-readiness checks

## Model Selection Strategy

1. Use `contract-architect-opus` when architecture quality, orchestration, and cross-cutting reasoning matter most.
2. Use `contract-code-writer-free-model` for lower-cost, narrower implementation tasks once requirements are already stable.
3. Use `contract-antigravity-gemini-3` for integration-heavy work and broader implementation completion.
4. If Antigravity tokens are unavailable, use Copilot Sonnet for the `contract-antigravity-gemini-3` role.
5. Use `contract-test-free` liberally after each implementation batch and after each finished task.
6. Use `contract-openai-gpt5-4` when correctness, maintainability, and real bug-risk review matter more than speed.

## Phase Mapping

### Phase 0

1. Lead: `contract-architect-opus`
2. Main implementers: `contract-code-writer-free-model`, `contract-antigravity-gemini-3`
3. Tester: `contract-test-free`
4. Reviewer: `contract-openai-gpt5-4`

Phase 0 focus:

1. Sign up and login flow
2. Profile create/edit flow
3. Search fingerprint generation and persistence
4. Contract Finder enable/disable toggle
5. Protected route expectations for dashboard/profile pages

### Phase 1

1. Lead: `contract-architect-opus`
2. Main implementer: `contract-antigravity-gemini-3`
3. Support implementer: `contract-code-writer-free-model`
4. Tester: `contract-test-free`
5. Reviewer: `contract-openai-gpt5-4`

Phase 1 focus:

1. Hourly contract ingestion flow
2. Deduplication and basic matching
3. Notification delivery
4. Match history and visibility in the dashboard

## Execution Boundary

These routing rules support both planning and implementation.

Current expectation:

1. Preserve the roadmap order from `SUPERGROK-PLAN.md`.
2. Do not skip directly to Phase 1 or later features before Phase 0 is complete.
3. Keep the active slice narrow enough for fast testing and review.
4. After finishing a task, run E2E verification before calling the task complete.

## Standard E2E Commands

1. Check server: `lsof -ti:4000`
2. Run smoke suite: `npx playwright test e2e/smoke.spec.ts --reporter=list`
3. Alternate script: `npm run test:e2e`
