# Start Here

This file is the preparation checklist for starting Contract Finder without beginning implementation yet.

## Current Status
- Product planning exists
- Initial Phase plan exists
- Phase 0 plan exists
- Project agents are defined in `.opencode/agents/`
- No application code has been created yet

## Confirmed Decisions
- Project folder: `contract-finder`
- Data store: MySQL
- Initial Phase output: logs only
- Scheduler approach for the spike: local script
- Primary data source: Adzuna
- Keep API credentials out of repo files; store them in environment variables later

## Pre-Build Decisions

### 1. Project Folder Naming
- Confirmed: use `contract-finder`

### 2. Repository Setup
- Initialize git in this project
- Create GitHub repository
- Decide default branch name

### 3. Runtime Stack
- Confirm the app runtime: Next.js fullstack on Hostinger
- Confirm the data/auth stack:
  - MySQL
  - auth approach to be decided later

### 4. Initial Phase Output
- Confirmed: logs only

### 5. Scheduler Choice
- Confirmed for the spike: local script
- Hosting-time scheduler can be decided later

### 6. Credentials To Prepare
- App hosting access
- GitHub access
- Adzuna App ID
- Adzuna App Key
- MySQL connection credentials

## Security Note
- Do not store API keys or database passwords in tracked Markdown files
- Keep secrets in environment variables when implementation starts
- Since credentials were shared in chat, consider rotating them if they were real production values

## Suggested Build Order
1. Rename folder
2. Initialize git and GitHub repo
3. Confirm stack decisions
4. Prepare credentials
5. Initialize the app
6. Set up MySQL connectivity and env structure
7. Set up the Initial Phase spike

## Out Of Scope For Preparation
- No app implementation yet
- No auth flow yet
- No job fetch logic yet
- No database schema implementation yet

## Ready To Start Building When
- Stack choice is confirmed
- Credentials are available
- Repo is ready
- Folder naming issue is resolved or intentionally accepted
