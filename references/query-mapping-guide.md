# Query 映射指南

对每个用户问题，识别以下信息：

1. 业务意图。
2. 时间范围。
3. 主体对象：客户、订单、商品、渠道、地区、员工等。
4. 需要的指标或事实。
5. 过滤条件：状态、渠道、地区、分群、负责人、品类等。
6. 对比对象：上一周期、去年同期、基准值、阈值等。
7. 匹配概念：判断类问题优先匹配 L2，观察类问题优先匹配 L1。
8. 所需 L0 原子实体。
9. 缺失参数和追问问题。
10. 回答样式：摘要、排名、列表、诊断、预警或建议。

## 映射启发式

- “怎么样 / 是否健康 / 为什么变差 / 是否异常”通常映射到 L2 决策概念。
- “趋势 / 走势 / 变化 / 环比”通常映射到 L1 趋势概念。
- “多少 / 列出 / Top N”可能直接映射到 L0 原子实体或 L1 概念。
- “哪些客户 / 哪些商品”通常需要主体粒度、排序或过滤条件。

## 示例

用户问题：`最近一周销售情况怎么样？`

```yaml
user_query: 最近一周销售情况怎么样？
intent: sales_health_diagnosis
time_range: last_7_days
matched_concepts:
  - sales_health
concept_layers:
  sales_health: L2_decision_concept
concept_chain:
  - sales_health
  - sales_trend
  - average_order_value_performance
atomic_entities:
  - daily_gmv
  - daily_paid_order_count
required_parameters:
  start_time: inferred:last_7_days_start
  end_time: inferred:last_7_days_end
answer_style: summary_with_reasons
missing_parameters: []
```

## 歧义处理

以下情况需要追问：

- 用户没有提供时间范围，且项目没有默认时间范围。
- 指标口径缺失。
- 用户请求敏感明细，但权限边界未知。
- 请求的概念存在多个合理定义。

如果项目已有合理默认值，不要过度追问；使用默认值并写入 `assumptions`。
