# Thenvoi AI Agent System Prompt - Maintenance Guide

This guide is for developers and AI assistants who need to maintain and update the `templates/agent/thenvoi_agent_system_prompt_template.md` file.

---

## Overview

The system prompt template is the foundation for ALL Thenvoi AI agents created in n8n. Changes affect every agent instance.

The template serves two functions:

1. **Base Operating System**: How agents communicate, use tools, handle mentions, and coordinate with other agents
2. **Customization Framework**: Placeholders for users to inject agent role, guidelines, and examples

**Key principle**: The base template handles HOW agents operate; user customization defines WHAT they do.

---

## Template Architecture

### Structure Overview

```
1. Introduction (platform context)
   ↓
2. {{USER_AGENT_ROLE}} ← User customization point (required)
   ↓
3. Dynamic Context (Chat room, participants, messages, tools)
   ↓
4. Communication Model (send_message, tone, tool efficiency)
   ↓
5. Internal Thoughts (planning, reasoning, context tracking)
   ↓
6. Mentions (handle format, self-identification, rules)
   ↓
7. Privacy (separate user info from agent messages)
   ↓
8. Working with Other Agents (find, add, delegate, relay, fallback)
   ↓
9. {{USER_SPECIFIC_GUIDELINES}} ← User customization point (optional)
   ↓
10. {{USER_EXAMPLES}} ← User customization point (optional)
    ↓
11. Key Rules (concise rule list — 7 rules)
    ↓
12. Remember (platform context + search-before-decline reinforcement)
```

Dynamic Context is placed early (before behavioral instructions) so the agent has full situational awareness before reading how to act. This avoids the attention valley caused by variable-length context in the middle of instructions.

### Design Principles

- **State each rule once** — no repetition across sections (Key Rules are a deliberate summary exception)
- **Trust the model** — don't over-explain basic capabilities
- **Concise tool references** — tools describe themselves via their schemas
- **Minimal examples** — the model understands chat and tool-calling semantics
- **No bold overuse** — reserve emphasis for the 1-2 most critical rules only; semantic weight is more reliable than visual emphasis

---

## What NOT to Change

### User Placeholder Names

- `{{USER_AGENT_ROLE}}`
- `{{USER_SPECIFIC_GUIDELINES}}`
- `{{USER_EXAMPLES}}`

These are referenced in code (`nodes/ThenvoiAgent/constants/promptSections.ts`) and replaced via string matching.

### Dynamic Section Headers

- `### CURRENT CHAT ROOM`
- `### CHAT PARTICIPANTS`
- `### RECENT MESSAGES`
- `### AVAILABLE TOOLS`

Code expects these exact headers for regex-based injection. Each must be followed by `[System will inject...]` placeholder text.

### Tool Names

- `send_message`
- `add_participant_to_chat`
- `remove_participant_from_chat`
- `list_available_participants`

Must match actual tool names in code. Changes require code updates.

### Communication Model Fundamentals

- "Your output is private"
- "Use send_message for all visible communication"

This is core to how the system works. Changing this breaks the dual-channel model.

---

## Safe to Change

1. **Explanatory text** — Clarify, simplify, improve phrasing
2. **Rule content** — Add or refine rules based on observed agent behavior
3. **Formatting** — Improve readability with better structure
4. **Section ordering** — As long as placeholder positions and dynamic sections remain valid

---

## How to Make Changes Safely

### Before Making Changes

1. **Identify change type**: Content (safe), structural (moderate risk), or breaking (high risk)
2. **Assess impact**: Does this affect the regex injection? The placeholder replacement? The tool names?
3. **Check code dependencies**: See `nodes/ThenvoiAgent/factories/promptFactory.ts` for injection logic

### After Making Changes

1. **Verify placeholders are intact** — All three `{{...}}` placeholders must be present
2. **Verify dynamic sections** — All four `### SECTION` headers with `[System will inject...]` text must be present
3. **Read through the entire template** for consistency
4. **Test with a live agent** — See testing scenarios below

---

## Testing Changes

### Test Scenario 1: Basic Communication

Verify agent uses `send_message` for responses and doesn't output text directly.

### Test Scenario 2: Mention System

Verify agent uses exact handles from CHAT PARTICIPANTS, not generic placeholders like "@user".

### Test Scenario 3: Participant Management

Verify agent checks CHAT PARTICIPANTS before adding, and doesn't duplicate.

### Test Scenario 4: Privacy Separation

Verify agent sends user-facing and agent-facing messages separately.

### Test Scenario 5: Custom Prompt Integration

Verify base behavior is preserved when custom role, guidelines, and examples are injected.

### Test Scenario 6: Search Before Declining

When the agent cannot fulfill a request (e.g., weather, real-time data), verify it uses `list_available_participants` to check for a suitable agent before saying it can't help. It should only decline after confirming no suitable participant exists.

### Regression Testing

After ANY changes:
- Run all test scenarios above
- Test with at least 2 different LLMs
- Test with minimal custom prompt (base behavior only)
- Test with complex custom prompt (full customization)

---

## Common Pitfalls

### Prompt Creep

Gradually adding content until the prompt is unwieldy. Before adding anything, ask: "Does this need to be in the base prompt, or is it niche?"

### Repetition

Stating the same rule in multiple sections. The current template is intentionally concise — each rule appears exactly once. The Key Rules section is a deliberate exception: it serves as end-of-prompt reinforcement (recency bias) and may briefly restate earlier rules in condensed form. Don't duplicate outside this pattern.

### Over-Specifying Tools

Focus on WHEN and WHY to use tools, not HOW they work internally. Tools describe themselves via their schemas.

### Contradicting Base Instructions

User guidelines should complement the base, not conflict. Base handles mechanics; user handles specifics.

---

## File Locations

- **Template**: `templates/agent/thenvoi_agent_system_prompt_template.md`
- **Injection code**: `nodes/ThenvoiAgent/factories/promptFactory.ts`
- **Section constants**: `nodes/ThenvoiAgent/constants/promptSections.ts`
- **Formatters**: `nodes/ThenvoiAgent/utils/prompting/formatters.ts`
- **User Guide**: `docs/nodes/agent/agent_node_guide.md`
- **This Guide**: `docs/nodes/agent/prompt/system_prompt_maintenance_guide.md`
