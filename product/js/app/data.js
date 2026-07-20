// セラピスト向け顧客管理アプリ：データ管理モジュール (Core Logic)

// [ISSUE-018] Soul Color は最大5色まで登録できる（上段3色・下段2色で表示）
export const MAX_SOUL_COLORS = 5;

// 選択可能なソウルカラー（表示順）。UI側のチップ生成もこの定義を正本とする。
export const SOUL_COLOR_DEFS = [
    { key: 'red', label: 'レッド' },
    { key: 'coral', label: 'コーラル' },
    { key: 'orange', label: 'オレンジ' },
    { key: 'gold', label: 'ゴールド' },
    { key: 'yellow', label: 'イエロー' },
    { key: 'olive', label: 'オリーブ' },
    { key: 'green', label: 'グリーン' },
    { key: 'turquoise', label: 'ターコイズ' },
    { key: 'blue', label: 'ブルー' },
    { key: 'royal-blue', label: 'ロイヤルブルー' },
    { key: 'violet', label: 'バイオレット' },
    { key: 'magenta', label: 'マゼンタ' },
    { key: 'clear', label: 'クリア' },
];

/**
 * 顧客のソウルカラー配列を取得する（常に配列を返す）。
 * 旧スキーマ（単一 soulColor）のデータにも安全に対応する。
 */
export function getSoulColors(customer) {
    if (!customer) return [];
    if (Array.isArray(customer.soulColors)) return customer.soulColors;
    return customer.soulColor && customer.soulColor !== 'clear' ? [customer.soulColor] : [];
}

/**
 * メインカラー（1色目）を返す。
 * 顧客カードの枠色・背景グラデーションおよびカレンダーの日付ドットに使用する。
 */
export function getMainSoulColor(customer) {
    return getSoulColors(customer)[0] || 'clear';
}

// 初期デモデータ
const INITIAL_CUSTOMERS = [
    {
        id: "1",
        customerNo: "C-0001",
        name: "山田 花子",
        kana: "ヤマダ ハナコ",
        phone: "090-1234-5678",
        birthday: "1990-05-15",
        soulColor: "violet",
        soulColors: ["violet", "turquoise", "magenta", "blue", "coral"],
        referrer: "佐藤 健太",
        initialConsultation: "体重 52kg。過去に大きな病歴はなし。アトピー肌のためオイルの刺激に注意が必要。",
        memo: "肩こりがひどい。強めの施術を希望。",
        records: [
            {
                date: "2026-07-10",
                type: "アロママッサージ 60分",
                amount: 8000,
                time: "14:00 - 15:00",
                clientComplaint: "最近、仕事が忙しくて肩と首がバキバキに凝っている。頭痛も少しある。",
                prescription: "バイオレットの癒しエネルギーを取り入れたアロママッサージ。首と肩のリンパを重点的に流す。",
                therapistNote: "施術中、首の付け根あたりがかなり硬く、念入りにほぐした。施術後はスッキリした表情をされていた。"
            },
            {
                date: "2026-07-01",
                type: "ヘッドスパ 30分 + 肩もみ",
                amount: 5000,
                time: "10:30 - 11:00",
                clientComplaint: "目の疲れがひどく、頭が重たい感じがする。",
                prescription: "炭酸スプレーを使用したヘッドスパ。目の周りのツボ押しを追加。",
                therapistNote: "頭皮全体が乾燥気味。シャンプーの頻度や湯船に浸かることをおすすめした。"
            }
        ]
    },
    {
        id: "2",
        customerNo: "C-0002",
        name: "佐藤 健太",
        kana: "サトウ ケンタ",
        phone: "080-9876-5432",
        birthday: "1985-11-20",
        soulColor: "gold",
        soulColors: ["gold", "olive", "orange", "royal-blue", "yellow"],
        referrer: "なし（ウェブ検索）",
        initialConsultation: "体重 70kg。腰痛持ち（軽度のヘルニア）。長時間のデスクワークが原因と思われる。",
        memo: "腰痛持ち。施術後は冷たいお茶を好む。",
        records: [
            {
                date: "2026-07-15",
                type: "腰痛集中ケア 60分",
                amount: 7500,
                time: "16:00 - 17:00",
                clientComplaint: "デスクワークの時間が長く、腰が重だるい。立ち上がる時に少し痛む。",
                prescription: "腰回りのストレッチと下半身 of 筋肉の緊張緩和。ゴールドの活性カラーを意識した施術。",
                therapistNote: "腰だけでなく、臀部（お尻）の筋肉が非常に硬くなっていた。臀部をほぐすことで腰の軽さが出た。"
            },
            {
                date: "2026-07-10",
                type: "ヘッドセラピー 30分",
                amount: 4000,
                time: "11:00 - 11:30",
                clientComplaint: "目が疲れている。気分転換したい。",
                prescription: "デトックス効果のあるヘッドスパとツボ押し施術。",
                therapistNote: "リフレッシュしたとおっしゃっていました。"
            }
        ]
    }
];

// LocalStorage からデータをロード、なければ初期化
export function getCustomers() {
    const data = localStorage.getItem('therapist_customers');
    let customers = [];
    if (!data) {
        customers = INITIAL_CUSTOMERS;
        localStorage.setItem('therapist_customers', JSON.stringify(customers));
        return customers;
    }
    try {
        customers = JSON.parse(data);
    } catch (e) {
        customers = INITIAL_CUSTOMERS;
        localStorage.setItem('therapist_customers', JSON.stringify(customers));
        return customers;
    }

    // 配列でない場合は初期データでリセット
    if (!Array.isArray(customers)) {
        customers = INITIAL_CUSTOMERS;
        localStorage.setItem('therapist_customers', JSON.stringify(customers));
        return customers;
    }

    // 既存データのスキーママイグレーション
    let updated = false;
    customers.forEach((c, idx) => {
        if (!c || typeof c !== 'object') return;
        if (!c.customerNo) {
            c.customerNo = `C-${(idx + 1).toString().padStart(4, '0')}`;
            updated = true;
        }
        if (!c.soulColor || c.soulColor === "clear") {
            if (c.id === "1") c.soulColor = "violet";
            else if (c.id === "2") c.soulColor = "gold";
            else c.soulColor = "clear";
            updated = true;
        }
        // [ISSUE-018] Soul Color を単一色から最大5色の配列へ移行する。
        // 旧 soulColor（単一色）は 1色目（メインカラー）として引き継ぐ。
        if (!Array.isArray(c.soulColors)) {
            c.soulColors = c.soulColor && c.soulColor !== "clear" ? [c.soulColor] : [];
            updated = true;
        }
        // 上限5色を超える不正データは切り詰める
        if (c.soulColors.length > MAX_SOUL_COLORS) {
            c.soulColors = c.soulColors.slice(0, MAX_SOUL_COLORS);
            updated = true;
        }
        // [ISSUE-018] デモ顧客は5色表示（上段3・下段2）の確認用に既定値を復元する。
        // 1色以下のまま＝ユーザーが未設定の状態なので、上書きしても入力を失わない。
        if (c.soulColors.length <= 1) {
            if (c.id === "1") {
                c.soulColors = ["violet", "turquoise", "magenta", "blue", "coral"];
                updated = true;
            } else if (c.id === "2") {
                c.soulColors = ["gold", "olive", "orange", "royal-blue", "yellow"];
                updated = true;
            }
        }
        if (c.birthday === undefined) {
            c.birthday = "";
            updated = true;
        }
        if (c.referrer === undefined) {
            c.referrer = "";
            updated = true;
        }
        if (c.initialConsultation === undefined) {
            c.initialConsultation = "";
            updated = true;
        }
        if (c.id === "2" && c.records && Array.isArray(c.records)) {
            const hasJuly10 = c.records.some(r => r.date === "2026-07-10");
            if (!hasJuly10) {
                c.records.push({
                    date: "2026-07-10",
                    type: "ヘッドセラピー 30分",
                    amount: 4000,
                    time: "11:00 - 11:30",
                    clientComplaint: "目が疲れている。気分転換したい。",
                    prescription: "デトックス効果のあるヘッドスパとツボ押し施術。",
                    therapistNote: "リフレッシュしたとおっしゃっていました。"
                });
                updated = true;
            }
        }
        if (c.records && Array.isArray(c.records)) {
            c.records.forEach(r => {
                if (!r || typeof r !== 'object') return;
                if (r.time === undefined) { r.time = ""; updated = true; }
                if (r.clientComplaint === undefined) { r.clientComplaint = ""; updated = true; }
                if (r.prescription === undefined) { r.prescription = ""; updated = true; }
                if (r.therapistNote === undefined) { r.therapistNote = ""; updated = true; }
            });
        } else if (!c.records) {
            c.records = [];
            updated = true;
        }
    });

    if (updated) {
        saveCustomers(customers);
    }
    return customers;
}

// 顧客情報の保存
export function saveCustomers(customers) {
    localStorage.setItem('therapist_customers', JSON.stringify(customers));
}

// 顧客の新規登録
export function addCustomer(name, kana, phone, memo, customerNo, birthday, soulColors, referrer, initialConsultation) {
    const customers = getCustomers();
    // 顧客Noが指定されていない場合は自動発番
    const finalCustomerNo = customerNo || `C-${(customers.length + 1).toString().padStart(4, '0')}`;
    // [ISSUE-018] 最大5色の配列を受け取る。旧シグネチャ（単一色の文字列）でも壊れないようにする。
    const colors = (Array.isArray(soulColors) ? soulColors : (soulColors ? [soulColors] : []))
        .slice(0, MAX_SOUL_COLORS);
    const newCustomer = {
        id: Date.now().toString(),
        customerNo: finalCustomerNo,
        name,
        kana,
        phone,
        memo,
        birthday: birthday || "",
        soulColors: colors,
        referrer: referrer || "",
        initialConsultation: initialConsultation || "",
        records: []
    };
    customers.push(newCustomer);
    saveCustomers(customers);
    return newCustomer;
}

// 顧客情報の更新
export function updateCustomer(id, updatedFields) {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
        customers[index] = { ...customers[index], ...updatedFields };
        saveCustomers(customers);
        return customers[index];
    }
    return null;
}

// 来店・施術・金額レコードの追加
export function addRecord(customerId, date, type, amount, time, clientComplaint, prescription, therapistNote) {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        customer.records.unshift({
            date,
            type,
            amount: parseInt(amount, 10) || 0,
            time: time || "",
            clientComplaint: clientComplaint || "",
            prescription: prescription || "",
            therapistNote: therapistNote || ""
        });
        saveCustomers(customers);
        return customer;
    }
    return null;
}

