-- 技术指标值查询
-- 参数: code (必填，股票代码), indicator_name (可选，指标名称过滤), start_date, end_date
SELECT
    code,
    date,
    indicator_name,
    value
FROM indicators
WHERE code = '{{ code }}'
    {% if indicator_name %}AND indicator_name = '{{ indicator_name }}'{% endif %}
    {% if start_date %}AND date >= '{{ start_date }}'{% endif %}
    {% if end_date %}AND date <= '{{ end_date }}'{% endif %}
ORDER BY date DESC, indicator_name
LIMIT {{ limit|default(100) }}
