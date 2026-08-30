# Change Log

All notable changes to the "vcode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.4] - 2026-08-29

- Add a built-in macro library that ships with the extension: 23 common JavaScript macros for text, lines, encoding, JSON, naming, SQL, JavaScript and dates, loaded automatically at startup.
- Add `VCode: Browse Built-in Macros` (run, copy to workspace, open source, copy code), `VCode: Copy Built-in Macro to Workspace` and `VCode: Reload Built-in Macros`.
- Add `vcode.macro.builtins.enabled` and `vcode.macro.builtins.exclude` settings.
- Macro pickers and the playground now show where each macro comes from (user, file, built-in); built-in macros are read-only.
- Replace the hard-coded default macros in settings with the built-in library.

## [0.0.2] - 2026-02-06

- Documentation and metadata cleanup.
- Add Python macro execution support.
- Add Python macro snippets and default to python3 interpreter fallback.

## [0.0.1] - 2026-02-05

- Initial macro-only release.
