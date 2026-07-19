import { mergeConfig } from '../config.defaults.js';
import { initFloatingChat } from '../core/FloatingChat.js';
import { setupAuroraContext } from './aurora-context.js';

/** Aurora Dialogue preset for management portal / viewer. */
export function initAuroraChat() {
    const config = mergeConfig({
        title: 'Aurora Dialogue',
        welcomeMessage: 'Hello! I am Aurora Dialogue. How can I help you today?',
        storageKeys: {
            chatStatePrefix: 'aurora_chat_',
            apiKeys: 'aurora_gemini_api_keys',
            legacyApiKey: 'aurora_gemini_api_key',
        },
        bridge: {
            enabled: true,
            url: 'http://localhost:3002/save_history',
        },
        context: {
            enabled: true,
            showDocPicker: true,
        },
        globalApiName: 'auroraChat',
        settingsHelpHtml: `
            <p style="margin: 0 0 8px 0;">Aurora Dialogue は <strong style="color: #00f2fe;">Google Gemini API</strong> を使用してAI応答を生成します。</p>
            <p style="margin: 0 0 8px 0;">APIキーは <strong>無料</strong> で取得でき、以下の手順で設定できます：</p>
            <ol style="margin: 0 0 8px 0; padding-left: 18px;">
                <li>下のリンクから Google AI Studio にアクセス</li>
                <li>「Get API key」→「Create API key」をクリック</li>
                <li>生成されたキーをコピーして下の入力欄に貼り付け</li>
            </ol>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; color: #00f2fe; text-decoration: none; font-weight: 600; padding: 6px 12px; background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3); border-radius: 6px;">
                🔑 Google AI Studio でキーを取得 <span style="font-size: 0.75rem;">↗</span>
            </a>
        `,
        onReady: setupAuroraContext,
    });

    return initFloatingChat(config);
}
