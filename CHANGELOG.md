# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/thenvoi/n8n-nodes-thenvoi/compare/n8n-nodes-thenvoi-v0.1.0...n8n-nodes-thenvoi-v0.2.0) (2026-03-21)


### Features

* Add debug logging for HTTP responses ([4de0462](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/4de0462c254acd3fccef8dff2e2a95d8213f2309))
* add intermediate thoughts option for per-LLM-turn thought sending ([49d3d7d](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/49d3d7d464a790cdb0f602072c9d44a9c3c1bb3f))
* Add new Agent API endpoints (peers, context, agent/me) ([e34cefa](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/e34cefa87d798fb2a869f2703e94e76a7d54c397))
* add Release Please, CI workflow, and scoped package name ([de7c04c](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/de7c04c71f14cf3400a62e67e98abe1fc79edb4b))
* add Release Please, CI workflow, and scoped package name ([7b3f5fd](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/7b3f5fdbac4be4b9650ae2c0d9ed9cdd6830880a))
* add room deletion detection via room_participants channel ([cd3d105](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/cd3d105795ed8c0cf1e1b23531d04a187c3c5128))
* Add structured API error handling ([775e816](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/775e816f31a79b65748eb2e9a24780df12a20892))
* **agent:** enforce [@mention](https://github.com/mention) requirement for text messages ([26bf89c](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/26bf89ccb7b393e185588db02f5179a61ab71b83))
* align mention detection with handle character rules ([b62e904](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/b62e90405ce11132de17f51f8d9cb9a920e2d17e))
* API changes for message/event routing and room management ([2d17d40](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/2d17d40af7e35dc21a07219a3c8b4326682461bf))
* **api:** split chat API into messages and events endpoints ([24cb418](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/24cb4181150341fa6a0482e420601c2dd1c93c43))
* **callbacks:** capture intermediate steps in callback handler ([c90afab](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/c90afabba99186d100849133d8c81c74f0dc94f7))
* **config:** add sender ID and type parameters to node configuration ([4036645](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/4036645a3d841bdae9ce98f96d221f4bdfddcd0a))
* Enable adding users to chat via AddParticipantTool ([ec2403a](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/ec2403a8a556dfac2667c06e24921bfec8111dbb))
* **execution:** integrate memory with callback handler for step capture ([86d070c](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/86d070cd0ee3348fadd4e7300b8880a22ee891b7))
* Fetch all available participants via pagination ([c76bbdd](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/c76bbddb57c54785bb36661258a8a256abd2bc37))
* **formatters:** output messages as JSON with structured data support ([622341d](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/622341dc448c40b5c2d423380f9e02d93abaf966))
* **memory:** add structured data storage to ThenvoiMemory ([96f2c67](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/96f2c67c1417608ba5d646d09ae57b9f60f712dd))
* Migrate to Agent API v1 and improve code style ([2e85e38](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/2e85e38711c5f6bbf076a9dadcfd45f83c60b8d4))
* send error events to channel on agent and tool failure ([bc9a69d](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/bc9a69de0eb2688628cb5805aed909fbd32ff25f))
* switch agent mention flow to handle-based mentions ([b80cb93](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/b80cb93f58e95bb9ed2838a7c4f5c85e10b1eae1))
* thoughts improvements — intermediate thoughts mode, tool-call fix, ReAct removal ([f4d047f](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/f4d047fc8bc1e45f455afeee0efa59f69950a0f5))
* **trigger:** improve room management and cleanup ([72f68a9](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/72f68a9f28cbab67b787ef9a6e97e2f6cc15a138))
* update agent prompt to require handle-based mentions ([29689af](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/29689af67653f77d3c977ecc9f9f005fc0a7e535))
* updated package description ([94e7274](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/94e72747b53841b9b282d066ed3c5418ef5ca217))


### Bug Fixes

* available participant format ([3b8e3cf](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/3b8e3cf1452463492610a677f3083de28c7e516f))
* centralize auth validation and robust error formatting ([1323e66](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/1323e660e297345d789d42db7067f549304e2232))
* fail fast on invalid auth token in agent and trigger ([5ec0d2d](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/5ec0d2ddaa9d7253349a6ee9355f874f7b1e15e0))
* **http:** handle 204 No Content responses and improve error logging ([1a17a66](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/1a17a666cce45418d0fab46da9db58de6ececc8d))
* Improve error logging consistency ([fb1356f](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/fb1356fa992d158c5490394ebdfcd51fe123ac97))
* improve RoomManager initialization order ([b41cbef](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/b41cbef5e89d0f3b1f2de7dffe131428cb685354))
* Make ToolCallData compatible with LangChain indexing ([9c516f8](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/9c516f8eeeb3eae1b60df83b5b7e138777721ced))
* Prevent agents from outputting messages as thoughts ([ca9a066](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/ca9a066348a9ca0c8cac5a3a4bee825c499df673))
* prevent serialized tool-call input from being surfaced as a thought ([405d839](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/405d8391db1f13074fae12c9a552977d3d0a7460))
* prevent thoughts from being sent as object string representation ([e7b6b61](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/e7b6b619c5159561176cdb79d61daacc841c530d))
* propagate room id from socket events to workflow payload ([5a9efda](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/5a9efda40158c5850f55cb0d69760e0f45b27845))
* set release-please target-branch to main ([cfed0ae](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/cfed0aed344ade59619dd05a67f6f23fcfb579b4))
* set release-please target-branch to main ([81fbe0e](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/81fbe0e082e013a1130b3096f281ca5d007d1835))
* support dot and slash in mention handle pattern ([bbf5646](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/bbf564673fff552fc7440a38dab431449c28ff38))
* Update credential test endpoint to /test ([2efa92a](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/2efa92af21712a18ad608da2124ab20243a150b3))
* Update credential test endpoint to use /agent/me ([2a809e3](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/2a809e3e53f89387fe0fec49f1c720169b04acb0))
* Update langchain to 0.3.37 and @langchain/core to 0.3.80 ([e5b8969](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/e5b8969725783debacec6f74c53b8cb957152c97))
* Update langchain to 0.3.37 and @langchain/core to 0.3.80 ([4a0f209](https://github.com/thenvoi/n8n-nodes-thenvoi/commit/4a0f209aa9ac72f70a5440fa8d6c5308942e9ff9))

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
