-- 周K线行情查询
-- 参数: code (必填，股票代码), start_date (可选，起始日期), end_date (可选，结束日期)
SELECT
    code,
    date,
    open,
    high,
    low,
    close,
    volume,
    amount
FROM kline_weekly
WHERE code = '{{ code }}'
    {% if start_date %}AND date >= '{{ start_date }}'{% endif %}
    {% if end_date %}AND date <= '{{ end_date }}'{% endif %}
ORDER BY date DESC
LIMIT {{ limit|default(100) }}
