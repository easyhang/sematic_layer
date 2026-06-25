# SQL 安全指南

生成 SQL 前先确认：

- SQL 方言：PostgreSQL、MySQL、BigQuery、Snowflake、Hive、DuckDB 等。
- 准确的表名和字段名。
- 每个指标使用的时间字段。
- 状态过滤和有效性过滤。
- Join key 和数据粒度。
- 是否允许全表扫描。
- 如果提供了权限边界，确认敏感字段和脱敏规则。

## Draft SQL 判定

以下任一信息未知时，SQL 必须标记为 `draft`：

- SQL 方言。
- 权威表或权威字段。
- Join 条件。
- 指标口径。
- 时间字段。
- 有效状态过滤。

## 参数规则

- 使用 `{{start_time}}`、`{{end_time}}`、`{{channel}}` 等占位符。
- 每个占位符都必须在实体 `parameters` 中声明。
- 不要拼接未经处理的用户输入。
- 对事实表优先添加有界时间过滤。

## 敏感字段

默认行为：

- 除非明确需要，不要选择手机号、身份证号、完整地址、银行卡号、薪资、成本、毛利等直接敏感字段。
- 如果必须使用敏感字段，标记 `sensitivity`，并要求脱敏或角色确认。
- 如果没有提供权限边界，标记风险，但不阻塞草案语义层生成。

## SQL 模板示例

```sql
SELECT
  DATE(paid_at) AS dt,
  SUM(actual_pay_amount) AS gmv
FROM orders
WHERE status IN ('paid', 'completed')
  AND paid_at >= {{start_time}}
  AND paid_at < {{end_time}}
GROUP BY DATE(paid_at)
ORDER BY dt;
```
