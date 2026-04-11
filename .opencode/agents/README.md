# Contract Agent Registry

This folder defines project-specific agents for Contract Finder.

All project agents use the `contract-` prefix to avoid collisions with built-in or shared agent names.

## Agent List

1. `contract-architect-opus`
2. `contract-code-writer-free-model`
3. `contract-antigravity-gemini-3`
4. `contract-test-free`
5. `contract-openai-gpt5-4`

## Model Assignments

1. `contract-architect-opus` -> `github-copilot/claude-opus-4.6`
2. `contract-code-writer-free-model` -> `opencode/qwen3.6-plus-free`
3. `contract-antigravity-gemini-3` -> `Gemini 3 (Antigravity)` with fallback `Copilot Sonnet`
4. `contract-test-free` -> `opencode/qwen3.6-plus-free`
5. `contract-openai-gpt5-4` -> `openai/gpt-5.4` with fallback `github-copilot/gpt-5.4`

## Routing Guidance

1. Use `contract-architect-opus` for architecture, orchestration, milestone slicing, schema decisions, and difficult cross-cutting technical choices.
2. Use `contract-code-writer-free-model` for simple components, forms, utility code, route scaffolding, and low-risk implementation tasks.
3. Use `contract-antigravity-gemini-3` for heavier integration work, end-to-end feature completion, and remaining implementation after the basic pass.
4. Use `contract-test-free` for smoke tests and e2e verification, especially route health, browser console errors, and server runtime errors.
5. Use `contract-openai-gpt5-4` for review, bug-risk detection, maintainability checks, and launch-readiness quality review.

## Execution Order

1. `contract-architect-opus` defines or refines the current implementation slice.
2. `contract-code-writer-free-model` handles simple scoped implementation first when possible.
3. `contract-antigravity-gemini-3` completes remaining integration-heavy work.
4. `contract-test-free` verifies runtime health after each meaningful batch.
5. `contract-openai-gpt5-4` reviews correctness and maintainability before completion.

## Model Selection Strategy

1. Use Opus when judgment, sequencing, and cross-cutting decisions matter most.
2. Use the free writer model for narrow, low-risk implementation tasks.
3. Use Antigravity Gemini 3 for broader integration work and feature completion.
4. If Antigravity tokens are unavailable, use Copilot Sonnet for the same advanced-writer role.
5. Use the free test agent liberally after each batch.
6. Use GPT-5.4 review when bug finding and maintainability matter more than speed.
7. If OpenAI GPT-5.4 tokens are unavailable, use Copilot GPT-5.4 for the same review role.

## Project Principles For Agents

1. Preserve the phase order in `SUPERGROK-PLAN.md` and `PHASE0-IMPLEMENTATION.md`.
2. Keep Phase 0 narrowly focused on auth, profile, fingerprint, and toggle state.
3. Do not introduce Phase 1 data-ingestion, notifications, or AI behavior during Phase 0 work.
4. Prefer the smallest correct implementation that fits Next.js fullstack + Supabase + low-cost hosting.
5. Avoid speculative abstractions until the Phase 0 flow is proven.
6. Prefer vertical slices that can be tested quickly.
7. Do not call work complete until implementation, testing, and review are all covered.
