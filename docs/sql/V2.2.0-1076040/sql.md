# V2.2.0-1076040

---
#### DB
>lkb_mall_seller

**TABLE**
>seller </br>

**SQL**
```sql
ALTER TABLE ``.`seller`
ADD COLUMN `real_name_auth_type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '实名认证类型\r\n1-（姓名，身份证号码，手机号）的文字信息\r\n2-  包含1在内的所有信息，并且提供身份证正反面照片' AFTER `version`;
```



---