const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ログ保存用エンドポイント
app.post('/api/save_log', (req) => {
    const { url, chatLog } = req.body;
    if (!url || !chatLog) {
        return;
    }

    try {
        // アクセス元URLの解析
        let relativePath = 'unknown';
        try {
            // 相対/絶対パス双方に対応するため Base URL を指定してパース
            const parsedUrl = new URL(url, 'http://localhost:3005');
            const pathname = parsedUrl.pathname;
            
            if (pathname.includes('01_Requirements')) {
                relativePath = '01_Requirements';
            } else if (pathname.includes('02_Planning')) {
                relativePath = '02_Planning';
            } else if (pathname.includes('03_Implementation')) {
                relativePath = '03_Implementation';
            } else if (pathname.includes('99_Portal')) {
                relativePath = '99_Portal';
            } else {
                // デフォルトフォールバック
                const segments = pathname.split('/').filter(Boolean);
                if (segments.length > 0) {
                    relativePath = segments[segments.length - 2] || segments[0];
                }
            }
        } catch (e) {
            console.error('URLのパースに失敗しました:', e);
        }

        const logDir = path.join(__dirname, '../management/03_Implementation/chat_logs', relativePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logPath = path.join(logDir, 'chat_history.json');
        fs.writeFileSync(logPath, JSON.stringify(chatLog, null, 2), 'utf8');
        console.log(`ログを保存しました: ${logPath}`);
    } catch (err) {
        console.error('ログの保存中にエラーが発生しました:', err);
    }
});

// Ollama または AI プロキシ用の簡易ダミーまたはプロキシエンドポイント (必要に応じて拡張)
app.post('/api/chat', async (req, res) => {
    // ひとまず200を返すダミーまたは将来的なAI中継処理
    res.json({ message: "Bridge connection successful" });
});

// 起動とエラーハンドリング (ポート競合の可視化)
const server = app.listen(PORT, () => {
    console.log(`Bridge server is running on port ${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`[CRITICAL] ポート ${PORT} は既に使用されています。プロセスを終了します。`);
        process.exit(1);
    } else {
        console.error('サーバー起動時にエラーが発生しました:', error);
        process.exit(1);
    }
});
