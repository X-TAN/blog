# V2.2.0

---
#### DB
>lkb_mall_order

**TABLE**
>order_export_config </br>
>order </br>

**SQL**
```sql
INSERT INTO `order_export_config` (`property_name`, `name`, `type`, `is_default`, `property_origin`, `post_way`) VALUES ('groupActivityNo', '拼团团号', 0, 0, 1, 0);
INSERT INTO `order_export_config` (`property_name`, `name`, `type`, `is_default`, `property_origin`, `post_way`) VALUES ('groupStatus', '拼团状态', 0, 0, 1, 0);
INSERT INTO `order_export_config` (`property_name`, `name`, `type`, `is_default`, `property_origin`, `post_way`) VALUES ('groupNum', '团人数', 0, 0, 1, 0);
INSERT INTO `order_export_config` (`property_name`, `name`, `type`, `is_default`, `property_origin`, `post_way`) VALUES ('isGroupMaster', '是否团长', 0, 0, 1, 0);
```

**SQL**
```sql
ALTER TABLE `order` 
ADD COLUMN `refund_status` tinyint(1) UNSIGNED ZEROFILL NOT NULL DEFAULT 0 COMMENT '退款状态：0-未退款，1-退款中 5-退款完成 9-退款失败 枚举RefundStatusEnum' AFTER `group_activity_no`,
ADD COLUMN `refund_msg` varchar(255) NULL COMMENT '退款状态详细描述' AFTER `refund_status`;
```






---