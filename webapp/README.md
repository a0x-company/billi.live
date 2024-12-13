# Webapp (billi.live)

## Table of Contents

- [Description](#description)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

## Description

`billi.live` is a livestreaming platform designed for tokens, enabling users to broadcast live and manage their streams efficiently. The application is built with Next.js, integrating multiple APIs to handle authentication, livestreaming, and communication with automated agents.

## Technologies Used

- **Next.js**: React framework for building web applications.
- **TypeScript**: Superset of JavaScript with static typing.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Axios**: HTTP client for making API requests.
- **NextAuth.js**: Authentication library for Next.js.
- **Livepeer**: Platform for livestreaming.
- **Three.js**: JavaScript 3D library for creating animated graphics.
- **Farcaster**: Platform for user authentication and management.
- **Firebase**: Backend services for actions like saving and updating users.
- **HLS.js**: JavaScript library that plays HLS (HTTP Live Streaming) in browsers that do not natively support it.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/a0x-company/billi.live.git
   cd webapp
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root of the project and add the necessary variables. Refer to the `.env` files within the `webapp`, `agent`, and `backend` directories for more details.

   ```env
   # webapp/.env
   API_URL=https://api.your-domain.com
   NEYNAR_API_KEY=your_api_key
   # ... other variables

   # agent/.env
   # Variables for the agent

   # backend/src/cmd/billi-backend/.env
   # Variables for the backend
   ```

## Configuration

Ensure that the environment variables are correctly set in the `.env` files mentioned above. Additionally, review the ESLint configuration in `.eslintrc.json` to maintain code quality.

## Usage

1. **Start the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000).

2. **Build for production:**

   ```bash
   npm run build
   ```

3. **Start the production server:**

   ```bash
   npm start
   ```

## Available Scripts

- `npm run dev`: Starts the server in development mode.
- `npm run build`: Builds the application for production.
- `npm start`: Starts the server in production mode.
- `npm run lint`: Runs ESLint to check code quality.
- `npm run format`: Formats the code using Prettier.
