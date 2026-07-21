// セラピスト向け顧客管理アプリ：UI・DOM操作制御モジュール

import {
    getCustomers, addCustomer, addRecord, updateCustomer, updateRecord,
    getSoulColors, getMainSoulColor, MAX_SOUL_COLORS, SOUL_COLOR_DEFS
} from './data.js';

// -------------------------------------------------------------------
// [ISSUE-018] Soul Color（最大5色）共通ヘルパー
// -------------------------------------------------------------------

/** 13色のカラーチップHTMLを生成する（選択UI用） */
function buildColorChipsHtml() {
    return SOUL_COLOR_DEFS
        .map(c => `<span class="color-chip ${c.key}" data-color="${c.key}" title="${c.label}"></span>`)
        .join('');
}

/**
 * 選択済みカラーを「上段3色・下段2色」で表示するHTMLを生成する。
 * 色が5色未満のときは、その分だけ詰めて表示する。
 */
function buildSoulColorBadgeHtml(colors, size = 'md') {
    const list = (colors || []).slice(0, MAX_SOUL_COLORS);
    if (list.length === 0) return '';
    const top = list.slice(0, 3);
    const bottom = list.slice(3, 5);
    const dots = arr => arr.map(c => `<span class="soul-dot bg-${c}"></span>`).join('');
    return `
        <span class="soul-color-badge ${size === 'sm' ? 'sm' : ''}">
            <span class="soul-color-badge-row">${dots(top)}</span>
            ${bottom.length ? `<span class="soul-color-badge-row">${dots(bottom)}</span>` : ''}
        </span>
    `;
}

/**
 * [ISSUE-019] 施術記録の「訴え・処方・メモ」を描画する。
 *
 * 以前は値があるときだけ行を出していたため、旧バージョンで作成された記録
 * （マイグレーションで空文字が入る）では行ごと消え、項目自体が存在しない
 * ように見えていた。未記入でも項目名は必ず表示し、値だけをプレースホルダに
 * 置き換えることで「未記入」であることが分かるようにする。
 */
function buildRecordDetailsHtml(r) {
    const rows = [
        { label: '訴え', value: r.clientComplaint, color: 'var(--accent-warning)' },
        { label: '処方', value: r.prescription, color: 'var(--accent-cyan)' },
        { label: 'メモ', value: r.therapistNote, color: 'var(--accent-purple)' },
    ];
    return rows.map(({ label, value, color }) => {
        const filled = value && value.trim();
        return `
            <div style="font-size: 0.85rem; margin-top: 4px;${filled ? '' : ' opacity: 0.45;'}">
                <span style="color: ${color}; font-weight: 500;">${label}:</span>
                ${filled ? value : '未記入'}
            </div>`;
    }).join('');
}

/**
 * [MINOR v1.10.0] 施術記録カードの「編集」ボタン描画。
 * カルテ詳細画面の完全な閲覧専用化に伴い、編集ボタンは表示しない（空文字を返す）。
 */
function buildRecordEditButtonHtml(r) {
    return '';
}

/**
 * [MINOR v1.10.0] 編集ボタンへのハンドラ結び付けを無効化。
 */
function attachRecordEditHandler(container, customerId, recordId) {
    // 閲覧専用化のため、処理をスキップ
}

/**
 * カラーチップ群を「最大5色まで選択できるセレクター」として初期化する。
 * 選択順が保持され、チップには順番バッジ（1〜5）が表示される。
 * @returns {() => string[]} 現在の選択色を返すゲッター
 */
function initSoulColorSelector(container, initialColors, onChange) {
    let selected = (initialColors || []).slice(0, MAX_SOUL_COLORS);
    const chips = container.querySelectorAll('.color-chip');

    const render = () => {
        chips.forEach(chip => {
            const key = chip.getAttribute('data-color');
            const order = selected.indexOf(key);
            chip.classList.toggle('active', order !== -1);
            chip.setAttribute('data-order', order === -1 ? '' : String(order + 1));
            // 上限到達時、未選択チップは選べないことを視覚的に示す
            chip.classList.toggle('disabled', order === -1 && selected.length >= MAX_SOUL_COLORS);
        });
        if (onChange) onChange(selected.slice());
    };

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-color');
            const order = selected.indexOf(key);
            if (order !== -1) {
                selected.splice(order, 1);          // 選択済みなら解除
            } else if (selected.length < MAX_SOUL_COLORS) {
                selected.push(key);                 // 未選択なら末尾に追加（順序を保持）
            } else {
                return;                             // 上限5色に達している場合は何もしない
            }
            render();
        });
    });

    render();
    return () => selected.slice();
}

// -------------------------------------------------------------------
// メイン初期化関数
// DOMContentLoaded だけでなく pageshow（bfcache復帰）からも呼び出す
// -------------------------------------------------------------------
function initApp() {
    // DOM要素の取得
    const searchInput = document.getElementById('search-input');
    const btnAddCustomer = document.getElementById('btn-add-customer');
    const customerListContainer = document.getElementById('customer-list-container');
    const customerDetailView = document.getElementById('customer-detail-view');
    
    // 詳細ビュー要素
    const detailName = document.getElementById('detail-name');
    const detailKana = document.getElementById('detail-kana');
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const btnEditCustomer = document.getElementById('btn-edit-customer'); // [MINOR v1.10.0]
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContentArea = document.getElementById('tab-content-area');
    const addRecordAction = document.getElementById('add-record-action');
    const btnAddRecord = document.getElementById('btn-add-record');

    // 顧客登録モーダル
    const customerModal = document.getElementById('customer-modal');
    const customerModalTitle = document.getElementById('customer-modal-title'); // [MINOR v1.10.0]
    const customerForm = document.getElementById('customer-form');
    const btnCancelCustomer = document.getElementById('btn-cancel-customer');
    const btnSubmitCustomer = document.getElementById('btn-submit-customer');
    const inputMemo = document.getElementById('input-memo');
    const inputInitialConsultation = document.getElementById('input-initial-consultation');

    // レコード追加モーダル
    const recordModal = document.getElementById('record-modal');
    const recordForm = document.getElementById('record-form');
    const btnCancelRecord = document.getElementById('btn-cancel-record');
    const btnSubmitRecord = document.getElementById('btn-submit-record');

    // アプリケーション状態
    let selectedCustomerId = null;
    let editingCustomer = null; // [MINOR v1.10.0] 顧客編集モード用
    let activeTab = 'visit-count';

    // 1. 顧客一覧の描画
    function renderCustomerList(query = '') {
        const customers = getCustomers();
        customerListContainer.innerHTML = '';

        const filtered = customers.filter(c => {
            const q = query.toLowerCase();
            return c.name.toLowerCase().includes(q) || (c.kana && c.kana.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            customerListContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 20px; grid-column: 1 / -1;">見つかりませんでした。</div>`;
            return;
        }

        filtered.forEach(customer => {
            const card = document.createElement('div');
            // [ISSUE-018] カードの枠色・背景は1色目（メインカラー）を使う
            card.className = `customer-card-grid-item soul-card-${getMainSoulColor(customer)}`;
            if (selectedCustomerId === customer.id) {
                card.style.boxShadow = '0 0 16px var(--accent-cyan)';
            }

            card.innerHTML = `
                <div>
                    <span style="font-size: 0.75rem; background: rgba(0,0,0,0.15); padding: 3px 8px; border-radius: 6px; color: var(--text-primary); font-weight: 500;">${customer.customerNo || 'NO-NO'}</span>
                    <h3 style="margin: 8px 0 4px 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${customer.name}</h3>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.75; color: var(--text-primary);">${customer.kana || ''}</p>
                </div>
                <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-primary); opacity: 0.8;">来店: <strong style="font-weight: 700;">${customer.records ? customer.records.length : 0}</strong>回</span>
                    <span style="font-weight: bold; color: var(--text-primary); font-size: 1.1rem;">&rarr;</span>
                </div>
            `;

            card.addEventListener('click', () => {
                showCustomerDetail(customer.id);
            });

            customerListContainer.appendChild(card);
        });
    }

    // 2. 顧客詳細の表示
    function showCustomerDetail(id) {
        selectedCustomerId = id;
        const customers = getCustomers();
        const customer = customers.find(c => c.id === id);

        if (!customer) return;

        detailName.textContent = customer.name;
        detailKana.textContent = `${customer.customerNo || ''} | ${customer.kana || ''}`;
        customerDetailView.style.display = 'flex';

        const workspaceGrid = document.querySelector('.workspace-grid');
        if (workspaceGrid) {
            workspaceGrid.classList.add('detail-mode');
        }

        // 現在のアクティブタブを描画
        renderTabContent(customer);
        renderCustomerList(searchInput.value); // 一覧側のハイライトも同期
    }

    // 3. タブコンテンツの切り替えと描画
    function renderTabContent(customer) {
        tabContentArea.innerHTML = '';
        const records = customer.records || [];

        // [PATCH v1.9.1] カレンダー直結化に伴い、新規記録追加ボタンは常に非表示にする
        if (addRecordAction) {
            addRecordAction.style.display = 'none';
        }

        switch (activeTab) {
            case 'visit-count':
                // 来店回数（いつ来たかの一覧）
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">来店履歴がありません。</p>';
                } else {
                    records.forEach(r => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.innerHTML = `
                            <div class="history-item-header">
                                <span>来店日</span>
                                <span>${r.date} ${r.time ? `(${r.time})` : ''}</span>
                            </div>
                            <div class="history-item-body">
                                <div style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">${r.type}</div>
                                ${buildRecordDetailsHtml(r)}
                                ${buildRecordEditButtonHtml(r)}
                            </div>
                        `;
                        attachRecordEditHandler(div, customer.id, r.id);
                        tabContentArea.appendChild(div);
                    });
                }
                break;

            case 'visit-type':
                // 施術内容の一覧
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">施術記録がありません。</p>';
                } else {
                    records.forEach(r => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.innerHTML = `
                            <div class="history-item-header">
                                <span>来店日</span>
                                <span>${r.date} ${r.time ? `(${r.time})` : ''}</span>
                            </div>
                            <div class="history-item-body">
                                <div style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">${r.type}</div>
                                ${buildRecordDetailsHtml(r)}
                                ${buildRecordEditButtonHtml(r)}
                            </div>
                        `;
                        attachRecordEditHandler(div, customer.id, r.id);
                        tabContentArea.appendChild(div);
                    });
                }
                break;

            case 'visit-amount':
                // 金額の一覧
                if (records.length === 0) {
                    tabContentArea.innerHTML = '<p style="color: var(--text-secondary);">支払記録がありません。</p>';
                } else {
                    records.forEach(r => {
                        const div = document.createElement('div');
                        div.className = 'history-item amount';
                        div.innerHTML = `
                            <div class="history-item-header">
                                <span>${r.date} ${r.time ? `(${r.time})` : ''}</span>
                                <span style="color: var(--accent-success); font-weight: bold;">${r.amount.toLocaleString()} 円</span>
                            </div>
                        `;
                        tabContentArea.appendChild(div);
                    });
                }
                break;

            case 'personal-info':
                // 個人情報の一覧・詳細 (スタティックな閲覧専用UI)
                tabContentArea.innerHTML = `
                    <div class="read-only-personal-info" style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0;">
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">顧客No.</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.customerNo || '未設定'}</div>
                            </div>
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">電話番号</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.phone || '未設定'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">誕生日</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.birthday ? customer.birthday.replace(/-/g, '/') : '未設定'}</div>
                            </div>
                            <div style="flex: 1; min-width: 120px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">紹介者</span>
                                <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${customer.referrer || 'なし'}</div>
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">Soul Color</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${buildSoulColorBadgeHtml(getSoulColors(customer), 'sm')}
                            </div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">初診問診 (体重や病歴など)</span>
                            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px; min-height: 48px; white-space: pre-wrap;">${customer.initialConsultation || '未記入'}</div>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">特記事項・メモ</span>
                            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px; min-height: 48px; white-space: pre-wrap;">${customer.memo || '未記入'}</div>
                        </div>
                    </div>
                `;
                break;
        }
    }

    // 4. 各種イベント処理

    // [ISSUE-018] 新規登録のカラーセレクター制御（最大5色）
    const inputSoulColorContainer = document.getElementById('input-soul-color-container');
    const inputSoulColorPreview = document.getElementById('input-soul-color-preview');
    // モーダルを開き直したときに選択をリセットできるよう、初期化関数を保持しておく
    let getInputSoulColors = () => [];
    let resetInputSoulColors = () => {};
    if (inputSoulColorContainer) {
        const setupInputSelector = (initial) => {
            getInputSoulColors = initSoulColorSelector(
                inputSoulColorContainer,
                initial,
                (colors) => {
                    if (!inputSoulColorPreview) return;
                    inputSoulColorPreview.innerHTML = colors.length
                        ? buildSoulColorBadgeHtml(colors)
                        : '<span style="font-size: 0.8rem; color: var(--text-secondary);">未設定</span>';
                }
            );
        };
        setupInputSelector([]);
        // チップは innerHTML を作り直さず再バインドするとリスナーが重複するため、
        // markup を作り直したうえで初期化し直す
        resetInputSoulColors = () => {
            inputSoulColorContainer.innerHTML = buildColorChipsHtml();
            setupInputSelector([]);
        };
    }

    // 検索インプット
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCustomerList(e.target.value);
        });
    }

    // 詳細ビューを閉じる
    if (btnCloseDetail) {
        btnCloseDetail.addEventListener('click', () => {
            selectedCustomerId = null;
            if (customerDetailView) customerDetailView.style.display = 'none';
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid) {
                workspaceGrid.classList.remove('detail-mode');
            }
            renderCustomerList(searchInput ? searchInput.value : '');
        });
    }

    // タブ切り替えボタンのクリック
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeTab = e.target.getAttribute('data-tab');

            const customers = getCustomers();
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                renderTabContent(customer);
            }
        });
    });

    // [MINOR v1.10.0] 顧客モーダルを新規登録モードに戻す
    function resetCustomerModal() {
        editingCustomer = null;
        if (customerForm) customerForm.reset();
        if (customerModalTitle) customerModalTitle.textContent = '新規顧客の登録';
        if (btnSubmitCustomer) btnSubmitCustomer.textContent = '登録する';
        resetInputSoulColors(); // カラー選択リセット
    }

    // 顧客登録モーダル表示・非表示
    if (btnAddCustomer) {
        btnAddCustomer.addEventListener('click', () => {
            resetCustomerModal();
            if (customerModal) customerModal.classList.add('active');
        });
    }
    if (btnCancelCustomer) {
        btnCancelCustomer.addEventListener('click', () => {
            if (customerModal) customerModal.classList.remove('active');
            resetCustomerModal();
        });
    }

    // 顧客フォーム送信処理
    if (btnSubmitCustomer) {
        btnSubmitCustomer.addEventListener('click', () => {
            const nameEl = document.getElementById('input-name');
            const name = nameEl ? nameEl.value : '';
            if (!name) {
                alert('お名前は必須項目です。');
                return;
            }
            const customerNoEl = document.getElementById('input-customer-no');
            const customerNo = customerNoEl ? customerNoEl.value : '';
            const kanaEl = document.getElementById('input-kana');
            const kana = kanaEl ? kanaEl.value : '';
            const phoneEl = document.getElementById('input-phone');
            const phone = phoneEl ? phoneEl.value : '';
            const birthdayEl = document.getElementById('input-birthday');
            const birthday = birthdayEl ? birthdayEl.value : '';
            const soulColors = getInputSoulColors();
            const referrerEl = document.getElementById('input-referrer');
            const referrer = referrerEl ? referrerEl.value : '';
            const initialConsultation = inputInitialConsultation ? inputInitialConsultation.value : '';
            const memo = inputMemo ? inputMemo.value : '';

            // 新規登録処理
            const newCust = addCustomer(name, kana, phone, memo, customerNo, birthday, soulColors, referrer, initialConsultation);
            if (customerModal) customerModal.classList.remove('active');
            resetCustomerModal();

            renderCustomerList(searchInput ? searchInput.value : '');
            showCustomerDetail(newCust.id); // 新規登録後に詳細画面を開く
        });
    }

    // -------------------------------------------------------------------
    // [ISSUE-020] 施術記録の編集モード
    // 追加用モーダルを流用し、editingRecord の有無で追加／更新を切り替える
    // -------------------------------------------------------------------
    const recordModalTitle = document.getElementById('record-modal-title');
    let editingRecord = null; // { customerId, recordId } または null（＝新規追加）

    /** モーダルを新規追加モードに戻す。閉じるときは必ずこれを通す */
    function resetRecordModal() {
        editingRecord = null;
        if (recordForm) recordForm.reset();
        if (recordModalTitle) recordModalTitle.textContent = '施術内容・金額の記録';
        if (btnSubmitRecord) btnSubmitRecord.textContent = '記録する';
    }

    /** 既存記録を読み込んでモーダルを編集モードで開く */
    function openRecordEditor(customerId, recordId) {
        const customer = getCustomers().find(c => c.id === customerId);
        const record = customer && (customer.records || []).find(r => r.id === recordId);
        if (!record) {
            alert('対象の施術記録が見つかりませんでした。');
            return;
        }

        editingRecord = { customerId, recordId };

        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value != null ? value : '';
        };
        setVal('input-date', record.date);
        setVal('input-time', record.time);
        setVal('input-type', record.type);
        setVal('input-client-complaint', record.clientComplaint);
        setVal('input-prescription', record.prescription);
        setVal('input-therapist-note', record.therapistNote);
        setVal('input-amount', record.amount);

        // 編集時は対象顧客が確定しているため、顧客選択セレクトは隠す
        if (recordCustomerSelectGroup) recordCustomerSelectGroup.style.display = 'none';
        if (recordModalTitle) recordModalTitle.textContent = '施術記録の編集';
        if (btnSubmitRecord) btnSubmitRecord.textContent = '更新する';
        if (recordModal) recordModal.classList.add('active');
    }

    // 記録カードの編集ボタンから呼ばれるコールバックを登録
    onRecordEditRequested = openRecordEditor;

    if (btnCancelRecord) {
        btnCancelRecord.addEventListener('click', () => {
            if (recordModal) recordModal.classList.remove('active');
            resetRecordModal();
        });
    }

    // レコードフォーム送信処理
    if (btnSubmitRecord) {
        btnSubmitRecord.addEventListener('click', () => {
            const dateEl = document.getElementById('input-date');
            const date = dateEl ? dateEl.value : '';
            const timeEl = document.getElementById('input-time');
            const time = timeEl ? timeEl.value : '';
            const typeEl = document.getElementById('input-type');
            const type = typeEl ? typeEl.value : '';
            const clientComplaintEl = document.getElementById('input-client-complaint');
            const clientComplaint = clientComplaintEl ? clientComplaintEl.value : '';
            const prescriptionEl = document.getElementById('input-prescription');
            const prescription = prescriptionEl ? prescriptionEl.value : '';
            const therapistNoteEl = document.getElementById('input-therapist-note');
            const therapistNote = therapistNoteEl ? therapistNoteEl.value : '';
            const amountEl = document.getElementById('input-amount');
            const amount = amountEl ? amountEl.value : '';

            if (!date || !type || !amount) {
                alert('来店日、施術内容、金額は必須項目です。');
                return;
            }

            // [ISSUE-020] 編集モードなら既存記録を更新して終了する
            if (editingRecord) {
                const result = updateRecord(editingRecord.customerId, editingRecord.recordId, {
                    date, type, amount, time, clientComplaint, prescription, therapistNote
                });
                const editedCustomerId = editingRecord.customerId;

                if (recordModal) recordModal.classList.remove('active');
                resetRecordModal();

                if (!result) {
                    alert('施術記録の更新に失敗しました。');
                    return;
                }
                renderCalendar();          // 日付を変更した場合にドットを追従させる
                showCustomerDetail(editedCustomerId);
                return;
            }

            let targetId = selectedCustomerId;
            const isFromCalendar = (recordCustomerSelectGroup && recordCustomerSelectGroup.style.display === 'block');
            if (isFromCalendar && inputRecordCustomerId) {
                targetId = inputRecordCustomerId.value;
            }

            if (!targetId) {
                alert('対象の顧客が選択されていません。');
                return;
            }

            const updated = addRecord(targetId, date, type, amount, time, clientComplaint, prescription, therapistNote);
            if (recordModal) recordModal.classList.remove('active');
            if (recordForm) recordForm.reset();

            if (updated) {
                if (isFromCalendar) {
                    renderCalendar();
                    // この日の来店記録を再構築して詳細を描画
                    const customers = getCustomers();
                    const dailyVisits = [];
                    customers.forEach(cust => {
                        if (cust.records) {
                            cust.records.forEach(rec => {
                                if (rec.date === date) {
                                    dailyVisits.push({ customer: cust, record: rec });
                                }
                            });
                        }
                    });
                    showCalendarDayDetails(date, dailyVisits);
                } else {
                    showCustomerDetail(selectedCustomerId);
                }
            }
        });
    }

    // テキストエリア自動リサイズ (新規登録モーダルのメモ欄用)
    if (inputMemo) {
        inputMemo.addEventListener('input', () => {
            inputMemo.style.height = 'auto';
            inputMemo.style.height = inputMemo.scrollHeight + 'px';
        });
    }
    if (inputInitialConsultation) {
        inputInitialConsultation.addEventListener('input', () => {
            inputInitialConsultation.style.height = 'auto';
            inputInitialConsultation.style.height = inputInitialConsultation.scrollHeight + 'px';
        });
    }

    // 5. テーマスライダーの制御
    const themeSlider = document.getElementById('theme-slider');
    const root = document.documentElement;
    if (themeSlider) {
        const savedBlend = localStorage.getItem('theme-blend') || '0';
        themeSlider.value = savedBlend;
        root.style.setProperty('--theme-blend', savedBlend + '%');

        themeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            root.style.setProperty('--theme-blend', val + '%');
            localStorage.setItem('theme-blend', val);
        });
    }

    // 6. カレンダービュー制御
    const btnViewList = document.getElementById('btn-view-list');
    const btnViewCalendar = document.getElementById('btn-view-calendar');
    const searchContainerSection = document.getElementById('search-container-section');
    const calendarViewContainer = document.getElementById('calendar-view-container');
    const calendarPrevBtn = document.getElementById('calendar-prev-btn');
    const calendarNextBtn = document.getElementById('calendar-next-btn');
    const calendarMonthTitle = document.getElementById('calendar-month-title');
    const calendarGridBody = document.getElementById('calendar-grid-body');
    const calendarDayDetails = document.getElementById('calendar-day-details');
    const calendarDetailsTitle = document.getElementById('calendar-details-title');
    const calendarVisitsContainer = document.getElementById('calendar-visits-container');
    const btnCalendarAddRecord = document.getElementById('btn-calendar-add-record');
    const recordCustomerSelectGroup = document.getElementById('record-customer-select-group');
    const inputRecordCustomerId = document.getElementById('input-record-customer-id');

    // [MINOR v1.6.0] インライン簡易記録フォーム用のDOM要素
    const inlineRecordCustomerId = document.getElementById('inline-record-customer-id');
    const inlineRecordType = document.getElementById('inline-record-type');
    const inlineRecordAmount = document.getElementById('inline-record-amount');
    const inlineRecordTime = document.getElementById('inline-record-time');
    const inlineRecordComplaint = document.getElementById('inline-record-complaint');
    const inlineRecordPrescription = document.getElementById('inline-record-prescription');
    const inlineRecordNote = document.getElementById('inline-record-note');
    const btnInlineSubmitRecord = document.getElementById('btn-inline-submit-record');

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedCalendarDateStr = null;

    const workspaceGrid = document.querySelector('.workspace-grid');
    if (btnViewList && btnViewCalendar) {
        btnViewList.addEventListener('click', () => {
            btnViewList.style.background = 'var(--accent-cyan)';
            btnViewList.style.color = '#000';
            btnViewList.style.fontWeight = '600';
            btnViewCalendar.style.background = 'transparent';
            btnViewCalendar.style.color = 'var(--text-secondary)';
            btnViewCalendar.style.fontWeight = '500';

            if (searchContainerSection) searchContainerSection.style.display = 'flex';
            // [BUGFIX ISSUE-015] 'block' を入れると .customer-list { display: grid } を
            // インラインで上書きしてしまい、カードが縦積みの全幅リストに崩れる。
            // 空文字を代入してインライン指定を除去し、CSS本来のグリッドに戻す。
            if (customerListContainer) customerListContainer.style.display = '';
            if (calendarViewContainer) calendarViewContainer.style.display = 'none';

            // [BUGFIX ISSUE-014] calendar-mode だけでなく detail-mode も必ず解除する。
            // detail-mode が残ると .workspace-grid.detail-mode .workspace-column-left が
            // display:none となり、一覧側（検索＋カード）が丸ごと消えて画面が空白になる。
            if (workspaceGrid) {
                workspaceGrid.classList.remove('calendar-mode');
                workspaceGrid.classList.remove('detail-mode');
            }
            if (customerDetailView) customerDetailView.style.display = 'none';
            selectedCustomerId = null;

            renderCustomerList(searchInput ? searchInput.value : '');
        });

        btnViewCalendar.addEventListener('click', () => {
            btnViewCalendar.style.background = 'var(--accent-cyan)';
            btnViewCalendar.style.color = '#000';
            btnViewCalendar.style.fontWeight = '600';
            btnViewList.style.background = 'transparent';
            btnViewList.style.color = 'var(--text-secondary)';
            btnViewList.style.fontWeight = '500';

            if (searchContainerSection) searchContainerSection.style.display = 'none';
            if (customerListContainer) customerListContainer.style.display = 'none';
            if (calendarViewContainer) calendarViewContainer.style.display = 'flex';
            if (customerDetailView) customerDetailView.style.display = 'none';

            // [BUGFIX ISSUE-014] カレンダーへ切り替える際も detail-mode を確実に解除しておく。
            // （CSS記述順に依存した打ち消しに頼らず、状態クラスを明示的に排他にする）
            if (workspaceGrid) {
                workspaceGrid.classList.remove('detail-mode');
                workspaceGrid.classList.add('calendar-mode');
            }

            renderCalendar();
        });
    }

    if (calendarPrevBtn) {
        calendarPrevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    if (calendarNextBtn) {
        calendarNextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    function renderCalendar() {
        if (!calendarGridBody) return;
        calendarGridBody.innerHTML = '';
        if (calendarMonthTitle) calendarMonthTitle.textContent = `${currentYear}年 ${currentMonth + 1}月`;

        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
        const customers = getCustomers();

        // 前月の余白
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day other-month';
            cell.innerHTML = `<span class="calendar-day-num">${prevLastDay - i + 1}</span>`;
            calendarGridBody.appendChild(cell);
        }

        // 当月の日付
        const today = new Date();
        for (let day = 1; day <= lastDay; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day) {
                cell.classList.add('today');
            }
            if (selectedCalendarDateStr === dateStr) {
                cell.classList.add('selected');
            }

            cell.innerHTML = `<span class="calendar-day-num">${day}</span>`;

            // この日の来店記録を検索
            const dailyVisits = [];
            customers.forEach(cust => {
                if (cust.records) {
                    cust.records.forEach(rec => {
                        if (rec.date === dateStr) {
                            dailyVisits.push({ customer: cust, record: rec });
                        }
                    });
                }
            });
            if (dailyVisits.length > 0) {
                const indicators = document.createElement('div');
                indicators.className = 'calendar-day-indicators';
                indicators.style.display = 'flex';
                indicators.style.justifyContent = 'center';
                indicators.style.gap = '4px';
                indicators.style.width = '100%';
                indicators.style.marginTop = '4px';

                dailyVisits.slice(0, 3).forEach(visit => {
                    const dot = document.createElement('span');
                    // [ISSUE-018] カレンダーのドットは1色目（メインカラー）を使う
                    dot.className = `customer-color-indicator bg-${getMainSoulColor(visit.customer)}`;
                    dot.style.width = '10px';
                    dot.style.height = '10px';
                    dot.style.marginRight = '0';
                    dot.title = visit.customer.name;
                    indicators.appendChild(dot);
                });
                cell.appendChild(indicators);
            }

            cell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                selectedCalendarDateStr = dateStr;
                showCalendarDayDetails(dateStr, dailyVisits);
            });

            calendarGridBody.appendChild(cell);
        }
    }

    // [MINOR v1.6.0] インライン簡易記録フォームをクリアする処理
    function resetInlineForm() {
        if (inlineRecordType) inlineRecordType.value = '';
        if (inlineRecordAmount) inlineRecordAmount.value = '';
        if (inlineRecordTime) inlineRecordTime.value = '';
        if (inlineRecordComplaint) inlineRecordComplaint.value = '';
        if (inlineRecordPrescription) inlineRecordPrescription.value = '';
        if (inlineRecordNote) inlineRecordNote.value = '';

        // 詳細アコーディオン（details）を閉じる
        const detailsEl = document.querySelector('#calendar-inline-form-container details');
        if (detailsEl) {
            detailsEl.removeAttribute('open');
        }
    }

    function showCalendarDayDetails(dateStr, dailyVisits) {
        if (!calendarDayDetails) return;
        if (calendarDetailsTitle) calendarDetailsTitle.textContent = `${dateStr.replace(/-/g, '/')}の記録`;
        calendarDayDetails.style.display = 'block';

        // [MINOR v1.6.0] インラインフォーム用の対象顧客ドロップダウンを動的に同期する
        if (inlineRecordCustomerId) {
            inlineRecordCustomerId.innerHTML = '';
            const customers = getCustomers();
            customers.forEach(cust => {
                const opt = document.createElement('option');
                opt.value = cust.id;
                opt.textContent = `${cust.name} (${cust.customerNo || ''})`;
                inlineRecordCustomerId.appendChild(opt);
            });
        }
        resetInlineForm(); // 日付切り替え時にフォームを初期化

        if (calendarVisitsContainer) {
            calendarVisitsContainer.innerHTML = '';
            if (dailyVisits.length === 0) {
                calendarVisitsContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 12px;">この日の施術記録はありません。</div>`;
                return;
            }

            dailyVisits.forEach(visit => {
                const item = document.createElement('div');
                item.className = 'calendar-visit-item';
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <span class="customer-color-indicator bg-${getMainSoulColor(visit.customer)}"></span>
                            <span>${visit.customer.name}</span>
                            <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-secondary);">${visit.record.time || ''}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                            ${visit.record.type} / ${Number(visit.record.amount).toLocaleString()}円
                        </div>
                    </div>
                    <div style="color: var(--accent-cyan); font-weight: bold;">&rarr;</div>
                `;

                item.addEventListener('click', () => {
                    if (searchContainerSection) searchContainerSection.style.display = 'flex';
                    // [BUGFIX ISSUE-015] CSS の display:grid をインラインで潰さないよう空文字を代入
                    if (customerListContainer) customerListContainer.style.display = '';
                    if (calendarViewContainer) calendarViewContainer.style.display = 'none';

                    // [BUGFIX ISSUE-013] calendar-mode クラスを削除しないと、
                    // .workspace-grid.calendar-mode .workspace-column-right { display: none !important; }
                    // というCSSルールがカルテ詳細パネルを強制非表示にしてしまうため、ここで必ず解除する
                    if (workspaceGrid) workspaceGrid.classList.remove('calendar-mode');

                    if (btnViewList && btnViewCalendar) {
                        btnViewList.style.background = 'var(--accent-cyan)';
                        btnViewList.style.color = '#000';
                        btnViewList.style.fontWeight = '600';
                        btnViewCalendar.style.background = 'transparent';
                        btnViewCalendar.style.color = 'var(--text-secondary)';
                        btnViewCalendar.style.fontWeight = '500';
                    }

                    showCustomerDetail(visit.customer.id);
                    const visitTypeTabBtn = document.querySelector('[data-tab="visit-type"]');
                    if (visitTypeTabBtn) visitTypeTabBtn.click();
                });

                calendarVisitsContainer.appendChild(item);
            });
        }
    }

    // [MINOR v1.6.0] インライン記録フォームの保存処理イベントハンドラ
    if (btnInlineSubmitRecord) {
        btnInlineSubmitRecord.addEventListener('click', () => {
            if (!selectedCalendarDateStr) {
                alert('日付が選択されていません。');
                return;
            }
            const customerId = inlineRecordCustomerId ? inlineRecordCustomerId.value : '';
            const type = inlineRecordType ? inlineRecordType.value : '';
            const amount = inlineRecordAmount ? inlineRecordAmount.value : '';

            const time = inlineRecordTime ? inlineRecordTime.value : '';
            const clientComplaint = inlineRecordComplaint ? inlineRecordComplaint.value : '';
            const prescription = inlineRecordPrescription ? inlineRecordPrescription.value : '';
            const therapistNote = inlineRecordNote ? inlineRecordNote.value : '';

            if (!customerId) {
                alert('顧客を選択してください。');
                return;
            }
            if (!type) {
                alert('施術メニューを入力してください。');
                return;
            }
            if (!amount) {
                alert('金額を入力してください。');
                return;
            }

            const updated = addRecord(customerId, selectedCalendarDateStr, type, amount, time, clientComplaint, prescription, therapistNote);
            if (updated) {
                // 保存完了の視覚フィードバック
                const originalText = btnInlineSubmitRecord.textContent;
                btnInlineSubmitRecord.textContent = '保存しました！';
                btnInlineSubmitRecord.style.background = 'var(--accent-success)';
                btnInlineSubmitRecord.style.color = '#fff';
                btnInlineSubmitRecord.disabled = true;

                setTimeout(() => {
                    btnInlineSubmitRecord.textContent = originalText;
                    btnInlineSubmitRecord.style.background = '';
                    btnInlineSubmitRecord.style.color = '';
                    btnInlineSubmitRecord.disabled = false;

                    // フォームをクリアしてリフレッシュ
                    resetInlineForm();
                    renderCalendar();

                    // 該当日の来店データを再取得して表示を更新する
                    const customers = getCustomers();
                    const dailyVisits = [];
                    customers.forEach(cust => {
                        if (cust.records) {
                            cust.records.forEach(rec => {
                                if (rec.date === selectedCalendarDateStr) {
                                    dailyVisits.push({ customer: cust, record: rec });
                                }
                            });
                        }
                    });
                    showCalendarDayDetails(selectedCalendarDateStr, dailyVisits);
                }, 1000);
            }
        });
    }


    if (btnCalendarAddRecord) {
        btnCalendarAddRecord.addEventListener('click', () => {
            if (!selectedCalendarDateStr) return;
            resetRecordModal(); // [ISSUE-020] 直前の編集モードを持ち越さない
            if (recordCustomerSelectGroup && inputRecordCustomerId) {
                recordCustomerSelectGroup.style.display = 'block';
                inputRecordCustomerId.innerHTML = '';
                const customers = getCustomers();
                customers.forEach(cust => {
                    const opt = document.createElement('option');
                    opt.value = cust.id;
                    opt.textContent = `${cust.name} (${cust.customerNo || ''})`;
                    inputRecordCustomerId.appendChild(opt);
                });
            }
            const dateEl = document.getElementById('input-date');
            if (dateEl) dateEl.value = selectedCalendarDateStr;
            if (recordModal) recordModal.classList.add('active');
        });
    }

    // 初回読み込み
    renderCustomerList();
} // initApp end

// -------------------------------------------------------------------
// エントリポイント：初回表示 + bfcache / 別ページ遷移からの復帰に対応
// -------------------------------------------------------------------

// 既にDOMが構築済みの場合（bfcache等）は即時実行
if (document.readyState === 'loading') {
    // まだパース中なら DOMContentLoaded を待つ
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // interactive / complete ならそのまま起動
    initApp();
}

// bfcache（前後ナビゲーション）で復帰した際にも再描画する
window.addEventListener('pageshow', (event) => {
    // persisted === true はbfcacheからの復帰を意味する
    if (event.persisted) {
        initApp();
    }
});
