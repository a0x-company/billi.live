# Zurf Monorepo

This repository contains the monorepo setup for the Zurf project, which includes various services and cron jobs managed through Google Cloud.

## Table of Contents

- [Getting Started](#getting-started)
- [Commands](#commands)
- [Google Cloud Services](#google-cloud-services)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or later)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/)
- [Google Cloud SDK](https://cloud.google.com/sdk)

### Setup

To set up the project, run the following command:

```sh
make setup
```

## Commands

The following commands are available in the Makefile:

- **Setup the project:**
  ```sh
  make setup
  ```
  Installs all necessary dependencies.

- **Clean the project:**
  ```sh
  make clean
  ```
  Cleans the `dist` and `build` directories.

- **Build the project:**
  ```sh
  make build
  ```
  Builds the project and copies GraphQL files.

- **Run tests:**
  ```sh
  make test
  make test-dev
  ```
  Runs the test commands.

- **Check the project:**
  ```sh
  make check
  ```
  Runs linter, prunes unused exports, and checks for unused dependencies.

- **Run the project in development mode:**
  ```sh
  make dev APP_NAME=example-api
  ```

- **Build Docker image:**
  ```sh
  make docker APP_NAME=example-api
  ```

- **Deploy the application:**
  ```sh
  make deploy APP_NAME=example-api
  ```

- **Deploy a job:**
  ```sh
  make deploy-job APP_NAME=example-job
  ```

- **Deploy a cron job:**
  ```sh
  make deploy-cronjob APP_NAME=example-api SCHEDULE="0 0 * * 0"
  ```

- **Destroy the application:**
  ```sh
  make destroy APP_NAME=example-api
  ```

## Google Cloud Services

We use Google Cloud with the following services:

- **Google Cloud Container Registry**: to store Docker builds.
- **Google Cloud Firestore**: for the production and staging databases.
- **Google Cloud Run**: to run services that need to expose endpoints via Docker, such as APIs.
- **Google Cloud Run Jobs**: to run scripts in the cloud that need to be executed manually, for example, `americas-cup-rewards`.
- **Google Cloud Scheduler**: which uses `Google Cloud Run Jobs` behind the scenes, but these are triggered by a scheduler at specified intervals. For example, `sync-firestore` runs every Sunday at 00:00.
- **Google Cloud Secret Manager**: to store secrets for the executables in the monorepo.
- **Google Cloud Storage**: to store a copy of the database when it is exported from production. For example, `sync-firestore` uses this service temporarily to store a copy of the production database.
- **Google Cloud IAM**: to provide service accounts or federations that allow cloud access from the implementations.

## Project Structure

```plaintext
.
├── Makefile
├── package.json
├── src
│   ├── cmd
│   │   ├── example-api
│   │   │   ├── index.ts
│   │   │   ├── Dockerfile
│   │   │   └── .env
│   │   └── example-job
│   │       ├── index.ts
│   │       ├── Dockerfile
│   │       └── .env
│   ├── internal
│   └── ...
└── ...
```

- `src/cmd`: Contains the main applications and jobs.
- `src/internal`: Contains reusable internal packages.
