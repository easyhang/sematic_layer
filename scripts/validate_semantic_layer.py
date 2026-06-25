#!/usr/bin/env python3
"""校验语义层 YAML / JSON 文件。

用法：
  python scripts/validate_semantic_layer.py semantic-layer/sales
  python scripts/validate_semantic_layer.py semantic-layer/sales --json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover
    yaml = None


class ValidationError(Exception):
    pass


def load_data(path: Path) -> Any:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return json.loads(text)
    if yaml is None:
        raise ValidationError("读取 YAML 文件需要 PyYAML。请安装：pip install pyyaml")
    return yaml.safe_load(text) or []


def as_list(data: Any, key: str | None = None) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        if key and isinstance(data.get(key), list):
            return [x for x in data[key] if isinstance(x, dict)]
        for candidate in ("entities", "concepts", "atomic_entities", "concept_entities"):
            if isinstance(data.get(candidate), list):
                return [x for x in data[candidate] if isinstance(x, dict)]
    return []


def load_layer(root: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    atomic_paths = [root / "entities" / "atomic.yaml", root / "entities" / "atomic.json"]
    concept_paths = [root / "entities" / "concepts.yaml", root / "entities" / "concepts.json"]
    mapping_paths = [root / "mappings" / "query-examples.yaml", root / "mappings" / "query-examples.json"]

    atomic = []
    concepts = []
    mappings = []
    for p in atomic_paths:
        atomic.extend(as_list(load_data(p), "entities"))
    for p in concept_paths:
        concepts.extend(as_list(load_data(p), "concepts"))
    for p in mapping_paths:
        mappings.extend(as_list(load_data(p), "query_mapping_examples"))
    return atomic, concepts, mappings


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def detect_cycles(graph: dict[str, list[str]]) -> list[str]:
    errors: list[str] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def dfs(node: str, path: list[str]) -> None:
        if node in visiting:
            cycle = " -> ".join(path + [node])
            errors.append(f"检测到循环依赖：{cycle}")
            return
        if node in visited:
            return
        visiting.add(node)
        for nxt in graph.get(node, []):
            if nxt in graph:
                dfs(nxt, path + [node])
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        dfs(node, [])
    return errors


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    atomic, concepts, mappings = load_layer(root)

    atomic_ids = {e.get("id") for e in atomic if e.get("id")}
    concept_ids = {c.get("id") for c in concepts if c.get("id")}
    all_ids = atomic_ids | concept_ids

    require(bool(atomic), "未在 entities/atomic.yaml 或 entities/atomic.json 中找到原子实体", errors)

    for e in atomic:
        eid = e.get("id", "<缺少 id>")
        require(bool(e.get("id")), "原子实体缺少 id", errors)
        require(e.get("entity_type") in ("atomic", "atomic_entity"), f"{eid}: entity_type 必须为 atomic", errors)
        require(bool(e.get("description") or e.get("business_meaning")), f"{eid}: 缺少 description 或 business_meaning", errors)
        require(bool(e.get("source_tables")), f"{eid}: 缺少 source_tables", errors)
        require(bool(e.get("grain")), f"{eid}: 缺少 grain", errors)
        require(bool(e.get("sql_template") or e.get("sql_template_ref")), f"{eid}: 缺少 sql_template 或 sql_template_ref", errors)
        require(bool(e.get("parameters") is not None), f"{eid}: 缺少 parameters", errors)
        require(bool(e.get("output_schema")), f"{eid}: 缺少 output_schema", errors)
        require(bool(e.get("fact_interpretation_template")), f"{eid}: 缺少 fact_interpretation_template", errors)

    graph: dict[str, list[str]] = {}
    for c in concepts:
        cid = c.get("id", "<缺少 id>")
        layer = c.get("concept_layer")
        deps = c.get("depends_on") or []
        require(bool(c.get("id")), "概念实体缺少 id", errors)
        require(c.get("entity_type") in ("concept", "concept_entity"), f"{cid}: entity_type 必须为 concept", errors)
        require(layer in ("L1_business_concept", "L2_decision_concept"), f"{cid}: concept_layer 缺失或非法", errors)
        require(isinstance(deps, list) and bool(deps), f"{cid}: depends_on 必须是非空列表", errors)
        require(bool(c.get("composition_rule")), f"{cid}: 缺少 composition_rule", errors)
        require(bool(c.get("business_keywords")), f"{cid}: 缺少 business_keywords", errors)
        require(bool(c.get("answer_template") or c.get("interpretation_rule")), f"{cid}: 缺少 answer_template 或 interpretation_rule", errors)
        graph[cid] = [d for d in deps if isinstance(d, str)]

        for dep in deps:
            require(dep in all_ids, f"{cid}: depends_on 引用了不存在的 id：{dep}", errors)
            if layer == "L1_business_concept":
                require(dep in atomic_ids, f"{cid}: L1 只能依赖原子实体，但引用了 {dep}", errors)
            if layer == "L2_decision_concept":
                dep_concept = next((x for x in concepts if x.get("id") == dep), None)
                require(not dep_concept or dep_concept.get("concept_layer") != "L2_decision_concept", f"{cid}: L2 不得依赖另一个 L2：{dep}", errors)

    errors.extend(detect_cycles(graph))

    for m in mappings:
        query = m.get("user_query", "<缺少 user_query>")
        for cid in m.get("matched_concepts", []) or []:
            require(cid in concept_ids, f"映射 {query}: 引用了不存在的概念 {cid}", errors)
        for eid in m.get("atomic_entities", []) or []:
            require(eid in atomic_ids, f"映射 {query}: 引用了不存在的原子实体 {eid}", errors)

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="校验语义层目录中的实体、概念依赖和 Query 映射。")
    parser.add_argument("root", type=Path, help="语义层业务域目录，例如 semantic-layer/sales")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出校验结果")
    args = parser.parse_args()

    errors = validate(args.root)
    if args.json:
        print(json.dumps({"ok": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    elif errors:
        print("语义层校验失败：")
        for err in errors:
            print(f"- {err}")
    else:
        print("语义层校验通过。")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
