# Flyway Database Migration Guide

## 📌 Flyway とは？
Flyway は、データベースのマイグレーション（スキーマ変更）をバージョン管理できるツールです。  
**SQL ファイルを使ってデータベースの変更を管理し、適用することができます。**

✅ **できること**
- データベースの変更を管理し、適用順序を自動で制御
- CI/CD と統合し、データベースの状態を自動的に最新化
- `flyway migrate` を実行するだけで、適用されていないSQLを自動で適用

---

## 📌 Flyway の仕組み
Flyway は **SQL マイグレーションファイル** をバージョン管理し、適用履歴を **`flyway_schema_history`** というテーブルで管理します。

**動作の流れ**
1. `migrations/` ディレクトリに **バージョン付きSQL (`V1.0__init.sql` など)** を配置
2. `flyway migrate` を実行
3. Flyway は **未適用のSQLファイルのみ実行**
4. 適用済みSQLは `flyway_schema_history` に記録され、重複適用を防ぐ

**適用履歴の管理 (`flyway_schema_history` テーブル)**
| installed_rank | version | description         | script                   | installed_on         |
|---------------|---------|---------------------|--------------------------|----------------------|
| 1             | 1.0     | init                | V1.0__init.sql           | 2025-02-26 12:00:00 |
| 2             | 1.1     | add users table     | V1.1__add_users_table.sql | 2025-02-26 12:05:00 |

✅ **既に適用された SQL は再実行されないため、安全にマイグレーションが管理できます！**

---

## 📌 Flyway のディレクトリ構成

```
flyway/ 
├── conf/ # 設定ファイルを格納 
│   ├── flyway.conf # Flyway の設定ファイル 
├── migrations/ # SQL マイグレーションファイルを格納 
│   ├── V1.0__init.sql # 初期テーブル作成 
│   ├── V1.1__add_users_table.sql # users テーブル追加 
├── README.md # このガイド
```

- **`conf/flyway.conf`** → Flyway の設定ファイル（DB接続情報など）
- **`migrations/`** → マイグレーション SQL を格納（バージョン順に適用）

---

## 📌 `flyway.conf` の書き方（DB接続情報の設定）
### **🔹 JDBCとは？**
Flyway は **JDBC (Java Database Connectivity)** を使ってデータベースに接続します。  
JDBC は **Java でデータベースに接続するための標準 API** で、`jdbc:<DB種類>://<ホスト>:<ポート>/<DB名>` という形式のURLを使います。

### **🔹 `flyway.conf` の基本構成**
以下は PostgreSQL に接続する場合の例です。

```ini
flyway.url=jdbc:postgresql://localhost:5432/mydb
flyway.user=dbuser
flyway.password=secret
flyway.locations=filesystem:./migrations
```

### **🔹 設定項目の説明**

設定項目            |   説明
---                 |   ---
`flyway.url`          |   JDBC URL（DBの接続情報）
`flyway.user`         |   データベースのユーザー名
`flyway.password`     |   データベースのパスワード
`flyway.locations`    |   SQL ファイルのディレクトリ

## 📌 各データベースの flyway.url 設定例

データベース	    |   JDBC URL の例
---                 |   ---
PostgreSQL	        |jdbc:postgresql://localhost:5432/mydb
MySQL / MariaDB	    |   jdbc:mysql://localhost:3306/mydb
SQL Server	        |   jdbc:sqlserver://localhost:1433;databaseName=mydb
Oracle	            |   jdbc:oracle:thin:@localhost:1521:xe
SQLite	            |   jdbc:sqlite:/path/to/mydb.sqlite

✅ データベースに応じて `flyway.url` を変更してください。

## 📌 マイグレーションファイルの書き方
### **🔹 マイグレーションファイルの命名規則**

``` php-template
V<バージョン番号>__<説明>.sql
```

- `V1.0__init.sql` → 初期テーブル作成
- `V1.1__add_users_table.sql` → users テーブル追加
- `V1.2__add_email_column.sql` → users テーブルに email カラム追加

✅ バージョン (V1.0, V1.1...) の順に適用される

### **🔹 V1.0__init.sql（初期テーブル作成）**

``` sql
CREATE TABLE test (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);
```

### **🔹 V1.1__add_users_table.sql（users テーブル追加）**

``` sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE
);
```

✅ 新しい変更を追加する場合、新しい V1.2__xxx.sql を作成する！

## 📌 Flyway の基本コマンド
### **🔹 マイグレーションの適用**

``` sh
./flyway migrate
```

✅ 未適用のSQLが実行され、データベースが更新される！

### **🔹 適用履歴の確認**

``` sh
./flyway info
```

✅ 適用済み・未適用のSQLが一覧表示される！

### **🔹 マイグレーションのリセット（開発環境のみ）**

``` sh
./flyway clean
```

🚨 ⚠️ すべてのテーブルが削除されるので、本番環境では絶対に実行しない！

## 📌 よくあるトラブルシューティング
❌ エラー: "Database does not exist" ➡ 解決策: CREATE DATABASE mydb; を実行して DB を作成する

❌ エラー: "Already applied migration cannot be changed" ➡ 解決策: 既存のSQLを変更せず、新しい V1.X__update.sql を作る

❌ エラー: "Connection refused" ➡ 解決策: flyway.url のホスト・ポートが正しいか確認する

## 🚀 まとめ

✅ Flyway はデータベース変更を安全に適用・管理できるツール

✅ JDBC URL を使ってデータベースに接続する（flyway.url の設定が重要）

✅ マイグレーションは V1.0__init.sql のようにバージョン付きで管理

✅ flyway migrate を実行するだけで自動適用

✅ 既存のSQLは変更せず、新しいSQLファイルを追加するのがベストプラクティス

🚀 Flyway を使って、スムーズなデータベース管理を実現しよう！