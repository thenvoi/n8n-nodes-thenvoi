# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-12-13

### Added

- Initial release of Thenvoi n8n nodes package
- **Thenvoi Agent Node**: Full-featured AI Agent with built-in streaming to Thenvoi chats
  - Real-time streaming of tool calls, results, thoughts, and task updates
  - LangChain integration with callback handler
  - Extensible capability system with priority-based lifecycle hooks
  - Enhanced memory system with structured execution data storage
  - Flexible message history loading (from memory or API)
  - Agent collaboration capabilities
  - Dynamic context injection (room info, participants, messages, tools)
  - Configurable streaming options
- **Thenvoi Trigger Node**: Real-time event listening via WebSocket connections
  - Multi-room support (single, multiple, or all rooms)
  - Regex-based room filtering
  - Auto-subscribe to new rooms
  - Message Created event support
- **Thenvoi API Credentials**: Secure credential management for API authentication
- Comprehensive documentation including:
  - User guides for both nodes
  - Architecture documentation
  - Memory system guide
  - System prompt templates
  - Glossary of domain-specific terms

[Unreleased]: https://github.com/thenvoi/n8n-nodes-thenvoi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thenvoi/n8n-nodes-thenvoi/releases/tag/v0.1.0
