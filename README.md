# Contract Finder

Contract Finder is the first module of a larger job ecosystem focused on helping IT developers discover relevant contract opportunities.

## Current Documents
- `SUPERGROK-PLAN.md`: high-level product and implementation plan
- `INITIAL-PHASE-PLAN.md`: pre-Phase-0 data validation spike plan
- `PHASE0-IMPLEMENTATION.md`: Phase 0 foundation implementation plan
- `later.md`: future data sources and expansion notes

## Agent Layout
- Project-specific agents live in `.opencode/agents/`
- Each agent is defined as a single Markdown file
- All agent names start with `contract-`

## Current Agents
- `.opencode/agents/contract-architect-opus.md`
- `.opencode/agents/contract-test-free.md`
- `.opencode/agents/contract-code-writer-free-model.md`
- `.opencode/agents/contract-antigravity-gemini-3.md`
- `.opencode/agents/contract-openai-gpt5-4.md`

## Agent Flow
1. `contract-architect-opus` acts as architect and orchestrator.
2. `contract-code-writer-free-model` handles straightforward implementation.
3. `contract-antigravity-gemini-3` completes the remaining implementation work.
4. `contract-test-free` runs smoke and e2e checks.
5. `contract-openai-gpt5-4` reviews code quality and risks.
