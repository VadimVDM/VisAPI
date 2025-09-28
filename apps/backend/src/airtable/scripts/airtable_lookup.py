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
import requests
from typing import Any, Dict, List, Optional, Union

ResponsePayload = Dict[str, Any]


def emit(payload: ResponsePayload) -> None:
  sys.stdout.write(json.dumps(payload))
  sys.exit(0)


def emit_error(message: str, code: str, details: Optional[Any] = None) -> None:
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


def query_airtable_with_expansion(
  api_key: str,
  base_id: str,
  table_id: str,
  field_name: str,
  value: str,
  view_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
  """Query Airtable using the REST API directly to support linked record expansion."""

  url = f"https://api.airtable.com/v0/{base_id}/{table_id}"

  headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
  }

  lowered_value = value.lower()
  formula = f"LOWER({{{field_name}}}) = '{sanitize_formula_value(lowered_value)}'"

  params = {
    "filterByFormula": formula,
    "maxRecords": 3,
    "returnFieldsByFieldId": False
  }

  if view_id:
    params["view"] = view_id

  try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    return data.get("records", [])
  except requests.exceptions.RequestException as exc:
    emit_error(
      "Failed to query Airtable API",
      "API_ERROR",
      {"reason": str(exc)}
    )
  except Exception as exc:
    emit_error(
      "Unexpected error during Airtable query",
      "QUERY_ERROR",
      {"reason": str(exc)}
    )

  return []


def fetch_linked_records(
  api_key: str,
  base_id: str,
  linked_table_name: str,
  record_ids: List[str]
) -> List[Dict[str, Any]]:
  """Fetch linked records from another table."""
  if not record_ids or not linked_table_name:
    return []

  # Build URL for the linked table
  url = f"https://api.airtable.com/v0/{base_id}/{linked_table_name}"

  headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
  }

  # Build filter to get multiple records by ID
  id_conditions = [f"RECORD_ID() = '{rid}'" for rid in record_ids[:10]]  # Limit to 10
  formula = f"OR({','.join(id_conditions)})" if len(id_conditions) > 1 else id_conditions[0]

  params = {
    "filterByFormula": formula,
    "maxRecords": 10,
    "returnFieldsByFieldId": False
  }

  try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    return data.get("records", [])
  except:
    # Return empty list if fetch fails - don't break main query
    return []


def main() -> None:
  start_time = time.time()

  payload = load_payload()
  field = str(payload.get("field", ""))
  # Support both "value" and "key" for the lookup value
  value = str(payload.get("value") or payload.get("key", "")).strip()

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

  field_name = normalise_field(field)

  try:
    # Check if we have pyairtable available
    use_pyairtable = True
    try:
      from pyairtable import Table  # type: ignore
    except ImportError:
      # Fall back to REST API
      use_pyairtable = False

    if use_pyairtable:
      # Use pyairtable for the query
      table = Table(api_key, base_id, table_id)
      lowered_value = value.lower()
      formula = f"LOWER({{{field_name}}}) = '{sanitize_formula_value(lowered_value)}'"

      try:
        matches = table.all(
          view=view_id or None,
          formula=formula,
          max_records=3
        )
      except TypeError:
        matches = table.all(
          view=view_id or None,
          formula=formula
        )
    else:
      # Use REST API directly
      matches = query_airtable_with_expansion(
        api_key, base_id, table_id, field_name, value, view_id
      )

  except Exception as exc:
    emit_error(
      "Airtable query failed",
      "QUERY_ERROR",
      {"reason": str(exc)},
    )

  # Table IDs for linked record expansion
  # Note: Applicants data is already included in Applications, so we skip it
  LINKED_TABLES = {
    "Applications ↗": "tbl5llU1H1vvOJV34",
    "Transactions ↗": "tblremNCbcR0kUIDF"
  }

  simplified_matches = []
  for record in matches:
    if isinstance(record, dict):
      simplified = {
        "id": record.get("id"),
        "fields": record.get("fields", {}),
        "createdTime": record.get("createdTime"),
      }

      # If single match, expand linked records
      if len(matches) == 1:
        expanded = {}
        fields = record.get("fields", {})

        for field_name, table_id in LINKED_TABLES.items():
          if field_name in fields:
            record_ids = fields.get(field_name, [])
            if record_ids and isinstance(record_ids, list):
              linked_records = fetch_linked_records(
                api_key, base_id, table_id, record_ids
              )
              if linked_records:
                # Add expanded records with cleaner field name
                clean_name = field_name.replace(" ↗", "_expanded")
                expanded[clean_name] = linked_records

        if expanded:
          simplified["expanded"] = expanded

      simplified_matches.append(simplified)

  emit(
    {
      "status": "ok",
      "matches": simplified_matches,
      "meta": {
        "execution_ms": int((time.time() - start_time) * 1000),
        "total_matches": len(simplified_matches),
        "expanded": len(matches) == 1
      },
    }
  )


if __name__ == "__main__":
  main()