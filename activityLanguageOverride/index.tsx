/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findByProps } from "@webpack";
import { Button, Forms, React, FluxDispatcher } from "@webpack/common";


// ─── Constants ────────────────────────────────────────────────────────────────

/** All locale codes that Discord's RPC system recognises. */
const LOCALE_OPTIONS = [
    { label: "Bulgarian (bg)", value: "bg" },
    { label: "Chinese, Simplified (zh-CN)", value: "zh-CN" },
    { label: "Chinese, Traditional (zh-TW)", value: "zh-TW" },
    { label: "Croatian (hr)", value: "hr" },
    { label: "Czech (cs)", value: "cs" },
    { label: "Danish (da)", value: "da" },
    { label: "Dutch (nl)", value: "nl" },
    { label: "English, UK (en-GB)", value: "en-GB" },
    { label: "English, US (en-US)", value: "en-US" },
    { label: "Finnish (fi)", value: "fi" },
    { label: "French (fr)", value: "fr" },
    { label: "German (de)", value: "de" },
    { label: "Greek (el)", value: "el" },
    { label: "Hindi (hi)", value: "hi" },
    { label: "Hungarian (hu)", value: "hu" },
    { label: "Indonesian (id)", value: "id" },
    { label: "Italian (it)", value: "it" },
    { label: "Japanese (ja)", value: "ja" },
    { label: "Korean (ko)", value: "ko" },
    { label: "Lithuanian (lt)", value: "lt" },
    { label: "Norwegian (no)", value: "no" },
    { label: "Polish (pl)", value: "pl" },
    { label: "Portuguese, Brazilian (pt-BR)", value: "pt-BR" },
    { label: "Romanian (ro)", value: "ro" },
    { label: "Russian (ru)", value: "ru" },
    { label: "Spanish (es-ES)", value: "es-ES" },
    { label: "Spanish, LATAM (es-419)", value: "es-419" },
    { label: "Swedish (sv-SE)", value: "sv-SE" },
    { label: "Thai (th)", value: "th" },
    { label: "Turkish (tr)", value: "tr" },
    { label: "Ukrainian (uk)", value: "uk" },
    { label: "Vietnamese (vi)", value: "vi" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityLocaleRule {
    /** The Discord application ID (client_id) of the game / activity. */
    applicationId: string;
    /** The BCP-47 locale code to report to this activity. */
    locale: string;
    /** Optional human-readable label so you remember what the ID belongs to. */
    label: string;
}

// ─── Plugin state ─────────────────────────────────────────────────────────────

/**
 * Tracks which application is currently connected via RPC so the locale patcher
 * can return the right override without breaking other locale consumers.
 */
let currentRpcAppId: string | null = null;



// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = definePluginSettings({
    config: {
        type: OptionType.COMPONENT,
        description: "Per-activity locale overrides",
        component: RulesComponent,
    },
}).withPrivateSettings<{
    config: ActivityLocaleRule[];
}>();

// ─── Settings UI ──────────────────────────────────────────────────────────────

const emptyRule = (): ActivityLocaleRule => ({
    applicationId: "",
    locale: "en-US",
    label: "",
});

function RulesComponent() {
    const [rules, setRules] = React.useState<ActivityLocaleRule[]>(
        () => settings.store.config ?? []
    );
    const [newRule, setNewRule] = React.useState<ActivityLocaleRule>(emptyRule());
    const [appIdError, setAppIdError] = React.useState("");

    function persist(next: ActivityLocaleRule[]) {
        setRules(next);
        settings.store.config = next;
    }

    function validateAndAdd() {
        const id = newRule.applicationId.trim();
        if (!id) {
            setAppIdError("Application ID is required.");
            return;
        }
        if (!/^\d{17,20}$/.test(id)) {
            setAppIdError("Must be a numeric Discord application / client ID.");
            return;
        }
        if (rules.some(r => r.applicationId === id)) {
            setAppIdError("A rule for this application already exists.");
            return;
        }
        setAppIdError("");
        persist([...rules, { ...newRule, applicationId: id }]);
        setNewRule(emptyRule());
    }

    function remove(idx: number) {
        persist(rules.filter((_, i) => i !== idx));
    }

    function updateRule(idx: number, patch: Partial<ActivityLocaleRule>) {
        persist(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    }

    const styles: Record<string, React.CSSProperties> = {
        card: {
            background: "var(--background-secondary)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 8,
            display: "flex",
            flexDirection: "column" as const,
            gap: 8,
        },
        row: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap" as const,
        },
        tag: {
            background: "var(--background-accent)",
            color: "var(--header-primary)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 12,
            fontFamily: "var(--font-code)",
        },
        error: {
            color: "var(--status-danger)",
            fontSize: 12,
            marginTop: 2,
        },
        addCard: {
            background: "var(--background-tertiary)",
            borderRadius: 8,
            padding: "16px",
            marginTop: 12,
            display: "flex",
            flexDirection: "column" as const,
            gap: 10,
        },
        label: {
            color: "var(--header-secondary)",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
            marginBottom: 2,
        },
        hint: {
            color: "var(--text-muted)",
            fontSize: 12,
            marginTop: 4,
        },
    };

    return (
        <div>
            <Forms.FormTitle>Activity Language Overrides</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 12 }}>
                For each activity listed below, Discord will report the chosen language
                to the game/app instead of your normal Discord language.
                Find a game's <strong>Application ID</strong> on the{" "}
                <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--text-link)" }}
                >
                    Discord Developer Portal
                </a>{" "}
                or in the game's Rich Presence docs.
            </Forms.FormText>

            {/* Existing rules */}
            {rules.length === 0 && (
                <Forms.FormText style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    No rules yet. Add one below.
                </Forms.FormText>
            )}
            {rules.map((rule, i) => (
                <div key={rule.applicationId} style={styles.card}>
                    <div style={styles.row}>
                        <span style={styles.tag}>{rule.applicationId}</span>
                        <input
                            style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 4, border: "1px solid var(--background-tertiary)", background: "var(--background-secondary-alt)", color: "var(--text-normal)" }}
                            placeholder="Label (optional)"
                            value={rule.label}
                            onChange={e => updateRule(i, { label: e.target.value })}
                            onKeyDown={e => e.stopPropagation()}
                        />
                        <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                            onClick={() => remove(i)}
                        >
                            Remove
                        </Button>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Override locale:</span>
                        <select
                            style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 4, border: "1px solid var(--background-tertiary)", background: "var(--background-secondary-alt)", color: "var(--text-normal)" }}
                            value={rule.locale}
                            onChange={e => updateRule(i, { locale: e.target.value })}
                            onKeyDown={e => e.stopPropagation()}
                        >
                            {LOCALE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ))}

            {/* Add new rule */}
            <div style={styles.addCard}>
                <Forms.FormTitle tag="h5">Add New Rule</Forms.FormTitle>
                <div>
                    <div style={styles.label}>Application ID</div>
                    <input
                        style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--background-tertiary)", background: "var(--background-secondary-alt)", color: "var(--text-normal)" }}
                        placeholder="e.g. 356869127241072640"
                        value={newRule.applicationId}
                        onChange={e => {
                            setNewRule(r => ({ ...r, applicationId: e.target.value }));
                            setAppIdError("");
                        }}
                        onKeyDown={e => e.stopPropagation()}
                    />
                    {appIdError && <div style={styles.error}>{appIdError}</div>}
                    <div style={styles.hint}>
                        The numeric client_id of the activity (find it on the Discord Developer Portal).
                    </div>
                </div>
                <div>
                    <div style={styles.label}>Label (optional)</div>
                    <input
                        style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--background-tertiary)", background: "var(--background-secondary-alt)", color: "var(--text-normal)" }}
                        placeholder="e.g. Codenames"
                        value={newRule.label}
                        onChange={e => setNewRule(r => ({ ...r, label: e.target.value }))}
                        onKeyDown={e => e.stopPropagation()}
                    />
                </div>
                <div>
                    <div style={styles.label}>Language to report</div>
                    <select
                        style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--background-tertiary)", background: "var(--background-secondary-alt)", color: "var(--text-normal)" }}
                        value={newRule.locale}
                        onChange={e => setNewRule(r => ({ ...r, locale: e.target.value }))}
                        onKeyDown={e => e.stopPropagation()}
                    >
                        {LOCALE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <Button
                    color={Button.Colors.GREEN}
                    size={Button.Sizes.MEDIUM}
                    style={{ alignSelf: "flex-start" }}
                    onClick={validateAndAdd}
                >
                    Add Rule
                </Button>
            </div>
        </div>
    );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getOverrideForApp(appId: string | null): string | null {
    if (!appId) return null;
    const rules: ActivityLocaleRule[] = settings.store.config ?? [];
    return rules.find(r => r.applicationId === appId)?.locale ?? null;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "ActivityLanguageOverride",
    description:
        "Override the language/locale reported to specific activities (games) via Discord RPC, without changing your own Discord language.",
    authors: [{ name: "you", id: 0n }],
    settings,

    patches: [],

    start() {
        // Initialise the config array in the store if needed.
        if (!settings.store.config) settings.store.config = [];

        // --- NEW APPROACH: Hook Browser Native Serialization & Transport ---
        // Since Discord uses a hidden MessageChannel/MessagePort or JSON strings
        // for its RPC server, we can globally intercept the response payload
        // right before it's sent back to the iframe.
        
        const origStringify = JSON.stringify;
        (this as any)._origStringify = origStringify;
        JSON.stringify = function(value, replacer, space) {
            if (value && typeof value === "object" && value.cmd === "USER_SETTINGS_GET_LOCALE" && value.data && typeof value.data.locale === "string") {
                const override = getOverrideForApp(currentRpcAppId);
                if (override) {
                    console.log("[ActivityLanguageOverride] Intercepted on JSON.stringify! Modifying payload to:", override);
                    value.data.locale = override;
                }
            }
            return origStringify.call(this, value, replacer as any, space);
        };

        const origPortPostMessage = MessagePort.prototype.postMessage;
        (this as any)._origPortPostMessage = origPortPostMessage;
        MessagePort.prototype.postMessage = function(message, transfer) {
            if (message && typeof message === "object" && message.cmd === "USER_SETTINGS_GET_LOCALE" && message.data && typeof message.data.locale === "string") {
                const override = getOverrideForApp(currentRpcAppId);
                if (override) {
                    console.log("[ActivityLanguageOverride] Intercepted on MessagePort.postMessage! Modifying payload to:", override);
                    message.data.locale = override;
                }
            }
            return origPortPostMessage.call(this, message, transfer);
        };

        // 1. Listen for activity launches to know which app is active.
        (this as any)._onActivityLaunch = (action: any) => {
            console.log("[ActivityLanguageOverride] Launch event:", action.type, action.applicationId);
            if (action?.applicationId) {
                currentRpcAppId = action.applicationId;
            }
        };
        FluxDispatcher.subscribe("EMBEDDED_ACTIVITY_LAUNCH_START", (this as any)._onActivityLaunch);
        FluxDispatcher.subscribe("EMBEDDED_ACTIVITY_LAUNCH_SUCCESS", (this as any)._onActivityLaunch);
        
        // Also sniff local RPC connections just in case
        (this as any)._onRpcConnect = (action: any) => {
            console.log("[ActivityLanguageOverride] RPC connect:", action.type, action.applicationId, action.clientId);
            if (action?.applicationId) {
                currentRpcAppId = action.applicationId;
            } else if (action?.clientId) {
                currentRpcAppId = action.clientId;
            }
        };
        FluxDispatcher.subscribe("RPC_APP_CONNECTED", (this as any)._onRpcConnect);
    },

    stop() {
        if ((this as any)._origStringify) {
            JSON.stringify = (this as any)._origStringify;
        }
        if ((this as any)._origPortPostMessage) {
            MessagePort.prototype.postMessage = (this as any)._origPortPostMessage;
        }
        FluxDispatcher.unsubscribe("EMBEDDED_ACTIVITY_LAUNCH_START", (this as any)._onActivityLaunch);
        FluxDispatcher.unsubscribe("EMBEDDED_ACTIVITY_LAUNCH_SUCCESS", (this as any)._onActivityLaunch);
        FluxDispatcher.unsubscribe("RPC_APP_CONNECTED", (this as any)._onRpcConnect);
        currentRpcAppId = null;
    },
});
