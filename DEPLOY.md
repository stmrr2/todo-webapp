# 公開手順（Render + MongoDB Atlas）

このアプリは、Node.js/ExpressとMongoDBを使用するため、静的サイトだけのホスティングでは動きません。GitHubに公開した後、WebサーバをRender、データベースをMongoDB Atlasに置く構成が分かりやすいです。

## 1. MongoDB Atlas

1. MongoDB AtlasでFree clusterを作成します。
2. Database Accessでアプリ用のデータベースユーザを作成します。
3. Network AccessでRenderから接続できる設定を行います。
4. ConnectからNode.js用の接続文字列を取得します。
5. 接続文字列のユーザ名・パスワードを設定し、`MONGODB_URI`としてRenderに登録します。

## 2. GitHub

このフォルダの中身を新しいPublicリポジトリにアップロードします。

`.env`、`node_modules/`、`dist/` はアップロードしません（`.gitignore`に設定済みです）。

## 3. Render

1. Renderで `New` → `Web Service` を選択します。
2. GitHubのリポジトリを接続します。
3. Build Commandを次に設定します。

```text
npm install && npm run build
```

4. Start Commandを次に設定します。

```text
npm start
```

5. Environment Variablesに次を設定します。

```text
NODE_ENV=production
MONGODB_URI=<Atlasの接続文字列>
DB_NAME=todo_portfolio
JWT_SECRET=<長いランダム文字列>
```

6. デプロイ完了後、発行された `onrender.com` のURLをシークレットウィンドウで開き、登録・ログイン・タスク操作を確認します。

## 4. 公開後の確認

- 新規登録できる
- ログインできる
- 別ユーザのタスクが表示されない
- 追加 / 編集 / 完了切替 / 削除が動く
- ログアウト後にタスクAPIへアクセスできない
- GitHub上に `.env` や実際の接続文字列、JWT秘密鍵が存在しない
