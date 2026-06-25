# 示例

以下是一个紧凑的电商销售语义层示例。

## L0 原子实体

```yaml
- id: daily_gmv
  name: 每日 GMV
  entity_type: atomic
  source_tables: [orders]
  grain: day
  sql_template_ref: sql/daily_gmv.sql
  parameters:
    - { name: start_time, type: timestamp, required: true }
    - { name: end_time, type: timestamp, required: true }
  output_schema:
    - { name: dt, type: date }
    - { name: gmv, type: number }
  fact_interpretation_template: "{{dt}} 的 GMV 为 {{gmv}}。"

- id: daily_paid_order_count
  name: 每日支付订单数
  entity_type: atomic
  source_tables: [orders]
  grain: day
  sql_template_ref: sql/daily_paid_order_count.sql
  parameters:
    - { name: start_time, type: timestamp, required: true }
    - { name: end_time, type: timestamp, required: true }
  output_schema:
    - { name: dt, type: date }
    - { name: paid_order_count, type: number }
  fact_interpretation_template: "{{dt}} 的支付订单数为 {{paid_order_count}}。"
```

## 概念实体

```yaml
- id: sales_trend
  name: 销售趋势
  entity_type: concept
  concept_layer: L1_business_concept
  depends_on: [daily_gmv, daily_paid_order_count]
  composition_type: trend
  composition_rule:
    logic: 比较当前周期与上一周期的 gmv 和 paid_order_count
    explanation: 结合 GMV 和订单数环比判断销售走势。
  business_keywords: [销售趋势, 销售情况, GMV 走势]
  example_queries:
    - 最近一周销售怎么样？
  answer_template: "{{date_range}} 销售趋势为 {{trend_summary}}。"

- id: sales_health
  name: 销售健康度
  entity_type: concept
  concept_layer: L2_decision_concept
  depends_on: [sales_trend]
  source_atomic_entities: [daily_gmv, daily_paid_order_count]
  composition_type: health_score
  composition_rule:
    logic: sales_trend not in ('rapid_decline', 'abnormal_drop')
    explanation: 根据销售趋势判断销售是否健康。
  business_keywords: [销售健康度, 经营表现, 销售是否正常]
  example_queries:
    - 最近一周销售健康吗？
  answer_template: "{{date_range}} 销售健康度为 {{health_level}}，原因是 {{reason_summary}}。"
```

## Query 映射

```yaml
- user_query: 最近一周销售情况怎么样？
  matched_concepts: [sales_health]
  concept_chain: [sales_health, sales_trend]
  atomic_entities: [daily_gmv, daily_paid_order_count]
  required_parameters:
    date_range: last_7_days
  answer_style: summary_with_reasons
```
