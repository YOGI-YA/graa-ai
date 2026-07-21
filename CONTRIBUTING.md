# Contributing to Graa AI

Thank you for helping improve Graa AI.

## Before you start

- Search existing issues and pull requests to avoid duplicate work.
- For substantial changes, open an issue first to discuss the approach.
- Keep pull requests focused on one change.

## Local development

1. Fork the repository and create a branch from `main`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set the required values.
4. Run `npx prisma db push` for your development database.
5. Start the app with `npm run dev`.

## Pull requests

- Explain what changed and why.
- Include screenshots for user-interface changes.
- Run `npm run lint` and `npm run build` where practical.
- Do not commit API keys, `.env` files, generated build output, or unrelated formatting changes.

By contributing, you agree that your contributions are licensed under the MIT License.
