# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-18

### Changed

- **BREAKING**: Renamed organization from Thenvoi to Band. The npm package is now `@band-ai/n8n-nodes-band` (previously `@thenvoi/n8n-nodes-thenvoi`).
- **BREAKING**: Node identifiers renamed: `thenvoiAgent` → `bandAgent`, `thenvoiTrigger` → `bandTrigger`.
- **BREAKING**: Credential identifier renamed: `thenvoiApi` → `bandApi`.
- **BREAKING**: Default server URL changed to `app.band.ai/api/v1` (previously `app.thenvoi.com/api/v1`).
- All UI labels, icons, error messages, log prefixes, and documentation updated to use "Band".

### Migration

Existing workflows referencing the old node/credential identifiers will not load on upgrade. Recreate the credential, then rebuild affected workflows using the new "Band AI Agent" and "Band Trigger" nodes.

## [0.1.0] - 2025-12-13

### Added

- Initial release of Band n8n nodes package
- **Band Agent Node**: Full-featured AI Agent with built-in streaming to Band chats
  - Real-time streaming of tool calls, results, thoughts, and task updates
  - LangChain integration with callback handler
  - Extensible capability system with priority-based lifecycle hooks
  - Enhanced memory system with structured execution data storage
  - Flexible message history loading (from memory or API)
  - Agent collaboration capabilities
  - Dynamic context injection (room info, participants, messages, tools)
  - Configurable streaming options
- **Band Trigger Node**: Real-time event listening via WebSocket connections
  - Multi-room support (single, multiple, or all rooms)
  - Regex-based room filtering
  - Auto-subscribe to new rooms
  - Message Created event support
- **Band API Credentials**: Secure credential management for API authentication
- Comprehensive documentation including:
  - User guides for both nodes
  - Architecture documentation
  - Memory system guide
  - System prompt templates
  - Glossary of domain-specific terms

[Unreleased]: https://github.com/thenvoi/n8n-nodes-thenvoi/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/thenvoi/n8n-nodes-thenvoi/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/thenvoi/n8n-nodes-thenvoi/releases/tag/v0.1.0
