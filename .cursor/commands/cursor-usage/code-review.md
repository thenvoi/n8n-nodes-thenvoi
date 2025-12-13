I want you to review the code and make sure it follows the code style preferences.

## Instructions

1. **Read the code style preferences**: Start by reading the code-style-preferences rule to understand the current standards and best practices.

2. **Review the codebase**: Analyze the specified code (file, directory, or entire codebase) against the code style preferences. (if no specific code is provided, review the uncommited changes in the current branch)

3. **Identify violations**: Find code that violates existing preferences in the code-style-preferences rule.

4. **Detect patterns**: Identify common patterns, practices, or issues in the code that are NOT currently covered in the code-style-preferences rule.

5. **Suggest improvements**: Propose additions or improvements to code-style-preferences rule based on:
   - Patterns you find that should be standardized
   - Best practices from the industry that align with the project's philosophy
   - Issues that recur and could be prevented with better guidelines
   - Gaps in the current documentation

6. **Apply general best practices**: Even if something isn't explicitly in the preferences, apply general software engineering best practices when reviewing code.

## Review Process

For each file or module:

1. **Code Style Compliance**: Check against all sections in code-style-preferences rule
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
   - Added to code-style-preferences rule
   - Documented as best practices
   - Refactored for consistency

## Reporting Format

Structure your findings as follows:

### 1. Code Style Violations

For each violation, provide:
- **File**: Path to the file
- **Issue**: Description of the violation
- **Relevant Preference**: Quote from code-style-preferences rule
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

Patterns found that should be added to code-style-preferences rule:
- **Pattern**: Description of the pattern
- **Frequency**: How often it appears
- **Current State**: What happens now (inconsistent, unhandled, etc.)
- **Proposed Addition**: What should be added to code-style-preferences rule
- **Examples**: Code examples showing the pattern

### 5. General Best Practices Recommendations

Best practices not in preferences but should be considered:
- **Practice**: Description
- **Rationale**: Why it matters
- **Examples**: Where it could be applied
- **Consideration**: Should this be added to preferences?

## Action Items

After the review, you must:

1. **Create a full detailed plan of action** for the changes that need to be made to the codebase. The plan should be detailed, informative and comprehensive.
2. **Update any relevant documentation files** to reflect the changes.
3. If you have any further questions, please ask me.
