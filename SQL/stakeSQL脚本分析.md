/*
 Navicat Premium Dump SQL

 Source Server         : postgres
 Source Server Type    : PostgreSQL
 Source Server Version : 170006 (170006)
 Source Host           : localhost:5432
 Source Catalog        : web3
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170006 (170006)
 File Encoding         : 65001

 Date: 13/10/2025 19:59:51
*/


-- ----------------------------
-- Table structure for chain
-- ----------------------------
DROP TABLE IF EXISTS "public"."chain";
CREATE TABLE "public"."chain" (
  "id" int8 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1
),
  "chain_id" int8,
  "chain_name" varchar(255) COLLATE "pg_catalog"."default",
  "last_block_num" int8,
  "address" varchar(255) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "public"."chain"."chain_id" IS '链id';
COMMENT ON COLUMN "public"."chain"."chain_name" IS '链名称';
COMMENT ON COLUMN "public"."chain"."last_block_num" IS '最后监听的区块';
COMMENT ON COLUMN "public"."chain"."address" IS '地址';

-- ----------------------------
-- Table structure for score_rules
-- ----------------------------
DROP TABLE IF EXISTS "public"."score_rules";
CREATE TABLE "public"."score_rules" (
  "id" int8 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1
),
  "chain_id" int8,
  "token_address" varchar(255) COLLATE "pg_catalog"."default",
  "score" numeric(10,2),
  "decimals" int8
)
;
COMMENT ON COLUMN "public"."score_rules"."score" IS '积分，例子：0.05,单位每小时';
COMMENT ON COLUMN "public"."score_rules"."decimals" IS '合约decimals()';

-- ----------------------------
-- Table structure for user_operation_record
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_operation_record";
CREATE TABLE "public"."user_operation_record" (
  "id" int8 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1
),
  "chain_id" int8,
  "token_address" varchar(128) COLLATE "pg_catalog"."default",
  "address" varchar(128) COLLATE "pg_catalog"."default",
  "pool_id" int8,
  "amount" int8,
  "operation_time" timestamptz(6),
  "unlock_time" timestamptz(6),
  "tx_hash" varchar(255) COLLATE "pg_catalog"."default",
  "block_number" int8,
  "event_type" varchar(32) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" int8 NOT NULL GENERATED ALWAYS AS IDENTITY (
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1
),
  "chain_id" int4,
  "address" varchar(255) COLLATE "pg_catalog"."default",
  "total_amount" int8,
  "last_block_num" int8,
  "token_address" varchar(255) COLLATE "pg_catalog"."default",
  "jf_amount" int8 NOT NULL DEFAULT 0,
  "jf" numeric(10,2) NOT NULL DEFAULT 0,
  "jf_time" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
COMMENT ON COLUMN "public"."users"."id" IS '主键id';
COMMENT ON COLUMN "public"."users"."chain_id" IS '链id';
COMMENT ON COLUMN "public"."users"."address" IS '用户address';
COMMENT ON COLUMN "public"."users"."total_amount" IS '总金额';
COMMENT ON COLUMN "public"."users"."last_block_num" IS '最后区块';
COMMENT ON COLUMN "public"."users"."token_address" IS 'token地址';
COMMENT ON COLUMN "public"."users"."jf_amount" IS '计算积分时的总金额';
COMMENT ON COLUMN "public"."users"."jf" IS '截止计算积分时的总积分';

-- ----------------------------
-- Primary Key structure for table chain
-- ----------------------------
ALTER TABLE "public"."chain" ADD CONSTRAINT "chain_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table score_rules
-- ----------------------------
ALTER TABLE "public"."score_rules" ADD CONSTRAINT "score_rules_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table user_operation_record
-- ----------------------------
ALTER TABLE "public"."user_operation_record" ADD CONSTRAINT "user_operation_records_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE UNIQUE INDEX "uk" ON "public"."users" USING btree (
  "chain_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "token_address" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "address" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

## 核心数据模型与业务含义
1) chain：区块链维度的监听进度与合约地址
- 字段：chain_id( bigint )、chain_name、last_block_num、address（通常是监听的合约/Router/质押合约地址）。
- 作用：记录每条链的最新已处理区块高度，便于离线任务“断点续扫”，以及可能用于多链切换时的标识。
- 典型用法：
   - 同步器启动时读 last_block_num，从该高度继续拉取事件；
   - 同步完成后回写最新高度。

2) score_rules：积分规则（每小时积分速率）
- 字段：chain_id、token_address、score numeric(10,2)、decimals bigint。
- 备注：注释中写明“积分，例子：0.05，单位每小时；decimals 为合约 decimals()”。
- 作用：不同行/不同代币可以配置每小时积分速率，并且提供代币精度，便于把链上原始单位（最小单位）转换成人类可读金额。
- 典型用法：
   - 计算积分：有效金额(人类单位) × 小时数 × score；
   - 将 amount 从“最小单位”转为“人类单位”：amount / 10^decimals。

3) user_operation_record：用户质押/解押等链上事件流水
- 字段：chain_id、token_address、address（用户地址）、pool_id、amount bigint、operation_time timestamptz、unlock_time timestamptz、tx_hash、block_number、event_type。
- 作用：原始事件流水表，用于还原任意时刻的余额、计算锁定期限、追溯交易哈希与区块高度。
- 典型用法：
   - 计算某用户在一段时间内的净流入/净流出；
   - 基于 unlock_time 提醒可解锁；
   - 结合 event_type 区分质押/解押/复投等。

4) users：按「链×代币×地址」聚合的用户快照
- 唯一键：(chain_id, token_address, address) 唯一索引 uk。
- 字段：
   - total_amount bigint：当前总金额（通常是原始单位累计值）；
   - last_block_num bigint：该用户维度的最后处理区块（可做幂等与增量计算用）；
   - jf_amount bigint：用于积分计算时锁定的金额快照（原始单位），配合 jf_time；
   - jf numeric(10,2)：截止上次结算时的累计积分；
   - jf_time timestamptz：上次积分结算的时间戳（默认 CURRENT_TIMESTAMP）。
- 作用：把高频的原始事件（user_operation_record）沉淀为低频可直接用于业务展示/结算的快照，尤其是积分累计的“起算点”。
- 小结：这四张表配合形成立体视图：
   - chain 管“从哪儿继续扫”；
   - user_operation_record 管“流水明细”；
   - users 管“当前余额/积分快照”；
   - score_rules 提供“如何把余额换算成积分的规则”。
