## プロジェクトの構成

原稿は`manuscripts/`、ページの見た目は`src/styles/book.css`、書籍情報は`book.json`に置いています。

```text
manuscripts/
src/layouts/
src/styles/
scripts/
book.json
profiles.json
```

HTMLを確認するには、次のコマンドを実行します。

```text
npm run build:book:html
```

生成されたHTMLを確認できたら、PDFを作成します。
