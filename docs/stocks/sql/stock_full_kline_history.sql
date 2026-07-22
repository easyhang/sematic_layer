-- 个股全量历史日K线查询
-- 参数: code (必填，股票代码), start_date (可选，起始日期), end_date (可选，结束日期)
-- 用于历史回测、事件研究和深度分析场景，默认不限定时间范围
SELECT
    code,
    date,
    open,
    high,
    low,
    close,
    volume,
    amount,
    turnover,
    pct_change
FROM kline_daily
WHERE code = '{{ code }}'
    {% if start_date %}AND date >= '{{ start_date }}'{% endif %}
    {% if end_date %}AND date <= '{{ end_date }}'{% endif %}
ORDER BY date ASC
LIMIT {{ limit|default(5000) }}
