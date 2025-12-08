# Thenvoi AI Agent System Prompt - Maintenance Guide

This guide is for developers and AI assistants (like Cursor) who need to maintain and update the `docs/n8n/agent-node/prompt/thenvoi_agent_system_prompt_template.md` file.

## Table of Contents

1. [Overview](#overview)
2. [Template Architecture](#template-architecture)
3. [Critical Sections](#critical-sections)
4. [What NOT to Change](#what-not-to-change)
5. [How to Make Changes Safely](#how-to-make-changes-safely)
6. [Testing Changes](#testing-changes)
7. [Common Pitfalls](#common-pitfalls)
8. [Version History Best Practices](#version-history-best-practices)

---

## Overview

### Purpose of This Document

The system prompt template is the foundation for ALL Thenvoi AI agents created in n8n. Changes to this template affect every agent instance, so modifications must be:
- **Carefully considered** - Impact is system-wide
- **Well-tested** - Errors affect all users
- **Backwards compatible** - Don't break existing agents
- **Clearly documented** - Others need to understand changes

### Template Purpose

The template serves two distinct functions:

1. **Base Operating System**: Provides foundational instructions about:
   - How the agent operates in the n8n/Thenvoi environment
   - Communication patterns (thoughts vs messages)
   - Tool usage mechanics
   - Privacy and mention rules

2. **Customization Framework**: Provides placeholders for users to inject:
   - Agent role and personality
   - Domain-specific guidelines
   - Custom examples

**Key principle**: The base template handles HOW agents operate; user customization defines WHAT they do.

---

## Template Architecture

### Structure Overview

The template is organized into these major sections:

```
1. Header & Explanation
   ↓
2. Execution Environment (n8n + Thenvoi)
   ↓
3. Communication Model (thoughts vs send_message)
   ↓
4. {{USER_AGENT_ROLE}} ← User customization point
   ↓
5. Dynamic Context (Chat room, participants, messages, tools)
   ↓
6. Tool Usage Guidelines (send_message, add_participant, etc.)
   ↓
7. Mention System Rules
   ↓
8. Privacy Guidelines
   ↓
9. Message Quality Standards
   ↓
10. Operational Guidelines
    ↓
11. {{USER_SPECIFIC_GUIDELINES}} ← User customization point
    ↓
12. Interaction Patterns (Examples)
    ↓
13. {{USER_EXAMPLES}} ← Optional user customization point
    ↓
14. Do's and Don'ts
    ↓
15. Final Remember Section
```

### Section Dependencies

Some sections depend on others:
- **Tool Usage Guidelines** depends on **Dynamic Context** (CHAT PARTICIPANTS exists)
- **Interaction Patterns** depends on **Tool Usage Guidelines** (shows tool usage)
- **Do's and Don'ts** summarizes all previous guidelines

**When editing**: Consider downstream dependencies.

---

## Critical Sections

These sections are the foundation of agent behavior. Edit with extreme caution:

### 1. Communication Model

**Location**: After "Execution Environment"

**Why Critical**: Defines the fundamental distinction between private thoughts (output) and public messages (send_message tool).

**What it does**:
- Tells agent their output is private (encourages honest reasoning)
- Mandates `send_message` tool for all visible communication
- Sets up the dual-channel communication pattern

**Don't change unless**: The fundamental execution model changes (e.g., thoughts become visible, or output method changes).

### 2. Dynamic Context Sections

**Location**: After `{{USER_AGENT_ROLE}}`

**Why Critical**: Defines what data is injected into the prompt at runtime.

**What it specifies**:
- CURRENT CHAT ROOM structure
- CHAT PARTICIPANTS format
- RECENT MESSAGES content
- AVAILABLE TOOLS descriptions

**Changes here must match**: What the actual code injects. If you change field names here, you must update injection code.

### 3. Tool Usage Guidelines

**Location**: After "Dynamic Context"

**Why Critical**: Tells agents how to use each tool correctly.

**What it covers**:
- Purpose of each tool
- When to use it
- How to call it (syntax)
- Important rules

**Changes needed when**: Tools are added, removed, renamed, or behavior changes.

### 4. Mention System

**Location**: After "Tool Usage Guidelines"

**Why Critical**: Prevents common mention-related errors (generic names, case sensitivity, over-mentioning).

**What it enforces**:
- Exact name matching
- Case sensitivity
- When to use @ vs plain names
- Privacy around mentions

**Don't change unless**: Mention behavior fundamentally changes in Thenvoi platform.

### 5. Privacy Guidelines

**Location**: After "Mention System"

**Why Critical**: Protects user privacy by separating user information from agent communications.

**What it enforces**:
- Separate messages for user info vs agent mentions
- Example workflow showing proper separation

**Don't change unless**: Privacy model changes or new privacy concerns emerge.

---

## What NOT to Change

### 🔒 Do NOT Change Without Discussion

1. **User Placeholder Names**
   - `{{USER_AGENT_ROLE}}`
   - `{{USER_SPECIFIC_GUIDELINES}}`
   - `{{USER_EXAMPLES}}`
   
   **Why**: These are referenced in documentation and expected by users. Changing them breaks existing prompts.

2. **Communication Model Fundamentals**
   - "Your output is private"
   - "Use send_message for all visible communication"
   
   **Why**: This is core to how the system works. Changing this breaks the dual-channel model.

3. **Dynamic Section Headers**
   - `### CURRENT CHAT ROOM`
   - `### CHAT PARTICIPANTS`
   - `### RECENT MESSAGES`
   - `### AVAILABLE TOOLS`
   
   **Why**: Code expects these headers for injection. Changing them breaks dynamic content insertion.

4. **Tool Names in Examples**
   - `send_message()`
   - `add_participant_to_chat()`
   - etc.
   
   **Why**: Must match actual tool names in code. Changes require code updates.

### ✏️ Safe to Change

1. **Explanatory text** - Clarify, expand, simplify
2. **Examples** - Add, improve, or modify example scenarios
3. **Do's and Don'ts** - Add items based on observed behavior
4. **Phrasing** - Improve clarity without changing meaning
5. **Formatting** - Improve readability with better structure

---

## How to Make Changes Safely

### Before Making Changes

**Step 1: Identify Change Type**
- **Content change**: Modifying explanations, examples, guidelines
- **Structural change**: Adding/removing sections, reordering
- **Breaking change**: Modifying placeholders, tool names, dynamic sections

**Step 2: Assess Impact**
- Who does this affect? (All agents, specific use cases, etc.)
- What could break? (Existing prompts, code injection, tool calls, etc.)
- Is it backwards compatible?

**Step 3: Check Dependencies**
- Does this section reference others?
- Do other sections reference this?
- Does code depend on this structure?

### Making the Change

**For Content Changes** (Safe):
1. Edit the text
2. Ensure examples still work
3. Verify tone and clarity
4. Check for consistency with other sections

**For Structural Changes** (Moderate Risk):
1. Document what you're changing and why
2. Update table of contents if needed
3. Update cross-references
4. Check user guide reflects new structure

**For Breaking Changes** (High Risk):
1. **DO NOT PROCEED** without explicit approval
2. Document all downstream impacts
3. Update code that depends on this
4. Update user documentation
5. Plan migration for existing users
6. Version the change appropriately

### After Making Changes

**Step 1: Self-Review**
- Read through the entire template
- Verify examples still make sense
- Check for inconsistencies
- Ensure placeholders are intact

**Step 2: Test Scenarios**
- See [Testing Changes](#testing-changes) section
- Walk through common use cases
- Verify tool usage examples work
- Check mention examples are correct

**Step 3: Documentation**
- Update this maintenance guide if structure changed
- Update user guide if user-facing changes
- Document change rationale in commit message

---

## Testing Changes

Since you (AI assistant) cannot directly test in n8n and Thenvoi, provide these testing recommendations to the developer:

### Test Scenario 1: Basic Communication

**Goal**: Verify agent understands thoughts vs messages

**Test**:
1. Create simple agent with minimal custom prompt
2. Mention agent with basic question
3. Verify:
   - ✅ Agent uses `send_message` for response
   - ✅ Agent doesn't output text directly
   - ✅ Private thoughts show reasoning (if visible in logs)

### Test Scenario 2: Mention System

**Goal**: Verify agent uses exact participant names

**Test**:
1. Create chat with user "John Smith"
2. Mention agent with question
3. Verify:
   - ✅ Agent uses "@John Smith" not "@user" or "@John"
   - ✅ Agent checks CHAT PARTICIPANTS for names
   - ✅ Agent doesn't over-mention

### Test Scenario 3: Participant Management

**Goal**: Verify agent checks before adding participants

**Test**:
1. Add agent A to chat
2. Mention agent A, have them need agent B
3. Verify:
   - ✅ Agent checks CHAT PARTICIPANTS first
   - ✅ Agent doesn't try to add participants already present
   - ✅ Agent uses correct participant_id from list

### Test Scenario 4: Privacy Separation

**Goal**: Verify agent separates user info from agent mentions

**Test**:
1. Ask agent to coordinate with another agent
2. Verify:
   - ✅ Separate message to acknowledge user
   - ✅ Separate message to mention other agent
   - ✅ No user info in agent-mention message

### Test Scenario 5: Tool Usage

**Goal**: Verify agent uses tools correctly per guidelines

**Test**:
1. Trigger scenarios requiring each tool
2. Verify:
   - ✅ `send_message` used for all visible communication
   - ✅ `add_participant_to_chat` only for new participants
   - ✅ `list_available_participants` before adding unknown participant
   - ✅ Tools called with correct parameters

### Test Scenario 6: Custom Prompt Integration

**Goal**: Verify user customization works correctly

**Test**:
1. Create agent with custom role, guidelines, and examples
2. Verify:
   - ✅ Base behavior preserved (tools, mentions, privacy)
   - ✅ Custom personality emerges
   - ✅ Custom guidelines respected
   - ✅ No conflicts between base and custom instructions

### Test Scenario 7: Memory and Context

**Goal**: Verify agent uses conversation history

**Test**:
1. Have multi-turn conversation with agent
2. Reference earlier messages
3. Verify:
   - ✅ Agent remembers previous context
   - ✅ Agent doesn't re-ask answered questions
   - ✅ Agent maintains conversation continuity

### Regression Testing

After ANY changes to the template:
- ✅ Run all 7 test scenarios above
- ✅ Test with at least 2 different LLMs (GPT-4, Claude, etc.)
- ✅ Test with minimal custom prompt (base behavior)
- ✅ Test with complex custom prompt (integration)
- ✅ Check for unexpected behaviors

---

## Common Pitfalls

### Pitfall 1: Over-Specifying Tools

**Problem**: Adding too many details about tool implementation in guidelines.

**Why it's bad**: Creates brittleness. If implementation changes, prompt is wrong.

**Solution**: Focus on WHEN and WHY to use tools, not HOW they work internally.

**Example**:
❌ "send_message tool enqueues to MessageQueue which batches sends"
✅ "Use send_message to send visible messages to the chat"

### Pitfall 2: Contradicting Base Instructions

**Problem**: User guidelines section contradicts base operational guidelines.

**Why it's bad**: Confuses the agent, creates unpredictable behavior.

**Solution**: Structure prompts so base handles mechanics, user handles specifics. They should complement, not conflict.

**Example**:
❌ Base says "use send_message for all messages", user says "output text directly"
✅ Base says "use send_message", user says "always be friendly in your messages"

### Pitfall 3: Generic Examples

**Problem**: Examples that are too abstract or don't show actual tool usage.

**Why it's bad**: LLMs learn better from concrete examples.

**Solution**: Show specific, complete interactions with actual tool calls.

**Example**:
❌ "When user asks question, you respond appropriately"
✅ Complete example showing: user message → agent thoughts → `send_message("...")`

### Pitfall 4: Forgetting Dynamic Content

**Problem**: Writing guidelines that assume static data when data is dynamic.

**Why it's bad**: Agent doesn't know to look at injected sections.

**Solution**: Always reference dynamic sections (e.g., "check CHAT PARTICIPANTS section").

**Example**:
❌ "Participants in the chat are John and Alice"
✅ "See CHAT PARTICIPANTS section for current participants"

### Pitfall 5: Prompt Creep

**Problem**: Gradually adding more and more content until prompt is unwieldy.

**Why it's bad**: Longer prompts are slower, more expensive, and can confuse models.

**Solution**: Regularly audit for redundancy. Remove outdated content. Keep it focused.

**Example**:
- Before adding: "Does this really need to be in the base prompt, or is it niche?"
- Regular cleanup: Review and remove redundant or outdated sections

### Pitfall 6: Assuming Model Capabilities

**Problem**: Writing prompts that assume specific model capabilities (e.g., tool calling).

**Why it's bad**: Users might use different models with different capabilities.

**Solution**: Graceful degradation. Mention tool-calling requirement, provide fallback if possible.

**Example**:
✅ "If your model supports tools, use send_message. If not, output text directly."

### Pitfall 7: Ignoring User Feedback

**Problem**: Not incorporating learnings from how agents actually behave.

**Why it's bad**: Miss opportunities to improve behavior based on real usage.

**Solution**: Maintain a feedback loop. When users report issues, update prompt to prevent them.

**Example**:
- User reports: "My agent keeps using @user instead of real names"
- Update: Strengthen mention guidelines with explicit examples

---

## Version History Best Practices

### Documenting Changes

When making changes to the template, document:

1. **What changed**: Specific sections or content modified
2. **Why it changed**: Problem being solved or improvement being made
3. **Impact**: Who/what is affected by this change
4. **Testing**: What testing was done or should be done

### Commit Message Format

```
[Template] Brief description of change

Details:
- Specific change 1
- Specific change 2

Rationale: Why this change was needed

Testing: How to verify this works

Impact: Backwards compatible / Requires user action / Breaking change
```

### Example Good Commit Messages

**Example 1: Content Improvement**
```
[Template] Clarify mention system examples

Details:
- Added more explicit examples of correct vs incorrect mentions
- Emphasized case-sensitivity with concrete examples
- Added troubleshooting for common mention mistakes

Rationale: Users reported confusion about why "@user" doesn't work

Testing: Verify agents now use exact names from CHAT PARTICIPANTS

Impact: Backwards compatible, improves existing behavior
```

**Example 2: Structural Change**
```
[Template] Reorganize tool usage guidelines

Details:
- Moved tool guidelines closer to tool introduction
- Added "When to use" section for each tool
- Consolidated privacy guidelines into single section

Rationale: User feedback indicated tools section was hard to follow

Testing: Run full regression suite, verify tool usage unchanged

Impact: Backwards compatible, structural only
```

**Example 3: Breaking Change**
```
[Template] BREAKING: Rename user placeholders for clarity

Details:
- {{USER_ROLE}} → {{USER_AGENT_ROLE}}
- {{USER_GUIDELINES}} → {{USER_SPECIFIC_GUIDELINES}}

Rationale: "ROLE" was ambiguous (agent role vs participant role in chat)

Testing: Update code injection, update user guide, test with new placeholders

Impact: BREAKING - Requires users to update their prompts
Migration: Search/replace old placeholder names with new ones
```

---

## Emergency Fixes

### If Something Breaks

**Step 1: Identify Scope**
- What's broken? (All agents, specific use case, etc.)
- When did it break? (Recent change, or underlying issue?)
- How severe? (Unusable, degraded, cosmetic?)

**Step 2: Quick Fix vs Proper Fix**
- **Quick fix**: Revert to last known good version
- **Proper fix**: Identify root cause and fix properly

**Step 3: Communicate**
- If breaking all agents: URGENT communication to users
- If affecting some users: Targeted communication
- If cosmetic: Fix in next regular update

**Step 4: Post-Mortem**
- What went wrong?
- What testing would have caught it?
- How do we prevent this type of issue?

---

## Best Practices Summary

### When Editing the Template

✅ **DO:**
- Read the entire template before changing
- Consider downstream impacts
- Test changes thoroughly (or provide test scenarios)
- Document rationale for changes
- Keep user experience in mind
- Maintain backwards compatibility when possible
- Use clear, concrete examples
- Reference dynamic sections appropriately

❌ **DON'T:**
- Make breaking changes without discussion
- Add content without removing outdated content (prompt creep)
- Contradict other sections
- Change placeholder names lightly
- Assume all LLMs have same capabilities
- Forget to update user documentation
- Skip testing

### When Reviewing Changes

✅ **Check:**
- Placeholders intact?
- Dynamic sections unchanged (unless intentional)?
- Examples still accurate?
- No contradictions introduced?
- User documentation updated if needed?
- Test scenarios defined?
- Backwards compatibility maintained?

---

## Quick Reference

### File Locations

- **Template**: `docs/n8n/agent-node/prompt/thenvoi_agent_system_prompt_template.md`
- **User Guide**: `docs/n8n/agent-node/agent_node_guide.md`
- **This Guide**: `docs/n8n/agent-node/prompt/system_prompt_maintenance_guide.md`
- **Tool Refactoring**: `docs/tool_refactoring_tasks.md`

### Key Concepts

- **Base Template**: HOW agents operate (mechanics, tools, rules)
- **User Customization**: WHAT agents do (role, domain, personality)
- **Dynamic Content**: Runtime-injected data (participants, messages, etc.)
- **Thoughts vs Messages**: Private output vs public send_message tool

### Critical Points

1. Communication model is foundation - don't break it
2. Placeholders are user-facing API - don't change names
3. Dynamic sections must match code injection - keep in sync
4. Examples drive behavior - make them concrete and accurate
5. Test changes - provide scenarios for developers to verify

---

## Questions to Ask Before Changing

Before making ANY change, ask yourself:

1. **Why am I making this change?**
   - Problem to solve? Improvement to make? User feedback?

2. **What's the impact?**
   - All agents? Specific use cases? User workflows?

3. **Is this backwards compatible?**
   - Will existing prompts still work?

4. **What could break?**
   - Code dependencies? User expectations? Tool calls?

5. **How will we test this?**
   - What scenarios verify this works?

6. **Is this the minimal change?**
   - Could we solve this with less impact?

7. **Does documentation need updating?**
   - User guide? This guide? Code comments?

If you can't answer these confidently, **discuss before proceeding**.

---

## Conclusion

The system prompt template is powerful and sensitive. Treat it with respect, test changes thoroughly, and always consider the users who depend on stable, predictable agent behavior.

When in doubt, ask for review. It's better to be cautious than to break production agents.

Happy maintaining! 🛠️

