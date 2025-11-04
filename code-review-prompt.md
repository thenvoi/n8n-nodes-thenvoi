# Code Review Prompt Template

Use this prompt to perform comprehensive code reviews against the code style preferences. This template is designed to be dynamic and evolve with the code style preferences file.

## Instructions

1. **Read the code style preferences**: Start by reading `code-style-preferences.md` to understand the current standards and best practices.

2. **Review the codebase**: Analyze the specified code (file, directory, or entire codebase) against the code style preferences.

3. **Identify violations**: Find code that violates existing preferences in `code-style-preferences.md`.

4. **Detect patterns**: Identify common patterns, practices, or issues in the code that are NOT currently covered in `code-style-preferences.md`.

5. **Suggest improvements**: Propose additions or improvements to `code-style-preferences.md` based on:
   - Patterns you find that should be standardized
   - Best practices from the industry that align with the project's philosophy
   - Issues that recur and could be prevented with better guidelines
   - Gaps in the current documentation

6. **Apply general best practices**: Even if something isn't explicitly in the preferences, apply general software engineering best practices when reviewing code.

## Review Process

For each file or module:

1. **Code Style Compliance**: Check against all sections in `code-style-preferences.md`
   - Function design and extraction
   - Type safety and usage
   - Error handling patterns
   - Logging practices
   - Documentation standards
   - Utility organization
   - Naming conventions
   - Code organization

2. **Code Quality**: Assess overall quality
   - Readability and maintainability
   - Complexity and potential refactoring opportunities
   - Error handling robustness
   - Performance considerations
   - Testability

3. **Documentation**: Review documentation completeness
   - Public API documentation
   - Complex logic explanations
   - Inline comments for non-obvious code
   - Missing documentation that should be added

4. **Pattern Detection**: Look for patterns that could be:
   - Standardized in the codebase
   - Added to code style preferences
   - Documented as best practices
   - Refactored for consistency

## Reporting Format

Structure your findings as follows:

### 1. Code Style Violations

For each violation, provide:
- **File**: Path to the file
- **Issue**: Description of the violation
- **Relevant Preference**: Quote from `code-style-preferences.md`
- **Recommendation**: How to fix it
- **Code Reference**: Specific lines or functions affected

### 2. Code Quality Issues

Issues that don't violate explicit preferences but impact quality:
- **File**: Path to the file
- **Issue**: Description of the quality issue
- **Impact**: Why this matters
- **Recommendation**: Suggested improvement
- **Code Reference**: Specific lines or functions affected

### 3. Missing Documentation

Documentation gaps:
- **File**: Path to the file
- **Missing**: What documentation is missing
- **Type**: Public API, private method, complex logic, inline comment
- **Recommendation**: What documentation to add

### 4. Patterns for Code Style Preferences

Patterns found that should be added to `code-style-preferences.md`:
- **Pattern**: Description of the pattern
- **Frequency**: How often it appears
- **Current State**: What happens now (inconsistent, unhandled, etc.)
- **Proposed Addition**: What should be added to `code-style-preferences.md`
- **Examples**: Code examples showing the pattern

### 5. General Best Practices Recommendations

Best practices not in preferences but should be considered:
- **Practice**: Description
- **Rationale**: Why it matters
- **Examples**: Where it could be applied
- **Consideration**: Should this be added to preferences?

## Example Usage

```
Please review the codebase in `nodes/ThenvoiAgent/` using the code review prompt template.

Follow the review process:
1. Read code-style-preferences.md
2. Review the code against preferences
3. Identify violations and quality issues
4. Detect patterns not covered in preferences
5. Suggest improvements to code-style-preferences.md
6. Report findings in the structured format

Focus on:
- Function complexity and extraction opportunities
- Logging optimization
- Documentation completeness
- Utility function placement
- Type safety improvements
```

## Notes

- This template is designed to be reusable - it references `code-style-preferences.md` dynamically
- The preferences file evolves over time, and this review process helps improve it
- Focus on actionable recommendations, not just identification of issues
- Consider the context and trade-offs when making recommendations
- Balance between strict adherence and practical considerations

