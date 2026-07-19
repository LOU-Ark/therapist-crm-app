# 03_実装報告書: ISSUE-014 カレンダー→顧客一覧で画面が空白になるバグ修正レポート

## 概要
カレンダービューから「👥 顧客一覧」タブへ戻った際に、検索バー・顧客カードのいずれも表示されず画面全体が空白になるバグを修正しました。分類は **PATCH (v1.5.7 → v1.5.8)** です。

---

## 症状

ユーザー様よりスクリーンショット3点でご報告いただいた事象です。

| # | 状態 | 内容 |
|---|---|---|
| 1 | カレンダー表示 | 2026年7月のカレンダーが正常表示 |
| 2 | 「顧客一覧」クリック直後 | **コンテンツ領域が完全な空白**（タブバーとヘッダーのみ） |
| 3 | リロード後 | 顧客カード（C-0001 / C-0002）が正常表示 |

再現手順:
1. カルテ詳細を一度開く（顧客カード経由、またはカレンダーの施術記録カード経由＝ISSUE-013の導線）
2. 「🗓 カレンダー」タブへ切り替える
3. 「👥 顧客一覧」タブへ切り替える → **空白**
4. リロードすると復旧する

---

## RCA（根本原因分析）

### 直接原因: 状態クラスの排他管理漏れ

`.workspace-grid` は `detail-mode` / `calendar-mode` という2つの状態クラスでレイアウトを切り替えていますが、**両者を排他にする責務がどこにも集約されておらず**、各クリックハンドラが自分の関心があるクラスだけを操作していました。

「顧客一覧」タブのハンドラは `calendar-mode` のみ削除し、`detail-mode` を残したままにしていました。

```css
/* product/css/index.css:97-99 */
.workspace-grid.detail-mode .workspace-column-left {
    display: none;
}
```

この結果、以下が同時に成立します。

| 要素 | 状態 | 原因 |
|---|---|---|
| `.workspace-column-left`（検索＋顧客カード一覧） | 非表示 | 上記CSSが残存 |
| `#customer-detail-view`（カルテ） | 非表示 | 直前の「カレンダー」ハンドラが `style.display='none'` を設定済み |

左も右も消えるため、ワークスペースが完全な空白になりました。リロードで直るのは、DOM再構築によってクラスとインラインスタイルが初期状態に戻るためです。

### なぜ既存の検証プロセスをすり抜けたか

ISSUE-013 で「`calendar-mode` の解除漏れ」を修正した際、**同じ構造の欠陥がもう一方の状態クラス（`detail-mode`）にも存在する**可能性を横展開して確認しませんでした。修正が「指摘された1経路」に閉じており、状態遷移の全組み合わせを俯瞰していなかったことが真因です。

また検証観点が「単発の遷移が動くか」に偏っており、**「詳細→カレンダー→一覧」のような3ステップ以上の往復遷移**が検証項目に存在しませんでした。ビュー状態がクラスとインラインスタイルの2系統で保持されている以上、往復による状態残留は必ず検証すべき観点でした。

---

## 修正内容

### 1. 「顧客一覧」タブハンドラ（`product/js/app/ui.js` 549行目付近）

```diff
             if (searchContainerSection) searchContainerSection.style.display = 'flex';
             if (customerListContainer) customerListContainer.style.display = 'block';
             if (calendarViewContainer) calendarViewContainer.style.display = 'none';
-            if (workspaceGrid) workspaceGrid.classList.remove('calendar-mode');
+
+            // [BUGFIX ISSUE-014] calendar-mode だけでなく detail-mode も必ず解除する。
+            // detail-mode が残ると .workspace-grid.detail-mode .workspace-column-left が
+            // display:none となり、一覧側（検索＋カード）が丸ごと消えて画面が空白になる。
+            if (workspaceGrid) {
+                workspaceGrid.classList.remove('calendar-mode');
+                workspaceGrid.classList.remove('detail-mode');
+            }
+            if (customerDetailView) customerDetailView.style.display = 'none';
+            selectedCustomerId = null;
+
+            renderCustomerList(searchInput ? searchInput.value : '');
         });
```

`selectedCustomerId` のリセットと再描画を加えることで、一覧に戻った際に前回選択カードのハイライト（シアンの発光）が残る副次的な不整合も同時に解消しています。

### 2. 「カレンダー」タブハンドラ（`product/js/app/ui.js` 570行目付近）

```diff
             if (customerDetailView) customerDetailView.style.display = 'none';
-            if (workspaceGrid) workspaceGrid.classList.add('calendar-mode');
+
+            // [BUGFIX ISSUE-014] カレンダーへ切り替える際も detail-mode を確実に解除しておく。
+            // （CSS記述順に依存した打ち消しに頼らず、状態クラスを明示的に排他にする）
+            if (workspaceGrid) {
+                workspaceGrid.classList.remove('detail-mode');
+                workspaceGrid.classList.add('calendar-mode');
+            }

             renderCalendar();
```

従来、カレンダー表示が偶然正しく見えていたのは `.calendar-mode` のルールが `.detail-mode` より **CSSファイル内で後に記述されている**（同一詳細度のため後勝ち）という暗黙の前提に依存していたためです。CSSの記述順を入れ替えるだけで壊れる状態だったため、JS側で明示的に排他化しました。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `product/js/app/ui.js` | ビュー切り替え時の状態クラス排他制御を修正（2箇所） |
| `management/08_Incidents/ISSUE-014.md` | インシデント報告書を新規起票 [D-1] |
| `management/03_Implementation/REPORT-ISSUE-014.md` | 本レポート [D-2] |
| `management/99_Portal/index.html` | バージョン v1.5.8 へ更新、改善履歴に追加 [D-3] |
| `management/04_VERIFICATION_STANDARD.md` | ビュー往復遷移の検証項目を追加 [D-4] |

---

## 再発防止（検証基準の強化）

`04_VERIFICATION_STANDARD.md` に以下を追加しました。

1. **ビュー往復遷移テスト**: 「一覧 → 詳細 → カレンダー → 一覧」「カレンダー → 詳細 → カレンダー」など、3ステップ以上の往復で各画面が正しく描画されることを確認する。
2. **状態クラスの排他性チェック**: `.workspace-grid` に `detail-mode` と `calendar-mode` が同時に付与されていないこと、およびどのビューでも「左右いずれかのカラムが必ず可視」であることを DevTools で確認する。
3. **横展開の義務化**: 状態クラス／フラグの解除漏れバグを修正した際は、**対になる他の状態についても同種の漏れがないか必ず全経路を確認する**。
