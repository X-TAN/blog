# 后台支付设置配置SQL

### 充值方式表
```sql
DROP TABLE IF EXISTS `recharge_method`;
CREATE TABLE `recharge_method`  (
`id` int(0) NOT NULL AUTO_INCREMENT COMMENT '充值方式id',
`platform_or_site_id` int(0) NOT NULL COMMENT '管理，平台，站点的id(为0是管理的默认id)',
`user_type` tinyint(1) NOT NULL COMMENT '用户类型 1-管理，2-平台，3-站点',
`method` tinyint(1) NOT NULL COMMENT '充值方式 1支付宝扫码，2-支付宝支付，3微信 4QQ',
`method_type` tinyint(1) NOT NULL COMMENT 'method的附属字段，1-官方，2-易支付,3-码支付',
`selected` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否选中，0-未选中，1-选中',
`create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
`update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '修改时间',
PRIMARY KEY (`id`) USING BTREE,
UNIQUE INDEX ```platform_id``, ``user_type``, ``method``, ``method_type```(`platform_or_site_id`, `user_type`, `method`, `method_type`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin COMMENT = '充值方式表' ROW_FORMAT = Dynamic;
```

### 支付宝扫码签约记录表
```sql
DROP TABLE IF EXISTS `recharge_method_alipay_sign_record`;
CREATE TABLE `recharge_method_alipay_sign_record`  (
`id` int(0) NOT NULL AUTO_INCREMENT COMMENT '记录id',
`recharge_method_id` int(0) NOT NULL COMMENT '充值方式id',
`merchant_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商户的姓名',
`merchant_alias_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商户的别名(显示在用户支付订单详情内的收款人名称)',
`merchant_mobile` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商户手机号',
`merchant_alipay_account` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商户对应该充值方式的账号（如果是支付宝则为支付宝账号，如果是微信则为微信账号）',
`merchant_license_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商户与营业执照编号',
`merchant_id_card_no` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商户身份证',
`merchant_mcc_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商户经营的类别码',
`alipay_user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '支付宝返回的授权商户的用户id,2088开头',
`status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '停用-0，启用-1',
`sign_status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '代签状态 -1 失败，0-未签约，1-签约中，2-待商户确认，3-签约成功',
`level` tinyint(1) NOT NULL COMMENT '1-个人，2-个体工商户，3-企业',
`auth_app_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '支付宝授权确认后，返回的商户APPid',
`token_expires_time` datetime(0) NULL DEFAULT NULL COMMENT '签约成功后凭证的过期时间',
`token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商户签约成功的凭证',
`legal_person_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '法人名称',
`legal_person_id_card_no` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '法人身份证号码',
`message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '签约返回的消息',
`day_limit_amount` decimal(11, 2) NOT NULL COMMENT '日限制最大金额(单位分)',
`mouth_limit_amount` decimal(11, 2) NOT NULL COMMENT '月限制最大金额（单位分）',
`total_amount` decimal(11, 2) NOT NULL COMMENT '累计收款（单位分）',
`sign_time` datetime(0) NULL DEFAULT NULL COMMENT '商户发起签约的时间',
`confirm_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商户确认签约的地址',
`batch_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '支付宝的签约批号',
`create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '记录的创建时间',
`update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '记录的修改时间',
PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin COMMENT = '支付宝扫码签约' ROW_FORMAT = Dynamic;

```

### 充值方式商户记录表
```sql
DROP TABLE IF EXISTS `recharge_method_record`;
CREATE TABLE `recharge_method_record`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `recharge_method_id` int(0) NOT NULL COMMENT '充值方式id',
  `day_limit_amount` decimal(11, 2) NOT NULL COMMENT '日限制最大金额(单位分)',
  `mouth_limit_amount` decimal(11, 2) NOT NULL COMMENT '月限制最大金额（单位分）',
  `total_amount` decimal(11, 2) NOT NULL COMMENT '累计收款',
  `merchant_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '支付时显示的商户名称',
  `goods_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品名称',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态,0-停用，1-启用',
  `app_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '如果是微信代表公众号id，如果是支付宝，代表应用id',
  `merchant_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商户号',
  `recharge_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '充值地址',
  `recharge_code_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '充值码id',
  `secret_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '秘钥',
  `private_key` varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '私钥',
  `public_key` varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '公钥',
  `create_time` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin COMMENT = '充值方式商户记录表' ROW_FORMAT = Dynamic;
```

### 平台下的充值方式参数配置表
```sql
DROP TABLE IF EXISTS `recharge_method_template`;
CREATE TABLE `recharge_method_template`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '模板主键',
  `recharge_method_id` int(0) NOT NULL COMMENT '充值方式id',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '状态，0-停用，1-启用',
  `min_amount` decimal(11, 2) NOT NULL COMMENT '最小充值金额（分）',
  `max_amount` decimal(11, 2) NOT NULL COMMENT '最大充值金额（分）',
  `rate` decimal(4, 2) NOT NULL COMMENT '充值费率（%）',
  `cost` decimal(11, 2) NOT NULL COMMENT '单笔手续费（分）',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` datetime(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin COMMENT = '平台下的充值方式参数配置表' ROW_FORMAT = Dynamic;
```