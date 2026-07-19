/**
 * @param {object} options
 * @param {string} options.model
 * @param {string} options.sdkUrl
 * @param {() => string[]} options.getApiKeys
 * @param {object} options.i18n
 */
export function createGeminiProvider({ model, sdkUrl, getApiKeys, i18n }) {
    return async function generateReply({ userText, contextItems }) {
        const keys = getApiKeys();
        if (keys.length === 0) {
            return { text: i18n.noApiKey };
        }

        let lastError = null;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            try {
                const { GoogleGenAI } = await import(sdkUrl);
                const ai = new GoogleGenAI({ apiKey: key });

                let systemContext = '';
                (contextItems || []).forEach((c) => {
                    if (c.content) {
                        systemContext += `\n---\n# ${c.name}\n${c.content}\n`;
                    }
                });

                // 開発標準・ペルソナ定義および応答文字数制限（日本語200字ルール）の適用
                const systemInstruction = 
                    `【ペルソナ・役割】\n` +
                    `あなたは「Aurora Dialogue」です。開発者とAI IDE「google antigravity」を繋ぐコンテキスト・ブリッジであり、この対話記録はそのまま antigravity での実装コンテキストとして引き継がれます。\n\n` +
                    `【回答ルール】\n` +
                    `- 日本語で回答してください。\n` +
                    `- 回答は必ずMarkdown形式で記述してください。\n` +
                    `- 返答は、特別な指示がない限り、日本語で200字程度（150〜250文字以内）に収まるよう、極めて簡潔かつ的確にまとめてください。無駄な挨拶や前置きは省いてください。\n` +
                    `- 【参照用ナレッジ】に根拠となる情報が無い質問には、推測や創作で回答してはいけません。回答の冒頭に「【未回答】」と明記し、どの情報が不足しているかを1文で添えてください。\n` +
                    `- 根拠が一部しか無い場合は、分かる範囲のみ回答し、不足している部分は「【未回答】」として明示してください。\n`;

                let prompt = userText;
                if (systemContext) {
                    prompt = `${systemInstruction}\n【参照用ナレッジ】\n${systemContext}\n---\n上記の情報を十分に踏まえ、開発者の質問に200字程度で回答してください。\n\n質問: ${userText}`;
                } else {
                    prompt = `${systemInstruction}\n上記の役割と制約に従って、開発者の質問に200字程度で回答してください。\n\n質問: ${userText}`;
                }

                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                });

                return { text: response.text || i18n.emptyReply };
            } catch (e) {
                console.warn(`[Key Rotation] API key slot ${i + 1} failed, trying next key. Error:`, e);
                lastError = e;
                continue;
            }
        }

        console.error('[Key Rotation] All API key slots failed.');
        if (lastError?.message?.includes('403')) {
            return { text: i18n.invalidApiKey };
        }
        return { text: `AI通信エラー (全スロット失敗): ${lastError?.message || 'Unknown Error'}` };
    };
}
