#!/usr/bin/env python3
"""Utility script invoked from the NestJS backend to execute Airtable lookups.

The script reads a JSON payload from STDIN with the following structure:
{
  "field": "email" | "orderId",
  "value": "lookup value"
}

Environment variables provide Airtable credentials:
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- AIRTABLE_TABLE_ID
- AIRTABLE_VIEW_ID (optional)

The script outputs a JSON response containing the lookup matches. It never raises
unhandled exceptions so that the Node.js caller can provide consistent error
handling.
"""

import json
import os
import sys
import time
from typing import Any, Dict, List

ResponsePayload = Dict[str, Any]


def emit(payload: ResponsePayload) -> None:
  sys.stdout.write(json.dumps(payload))
  sys.exit(0)


def emit_error(message: str, code: str, details: Any | None = None) -> None:
  error_payload: ResponsePayload = {
    "status": "error",
    "error": message,
    "code": code,
  }
  if details is not None:
    error_payload["details"] = details
  emit(error_payload)


def sanitize_formula_value(value: str) -> str:
  """Escape single quotes for inclusion within Airtable formulas."""
  return value.replace("'", "\\'")


def load_payload() -> Dict[str, Any]:
  raw_input = sys.stdin.read()
  if not raw_input:
    emit_error("Missing input payload", "INPUT_ERROR")
  try:
    payload = json.loads(raw_input)
  except json.JSONDecodeError as exc:
    emit_error(
      "Invalid JSON payload received",
      "INPUT_ERROR",
      {"reason": str(exc)},
    )
  return payload


def normalise_field(field: str) -> str:
  key = field.strip().lower()
  if key in {"email"}:
    return "Email"
  if key in {"orderid", "order_id"}:
    return "ID"
  emit_error(
    "Unsupported lookup field. Expected 'email' or 'orderId'.",
    "INPUT_ERROR",
  )
  return ""


def import_pyairtable() -> Any:
  try:
    from pyairtable import Table  # type: ignore
  except Exception as exc:  # pragma: no cover - dependency handled at runtime
    emit_error(
      "pyairtable package not available. Install pyairtable in the backend runtime.",
      "AIRTABLE_IMPORT_ERROR",
      {"reason": str(exc)},
    )
  return Table


def query_airtable(
  table: Any,
  field_name: str,
  value: str,
  view_id: str | None,
) -> List[Dict[str, Any]]:
  lowered_value = value.lower()
  formula = "LOWER({{{}}}) = '{}'".format(field_name, sanitize_formula_value(lowered_value))

  # Attempt to limit results to minimise Airtable pagination cost.
  try:
    records = table.all(view=view_id or None, formula=formula, max_records=3)
  except TypeError:
    records = table.all(view=view_id or None, formula=formula)

  if not isinstance(records, list):
    emit_error("Unexpected response format from Airtable", "QUERY_ERROR")

  return records[:3]


def main() -> None:
  start_time = time.time()

  payload = load_payload()
  field = str(payload.get("field", ""))
  value = str(payload.get("value", "")).strip()

  if not value:
    emit_error("Lookup value must not be empty", "INPUT_ERROR")

  api_key = os.getenv("AIRTABLE_API_KEY")
  base_id = os.getenv("AIRTABLE_BASE_ID")
  table_id = os.getenv("AIRTABLE_TABLE_ID")
  view_id = os.getenv("AIRTABLE_VIEW_ID") or None

  if not api_key or not base_id or not table_id:
    emit_error(
      "Airtable credentials not configured. Ensure AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_ID are set.",
      "CONFIGURATION_ERROR",
    )

  table_class = import_pyairtable()

  try:
    table = table_class(api_key, base_id, table_id)
  except Exception as exc:
    emit_error(
      "Failed to initialise Airtable client",
      "CLIENT_ERROR",
      {"reason": str(exc)},
    )

  field_name = normalise_field(field)

  try:
    matches = query_airtable(table, field_name, value, view_id)
  except Exception as exc:
    emit_error(
      "Airtable query failed",
      "QUERY_ERROR",
      {"reason": str(exc)},
    )

  simplified_matches = [
    {
      "id": record.get("id"),
      "fields": record.get("fields", {}),
      "createdTime": record.get("createdTime"),
    }
    for record in matches
    if isinstance(record, dict)
  ]

  emit(
    {
      "status": "ok",
      "matches": simplified_matches,
      "meta": {
        "execution_ms": int((time.time() - start_time) * 1000),
        "total_matches": len(simplified_matches),
      },
    }
  )


if __name__ == "__main__":
  main()
