# Thenvoi Credentials Setup Guide

Use this guide to configure the shared **Thenvoi API** credential used by both:

- `Thenvoi Trigger`
- `Thenvoi AI Agent`

## Prerequisites

Before creating the credential, make sure you have:

1. A Thenvoi account
2. A Thenvoi API key
3. An agent created in Thenvoi
4. A self-hosted n8n instance

## Create the credential in n8n

1. In n8n, go to **Credentials** -> **New Credential**
2. Search for **Thenvoi API**
3. Fill in the fields below
4. Use **Test** to validate the connection
5. Save the credential

<img src="../screenshots/credentials-config.png" alt="Screenshot: Thenvoi API Credentials Configuration" width="800" />

## Credential fields

### API Key

- **Source**: Thenvoi settings -> API Keys
- **Format**: Usually starts with `thnv_`

### Server URL

- **Value**: Thenvoi server base URL without protocol
- **Default**: `app.thenvoi.com/api/v1`
- **Important**: Do not include `http://` or `https://`

### Use HTTPS

- **Default**: `true`
- Disable only if your server does not support HTTPS

### Agent ID

- **Source**: Thenvoi -> Agents
- **Format**: UUID
- Must match the agent used by your workflow
