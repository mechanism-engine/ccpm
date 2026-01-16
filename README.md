# ccpm

Unofficial extension manager for Cocos Creator - deploy extensions from npm to projects.

ccpm is a thin synchronization layer that allows Cocos Creator editor extensions to be distributed and composed via npm.

## How it works
- Scans the project `node_modules` for packages that declare `ccpm.extension` metadata.
- Uses that metadata to locate the extension source folder and the name it should have inside `extensions/`.
- Copies the extension into the `extensions/<name>` folder in your Cocos Creator project.

## Accepting Obsolescence

If Cocos Creator ever adds native support for loading extensions from `node_modules`:

- ccpm becomes unnecessary
- projects can stop using it immediately
- no migration or lock-in is required

ccpm was designed with this outcome in mind.

## Install in a Cocos Creator project

1. Add your extension packages and ccpm as dev dependencies:
   ```sh
   npm install --save-dev @mechanism-engine/ccpm @your-scope/my-extension
   ```

2. Deploy extensions:
   ```sh
   npx ccpm install
   ```
   Optionally, add a postinstall hook to automate this (best practice):
   ```json
   {
     "scripts": {
       "postinstall": "ccpm install"
     }
   }
   ```

   Alternatively, install ccpm globally for multi-project use:
   ```sh
   npm install -g @mechanism-engine/ccpm
   ccpm install
   ```

3. Add ccpm-managed extensions to `.gitignore`:
   ```gitignore
   # ccpm-managed extensions
   extensions/my-extension/
   extensions/.ccpm-state.json
   ```

## Declare an extension package
Each extension package needs to advertise where its Cocos Creator files live:

```json
{
  "name": "@your-scope/my-extension",
  "version": "0.1.0",
  "files": ["ccpm-extension/**"],
  "ccpm": {
    "extension": {
      "root": "ccpm-extension",
      "name": "my-extension"
    }
  }
}
```

`root` points to the folder with `package.json` + `tsconfig` + `dist` for the extension; `name` is the folder created under `extensions/` inside the Cocos Creator project.

For a complete extension package setup with tests and development workflow, see [ccpm-extension-template](https://github.com/mechanism-engine/ccpm-extension-template).

## Commands

### Project commands (run from Cocos Creator project)

- `ccpm list [-p, --project <path>]` - List discovered extensions and their deployment status.
- `ccpm install [-p, --project <path>] [--clean]` - Copy extensions into `extensions/`. `--clean` removes stale extensions.

### Package commands (run from extension package)

- `ccpm validate [path]` - Validate package structure before publishing to npm.

Run project commands from the Cocos Creator project root or pass `-p` to specify the path.

## Validating a package

Before publishing your extension to npm, validate the package structure:

```sh
cd my-extension
npx ccpm validate
```

This checks:
- Root `package.json` has `ccpm.extension` with `root` and `name`
- Root directory exists
- Extension manifest has required fields (`name`, `version`)

## Typical workflow

1. Install your extension packages and `@mechanism-engine/ccpm` into the Cocos Creator project.
2. Run `npx ccpm install` to deploy extensions to the `extensions/` folder.
3. Before publishing an extension, run `npx ccpm validate` from the package directory.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Xiamen Yaji Software Co., Ltd. or the Cocos team.

"Cocos" and "Cocos Creator" are trademarks of Xiamen Yaji Software Co., Ltd.
