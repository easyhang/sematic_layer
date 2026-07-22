-- 数据更新状态查询
-- 参数: task (可选，任务类型), status (可选，completed/failed/running), limit_count (可选，默认20)
SELECT
    id,
    task,
    status,
    stocks_updated,
    started_at,
    completed_at,
    error_message
FROM update_log
WHERE 1=1
    {% if task %}AND task = '{{ task }}'{% endif %}
    {% if status %}AND status = '{{ status }}'{% endif %}
ORDER BY id DESC
LIMIT {{ limit_count|default(20) }}
