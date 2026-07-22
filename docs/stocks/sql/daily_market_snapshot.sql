-- 日度市场快照：查询指定交易日所有个股的关键指标
-- 参数: date (必填，交易日期), industry (可选，行业过滤), sort_by (可选，排序字段), limit_count (可选，默认100)
SELECT
    s.code,
    s.name,
    s.industry,
    k.close,
    k.pct_change,
    k.volume,
    k.amount,
    k.turnover,
    k.high,
    k.low,
    k.open,
    (k.high - k.low) / k.close * 100 AS amplitude
FROM kline_daily k
JOIN stocks s ON k.code = s.code
WHERE k.date = '{{ date }}'
    AND s.is_active = 1
    {% if industry %}AND s.industry LIKE '%{{ industry }}%'{% endif %}
ORDER BY
    {% if sort_by == 'pct_change_desc' %}k.pct_change DESC
    {% elif sort_by == 'pct_change_asc' %}k.pct_change ASC
    {% elif sort_by == 'volume_desc' %}k.volume DESC
    {% elif sort_by == 'turnover_desc' %}k.turnover DESC
    {% elif sort_by == 'amount_desc' %}k.amount DESC
    {% elif sort_by == 'amplitude_desc' %}(k.high - k.low) / k.close * 100 DESC
    {% else %}k.pct_change DESC{% endif %}
LIMIT {{ limit_count|default(100) }}
