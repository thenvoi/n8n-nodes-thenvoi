# Development Guide

This guide is for developers working on `@band-ai/n8n-nodes-band`.

## Prerequisites

Install the following on your development machine:

- [git](https://git-scm.com/downloads)
- Node.js and npm (minimum Node 22). You can use [nvm](https://github.com/nvm-sh/nvm).
- `n8n` CLI:

  ```bash
  npm install n8n -g
  ```

- Recommended: follow n8n's [node development environment guide](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

## Setup

1. Clone this repository:

   ```bash
   git clone https://github.com/thenvoi/n8n-nodes-thenvoi.git
   cd n8n-nodes-band
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build once:

   ```bash
   npm run build
   ```

4. Publish this package locally:

   ```bash
   npm link
   ```

## Connect to a local n8n instance

### First-time setup

1. Ensure the custom extensions directory exists (default location):

   ```bash
   mkdir -p ~/.n8n/custom
   cd ~/.n8n/custom
   ```

   If your n8n instance uses a custom extensions path via `N8N_CUSTOM_EXTENSIONS`,
   use that directory instead of `~/.n8n/custom`.

2. Link this package into your n8n extensions directory:

   ```bash
   npm link @band-ai/n8n-nodes-band
   ```

   This package name must match the `name` field in `package.json`.

### Run n8n

- Standard mode:

  ```bash
  n8n start
  ```

- Hot reload mode:

  ```bash
  N8N_DEV_RELOAD=true n8n start
  ```

Open the UI at `http://localhost:5678`.

### Run this project in watch mode

```bash
npm run dev
```

## Available scripts

- `npm run build` - Compile TypeScript and build the project
- `npm run dev` - Watch mode for development
- `npm run lint` - Check for linting errors
- `npm run lintfix` - Automatically fix linting errors
- `npm run format` - Format code with Prettier

## Branching (`dev` and `main`)

- **`dev`** - Day-to-day integration branch. Open PRs into `dev`.
- **`main`** - Release branch. Merge `dev` into `main` when you are ready to release.

CI runs on every push and PR via [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`lint`, `build`).

## Releases and npm publishing

Releases use [Release Please](https://github.com/googleapis/release-please) via [`.github/workflows/release.yml`](.github/workflows/release.yml), which runs on pushes to `main`.

### Typical release flow

1. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `feat!:`).
2. Merge `dev` into `main`.
3. Release Please opens or updates a release PR.
4. Merge the release PR to create a GitHub release and run `npm publish`.

### npm authentication

Preferred: configure npm Trusted Publishing (OIDC) for GitHub Actions.

Fallback: add an npm automation token as repository secret `NPM_TOKEN`.

## Project structure

```plaintext
├── lib/                        # Shared library code
│   ├── api/                    # API clients for Band operations
│   ├── http/                   # HTTP client implementation
│   ├── socket/                 # WebSocket connection and channel management
│   ├── types/                  # Shared type definitions
│   └── utils/                  # Shared utility functions
├── nodes/
│   ├── BandAgent/           # AI Agent node
│   └── BandTrigger/         # Trigger node
├── credentials/                # API credential configuration
├── docs/                       # Documentation
├── templates/                  # Agent system prompt templates
└── dist/                       # Compiled output (generated)
```

## Extending nodes

### Adding new event types (`BandTrigger`)

1. Add a handler in `nodes/BandTrigger/handlers/events/`.
2. Implement `IEventHandler` from `handlers/events/base/`.
3. Register in `EventHandlerRegistry`.
4. Add configuration in `config/nodeConfig.ts`.

### Adding new capabilities (`BandAgent`)

1. Add a capability in `nodes/BandAgent/capabilities/yourCapability/`.
2. Implement `Capability` from `capabilities/base/Capability.ts`.
3. Set a `CapabilityPriority`.
4. Implement lifecycle hooks as needed (`onSetup`, `onPrepare`, `onSuccess`, `onError`, `onFinalize`).
5. Register capability in `execution.ts` (`createCapabilitiesRegistry`).
6. Export from `capabilities/index.ts`.

Built-in capabilities:

- **Messaging capability** - Streams task updates, thoughts, tool calls/results, and final responses to Band, and manages message processing status.
- **Agent collaboration capability** - Provides tools to list/add/remove participants and keeps participant context updated for agent workflows.

Capability priorities:
- `CRITICAL (0)` - Must run first
- `HIGH (25)` - Important setup/features
- `NORMAL (50)` - Default
- `LOW (75)` - Runs later
- `CLEANUP (100)` - Runs last

## Packaging requirements for n8n community nodes

If you add or rename package metadata, keep n8n package requirements valid:

- Name must follow `n8n-nodes-<name>` or `@scope/n8n-nodes-<name>`
- Include keyword `n8n-community-node-package`
- Keep `n8n` section in `package.json` aligned with built credential/node paths
