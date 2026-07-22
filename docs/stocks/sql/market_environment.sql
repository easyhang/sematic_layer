-- 市场环境状态查询
-- 参数: date (可选，指定日期), start_date (可选), end_date (可选)
SELECT
    date,
    regime,
    confidence,
    anomaly_type,
    index_close,
    index_pct_change,
    market_breadth,
    notes
FROM market_regime
WHERE 1=1
    {% if date %}AND date = '{{ date }}'{% endif %}
    {% if start_date %}AND date >= '{{ start_date }}'{% endif %}
    {% if end_date %}AND date <= '{{ end_date }}'{% endif %}
ORDER BY date DESC
LIMIT {{ limit|default(100) }}
