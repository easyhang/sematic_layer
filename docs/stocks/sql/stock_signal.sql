-- 交易信号查询
-- 参数: code (必填，股票代码), layer (可选，L1/L2/L3/L4), dimension (可选，trend/momentum/volume_price等), start_date, end_date
SELECT
    code,
    date,
    layer,
    dimension,
    indicator,
    period,
    score,
    value,
    reason
FROM signals
WHERE code = '{{ code }}'
    {% if layer %}AND layer = '{{ layer }}'{% endif %}
    {% if dimension %}AND dimension = '{{ dimension }}'{% endif %}
    {% if start_date %}AND date >= '{{ start_date }}'{% endif %}
    {% if end_date %}AND date <= '{{ end_date }}'{% endif %}
ORDER BY date DESC, layer, dimension
LIMIT {{ limit|default(100) }}
