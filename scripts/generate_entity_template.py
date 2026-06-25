#!/usr/bin/env python3
"""根据简单 schema JSON 生成候选原子实体模板。

输入 JSON 示例：
{
  "domain": "sales",
  "tables": [
    {
      "name": "orders",
      "columns": [
        {"name": "id", "type": "bigint"},
        {"name": "paid_at", "type": "timestamp"},
        {"name": "actual_pay_amount", "type": "decimal"},
        {"name": "status", "type": "varchar"}
      ]
    }
  ]
}
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def snake(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return text or "entity"


def is_time(col: dict[str, Any]) -> bool:
    name = col.get("name", "").lower()
    typ = col.get("type", "").lower()
    return any(x in name for x in ("time", "date", "created_at", "paid_at", "completed_at")) or "date" in typ or "time" in typ


def is_numeric(col: dict[str, Any]) -> bool:
    typ = col.get("type", "").lower()
    return any(x in typ for x in ("int", "decimal", "numeric", "number", "float", "double"))


def generate(schema: dict[str, Any], table_name: str | None = None) -> list[dict[str, Any]]:
    tables = schema.get("tables", [])
    result: list[dict[str, Any]] = []
    for table in tables:
        name = table.get("name")
        if table_name and name != table_name:
            continue
        cols = table.get("columns", [])
        time_cols = [c for c in cols if is_time(c)]
        numeric_cols = [c for c in cols if is_numeric(c) and not c.get("name", "").lower().endswith("id")]
        time_col = (time_cols[0].get("name") if time_cols else "{{time_field_to_confirm}}")

        count_id = f"daily_{snake(name)}_count"
        result.append({
            "id": count_id,
            "name": f"每日{name}数量",
            "entity_type": "atomic",
            "description": f"统计 {name} 表在指定时间范围内的每日记录数量。",
            "business_meaning": "候选含义，需业务确认。",
            "source_tables": [name],
            "grain": "day",
            "sql_template": f"SELECT DATE({time_col}) AS dt, COUNT(*) AS {count_id} FROM {name} WHERE {time_col} >= {{{{start_time}}}} AND {time_col} < {{{{end_time}}}} GROUP BY DATE({time_col}) ORDER BY dt",
            "parameters": [
                {"name": "start_time", "type": "timestamp", "required": True},
                {"name": "end_time", "type": "timestamp", "required": True},
            ],
            "output_schema": [
                {"name": "dt", "type": "date"},
                {"name": count_id, "type": "number"},
            ],
            "fact_interpretation_template": f"{{{{dt}}}} 的{name}数量为 {{{{{count_id}}}}}。",
            "assumptions": ["时间字段和有效状态需确认。"],
        })

        for col in numeric_cols[:5]:
            col_name = col.get("name")
            metric_id = f"daily_{snake(col_name)}_sum"
            result.append({
                "id": metric_id,
                "name": f"每日{col_name}汇总",
                "entity_type": "atomic",
                "description": f"按日汇总 {name}.{col_name}。",
                "business_meaning": "候选指标含义，需业务确认。",
                "source_tables": [name],
                "grain": "day",
                "sql_template": f"SELECT DATE({time_col}) AS dt, SUM({col_name}) AS {metric_id} FROM {name} WHERE {time_col} >= {{{{start_time}}}} AND {time_col} < {{{{end_time}}}} GROUP BY DATE({time_col}) ORDER BY dt",
                "parameters": [
                    {"name": "start_time", "type": "timestamp", "required": True},
                    {"name": "end_time", "type": "timestamp", "required": True},
                ],
                "output_schema": [
                    {"name": "dt", "type": "date"},
                    {"name": metric_id, "type": "number"},
                ],
                "fact_interpretation_template": f"{{{{dt}}}} 的{col_name}汇总值为 {{{{{metric_id}}}}}。",
                "assumptions": ["字段业务含义、时间字段、状态过滤和聚合口径需确认。"],
            })
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="从 schema JSON 生成候选原子实体模板。")
    parser.add_argument("schema", type=Path, help="schema JSON 文件路径")
    parser.add_argument("--table", help="只为指定表生成模板")
    parser.add_argument("--output", type=Path, help="输出 JSON 路径；不指定时输出到标准输出")
    args = parser.parse_args()

    data = json.loads(args.schema.read_text(encoding="utf-8"))
    entities = generate(data, args.table)
    text = json.dumps({"entities": entities}, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
