# Contributing to VCode

Thanks for taking the time to contribute!

## Development Setup

1. Install dependencies with `pnpm install`.
2. Build the extension with `pnpm run compile`.
3. Run lint checks with `pnpm run lint`.

## Running the Extension

- Open this repo in VS Code.
- Press `F5` to start an Extension Development Host.
- Or run `pnpm run debug` to compile and launch an Extension Development Host in a
  blank, temporary profile with all other extensions disabled. The profile is
  discarded when the window closes, so nothing leaks into your normal setup.
- Use the Command Palette to run `VCode: Open Macro Playground`.

## Project Structure

- `src/extension.ts` — extension activation and registration.
- `src/macro/` — macro manager, executor, file loader, commands, and playground.
- `resources/` — extension icon.

## Coding Guidelines

- Keep changes focused and small.
- Prefer simple, readable code.
- Add or update docs when behavior changes.
- Avoid breaking existing macro files.

## Reporting Issues

Use GitHub Issues and include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs or screenshots if relevant
