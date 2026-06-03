# ActivityLanguageOverride – Vencord Plugin

Override the language that Discord reports to **specific games / activities** via the Discord RPC system, without touching your own Discord language setting.

## What it does

When a game connects to Discord via RPC (so it can show Rich Presence, join buttons, etc.) Discord tells the game your client locale.  Some games (like **Codenames**) use that locale to decide which language to display.  This plugin intercepts that locale value for chosen applications and substitutes a locale of your choice.

**Everything else in Discord stays in your normal language.**  Only the locale reported to activities you configure is changed.

---

## Installation

1. Make sure you have a **local Vencord source build** (not the installer).  If you don't, follow the [Vencord build guide](https://vencord.dev/contributing).
2. Copy the `activityLanguageOverride/` folder into:
   ```
   <vencord-repo>/src/userplugins/activityLanguageOverride/
   ```
3. Run `pnpm build` (or `pnpm build --watch` for dev mode) in the Vencord repo.
4. Restart Discord, open **Settings → Vencord → Plugins**, search for **ActivityLanguageOverride**, and enable it.

---

## Configuration

1. Open **Settings → Vencord → Plugins → ActivityLanguageOverride → Settings**.
2. Click **Add Rule**.
3. Enter the **Application ID** (the numeric `client_id`) of the game.  
   - Find it on the [Discord Developer Portal](https://discord.com/developers/applications) or in the game's own Rich Presence documentation.
4. Optionally give it a human-readable **label** (e.g. "Codenames").
5. Pick the **language** you want that game to see.
6. Click **Add Rule**.

The override takes effect the next time that game connects to Discord.

---

## How it works (technical)

This plugin:

1. **Tracks the active activity** by listening to Discord's internal `FluxDispatcher` events (`EMBEDDED_ACTIVITY_LAUNCH_START`, `EMBEDDED_ACTIVITY_LAUNCH_SUCCESS`, and `RPC_APP_CONNECTED`).
2. **Globally hooks native message transport** (`MessagePort.prototype.postMessage` and `JSON.stringify`) to intercept and mutate the `USER_SETTINGS_GET_LOCALE` response payload right before it is dispatched to the activity's iframe.

This ensures the override is perfectly scoped and only visible to the configured games, while keeping the rest of your Discord client in your original language.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Language not changing | The game caches locale on first launch | Restart the game after adding the rule |
| Application ID validation fails | You copied the *app name* instead of the numeric ID | Open the [Developer Portal](https://discord.com/developers/applications) and copy the 17–19 digit number under "Application ID" |
| Plugin not visible in settings | Build wasn't re-run after copying files | Run `pnpm build` again and restart Discord |

---

## License

MIT (see the LICENSE file for more information)
