# AstroとVivliostyleのサンプルブック

Markdown原稿から、AstroとVivliostyleを使ってA5判のPDFを作るための公開サンプルです。

このリポジトリだけで動作します。取得して依存関係をインストールすれば、短いサンプル原稿からHTMLとPDFを生成できます。

原稿は学習用のサンプルへ置き換えています。実際の書籍本文や個人の執筆データは含めていません。

## 必要な環境

- Windows 11
- Node.js 24系
- npm
- VS Code
- GitHub Copilot（任意）

動作確認にはNode.js v24.19.0とnpm 11.17.0を使用しました。

## セットアップ

```text
npm install
```

## 依存関係のセキュリティ

`npm audit`で依存パッケージの警告を確認できます。2026年11月15日の確認時点では、依存関係を更新後もVivliostyle CLIの間接依存などにhigh 7件、moderate 31件の警告が残っています。警告があることと、このサンプルで実際に悪用できることは同義ではありません。

脆弱性情報と依存関係の更新状況を確認し、出所の不明な原稿やファイルの取り扱いには注意してください。互換性を確認せずに`npm audit fix --force`を実行すると、依存パッケージの大幅な変更が発生する場合があります。

## 書籍HTMLを生成する

```text
npm run build:book:html
```

生成先は`dist-book/`です。

## 書籍HTMLを検証する

```text
npm run check:book
```

見出しID、内部リンク、画像、必須のHTML要素を確認します。

## PDFを生成する

電子版と印刷確認用PDFを生成します。

```text
npm run build:book:pdf
```

登録済みの出力プロファイルをすべて実行する場合は、次のコマンドを使います。

```text
npm run build:book:all
```

プロファイルは[profiles.json](./profiles.json)で管理します。

## PDFを検証する

```text
npm run validate:book:pdf
```

検証結果は`dist-books/sample/reports/`へ出力されます。`PASS_WITH_WARNINGS`や`NOT VERIFIED`は、印刷会社への入稿適合性を意味しません。

## プレビューする

```text
npm run preview:book
```

## 原稿を編集する

原稿は[manuscripts/](./manuscripts/)に置きます。採用する原稿の順序とタイトルは[book.json](./book.json)で指定します。

原稿の例は次のとおりです。

- `00-preface.md`：はじめに
- `00-content.md`：この本の内容
- `01-overview.md`：第一章
- `02-environment.md`：第二章
- `03-manuscript.md`：第三章
- `04-design.md`：第四章
- `05-pdf.md`：第五章
- `90-afterword.md`：おわりに
- `99-colophon.md`：奥付

## ライセンス

コードと設定は[MIT License](./LICENSE)で公開しています。

サンプル本文、サンプル画像、CSSデザインは[CONTENT-LICENSE.md](./CONTENT-LICENSE.md)の条件で公開しています。

## レイアウトを編集する

書籍全体のページ設定とデザインは[src/styles/book.css](./src/styles/book.css)で管理します。

書籍全体のHTML構造は[src/layouts/Book.astro](./src/layouts/Book.astro)で管理します。

## 注意事項

- PDF生成成功と印刷会社への入稿適合性は別の状態です。
- PDF/X、ICC、CMYK、フォントライセンスは別途確認が必要です。
- 印刷所固有の条件は、公式情報を確認してから設定します。
- `dist-book/`と`dist-books/`は生成物です。
