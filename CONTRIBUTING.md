# Contributing to Thenvoi n8n Nodes

Thank you for your interest in contributing to the Thenvoi n8n nodes project! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Environment details (n8n version, Node.js version, etc.)
- Relevant error messages or logs

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Use cases and examples
- Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Follow the code style** - Run `npm run lint` and `npm run format` before committing
3. **Write clear commit messages** - Follow conventional commit format when possible
4. **Add tests** if applicable (we're working on expanding test coverage)
5. **Update documentation** - If you're adding features, update relevant docs
6. **Ensure builds pass** - Run `npm run build` and `npm run lint` before submitting

### Development Setup

See the [Development section](README.md#development) in the README for setup instructions.

### Code Style

- Follow TypeScript best practices and the [Code Style Preferences](.cursor/rules/code-style-preferences.mdc)
- Use ESLint configuration provided in the project
- Run `npm run lintfix` to auto-fix linting issues
- Run `npm run format` to format code with Prettier

### Documentation

- Follow the [Documentation Guide](docs/documentation_guide.md) when creating or updating docs
- Use the [Glossary](docs/glossary.md) for domain-specific terms
- Focus on concepts, not code implementation details
- Use Mermaid diagrams for visual explanations

### Project Structure

- `lib/` - Shared library code used across nodes
- `nodes/` - Individual node implementations
- `credentials/` - Credential configurations
- `docs/` - Documentation files

### Adding New Nodes

If you're adding a new node:
1. Follow the existing node structure patterns
2. Update `package.json` to include the new node
3. Add documentation in `docs/n8n/`
4. Update the README with the new node's features

### Adding New Capabilities (ThenvoiAgent)

See the [README section on adding capabilities](README.md#adding-new-capabilities-thenvoiagent) for detailed instructions.

### Adding New Event Types (ThenvoiTrigger)

See the [README section on adding event types](README.md#adding-new-event-types-thenvoitrigger) for detailed instructions.

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing documentation in the `docs/` directory

Thank you for contributing! 🎉


