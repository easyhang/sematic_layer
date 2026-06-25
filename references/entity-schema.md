# 实体 Schema

本文件定义语义层 YAML 源文件和 JSON 运行时文件的字段契约。字段名保持英文，便于程序读取；说明文字使用中文。

## L0 原子实体

L0 原子实体是可以直接落到 SQL 的最小数据事实单元。

必需字段示例：

```yaml
id: daily_gmv
name: 每日 GMV
entity_type: atomic
version: 1
description: 统计每天有效订单产生的 GMV。
business_meaning: 反映每日成交规模。
source_tables:
  - orders
grain: day
sql_template_ref: sql/daily_gmv.sql
parameters:
  - name: start_time
    type: timestamp
    required: true
    description: 统计开始时间
  - name: end_time
    type: timestamp
    required: true
    description: 统计结束时间
filters:
  required:
    - status in ('paid', 'completed')
  optional:
    - channel
    - region_id
output_schema:
  - name: dt
    type: date
    description: 日期
  - name: gmv
    type: number
    description: 有效 GMV
fact_interpretation_template: "{{dt}} 的 GMV 为 {{gmv}}。"
assumptions: []
validation_queries: []
```

规则：

- 每个 L0 原子实体只表达一个稳定事实。
- 必须包含 `sql_template` 或 `sql_template_ref`。
- SQL 中使用的每个参数都必须在 `parameters` 中声明。
- 必须包含 `output_schema` 和 `fact_interpretation_template`。
- 如果 SQL 方言、时间字段、状态过滤或业务口径未确认，应在 `assumptions` 中标记。

## L1 业务概念

L1 业务概念由一个或多个 L0 原子实体组合而成，用于表达单一业务观察。

```yaml
id: sales_trend
name: 销售趋势
entity_type: concept
concept_layer: L1_business_concept
description: 描述一段时间内销售规模的变化趋势。
depends_on:
  - daily_gmv
  - daily_paid_order_count
composition_type: metric_group
composition_rule:
  logic: 比较当前周期和上一周期的 GMV 与订单数
  explanation: 结合 GMV 与支付订单数判断销售趋势。
business_keywords:
  - 销售趋势
  - 成交趋势
  - GMV 走势
example_queries:
  - 最近一周销售情况怎么样？
interpretation_rule: 结合趋势、环比、峰值和低谷解释销售表现。
answer_template: "{{date_range}} 销售趋势为 {{trend_summary}}。"
assumptions: []
validation_cases: []
```

规则：

- `concept_layer` 必须为 `L1_business_concept`。
- `depends_on` 只能引用 L0 原子实体。
- L1 描述业务观察，不应直接表达最终判断或决策。

## L2 决策概念

L2 决策概念由 L1 概念组合而成，用于表达判断、分类、预警或决策。

```yaml
id: sales_health
name: 销售健康度
entity_type: concept
concept_layer: L2_decision_concept
description: 综合判断销售表现是否健康。
depends_on:
  - sales_trend
  - average_order_value_performance
  - repurchase_performance
source_atomic_entities:
  - daily_gmv
  - daily_paid_order_count
  - customer_repurchase_rate
composition_type: health_score
composition_rule:
  logic: sales_trend != 'declining_fast' AND average_order_value_performance != 'weak'
  explanation: 综合趋势、客单价和复购表现判断销售健康度。
business_keywords:
  - 销售健康度
  - 销售情况
  - 经营表现
example_queries:
  - 最近一周销售健康吗？
answer_template: "{{date_range}} 销售健康度为 {{health_level}}，主要原因是 {{reason_summary}}。"
assumptions: []
validation_cases: []
```

规则：

- `concept_layer` 必须为 `L2_decision_concept`。
- `depends_on` 可以引用 L1 概念，也可在必要时少量直接引用 L0 原子实体。
- L2 不得依赖其他 L2。
- 当 L2 依赖 L1 时，应使用 `source_atomic_entities` 保留到底层 L0 原子实体的可追溯性。
