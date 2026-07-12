# Afgventura installation

This fork uses a committed public extension key, so every unpacked build has the same Chrome
extension ID:

```text
gmolioeebfppjehkofcpiefglimgdbog
```

The key in the manifest is public identity material, not a private signing key. Do not add a
private `.pem` key to this repository.

This fork also uses the exclusive native-host name `com.afgventura.chromemcp.nativehost` and a
versioned extension-to-bridge handshake. An upstream or incompatible bridge therefore fails closed
instead of starting a partially compatible MCP server.

## First-time installation on macOS

Prerequisites:

- Google Chrome
- Git
- Node.js 20 or newer, including Corepack
- Access to `afgventura/mcp-chrome`

Clone the repository and run the installer:

```bash
git clone git@github.com:afgventura/mcp-chrome.git
cd mcp-chrome
./scripts/install-local-macos.sh
```

Use this installer for both halves of the integration. Do not pair this fork's extension with the
upstream `mcp-chrome-bridge` npm package: Chrome Native Messaging authorizes an exact extension ID,
and independently released upstream builds may authorize a different ID. The installer now fails
if the generated native-host manifest does not authorize this fork's stable extension ID.

Then complete the one Chrome-managed step:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `app/chrome-extension/.output/chrome-mv3` inside the clone.
5. Open **Chrome MCP Server** and click **Connect**.

The bridge listens locally at `http://127.0.0.1:12306/mcp` while the extension is connected.
It uses stateless HTTP request dispatch, so multiple Codex and Claude sessions can share the same
bridge safely and remain usable after the native host reconnects.

The extension also installs a browser-persisted 30-second watchdog. Chrome alarms wake the
Manifest V3 service worker after suspension and reconnect the native host automatically; users
should not normally need to reopen the popup or click **Connect** after the first setup.

## Downloading a prebuilt extension

GitHub Actions publishes `chrome-mcp-extension.zip` for every build. Tagged versions (`v*`) also
attach the same ZIP to the corresponding GitHub Release.

1. Download `chrome-mcp-extension.zip` from a GitHub Release and extract it to a permanent folder.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder.

The ZIP only replaces the extension build step. The native bridge is a local executable and must
still be installed from a repository clone with `./scripts/install-local-macos.sh`. Because the
extension has a stable public identity, the downloaded build uses the same extension ID as a local
build.

## Updating

Pull changes and rerun the same installer:

```bash
git pull --ff-only
./scripts/install-local-macos.sh
```

Open `chrome://extensions/` and click the extension's reload button. The extension ID and native
host authorization remain stable even when the repository lives at a different path.

If you installed the extension from a GitHub Release, download and extract the newer ZIP into the
same folder, then click the extension's reload button.

## Codex and Claude

Register the local HTTP endpoint after the extension is connected:

```bash
codex mcp add chrome-mcp --url http://127.0.0.1:12306/mcp
claude mcp add --transport http --scope user chrome-mcp http://127.0.0.1:12306/mcp
```

Restart an already-running agent session after adding the MCP server.

## Diagnostics

```bash
node app/native-server/dist/cli.js doctor
```

If connectivity fails, confirm the extension is loaded, reload it, and click **Connect** again.
The watchdog may take up to 30 seconds to restore the listener after Chrome resumes from a fully
suspended state. Use the doctor command to distinguish a missing listener from an MCP protocol
error:

```bash
node app/native-server/dist/cli.js doctor
curl --fail --silent http://127.0.0.1:12306/ping
```
