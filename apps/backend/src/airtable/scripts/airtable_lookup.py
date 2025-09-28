#!/usr/bin/env python3
"""Utility script invoked from the NestJS backend to execute Airtable lookups.

The script reads a JSON payload from STDIN with the following structure:
{
  "field": "email" | "orderId" | "phone",
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
  if key in {"phone"}:
    return "Phone"
  emit_error(
    "Unsupported lookup field. Expected 'email', 'orderId', or 'phone'.",
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


def get_israeli_phone_variant(phone: str) -> Optional[str]:
  """
  For Israeli phone numbers starting with 972, return the variant with/without zero.
  If phone is 9720XXX, returns 972XXX (without the zero)
  If phone is 972XXX (where X is not 0), returns 9720XXX (with the zero)
  Returns None if not an Israeli number or no variant needed.
  """
  if not phone.startswith("972") or len(phone) < 4:
    return None

  # Check if there's a 0 after 972
  if phone[3] == "0":
    # Has zero, return without it (9720507... -> 972507...)
    return phone[:3] + phone[4:]
  else:
    # No zero, add it (972507... -> 9720507...)
    return phone[:3] + "0" + phone[3:]


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

  # Helper function to perform the actual search
  def perform_search(search_value: str):
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
        lowered_value = search_value.lower()
        formula = f"LOWER({{{field_name}}}) = '{sanitize_formula_value(lowered_value)}'"

        try:
          return table.all(
            view=view_id or None,
            formula=formula,
            max_records=3
          )
        except TypeError:
          return table.all(
            view=view_id or None,
            formula=formula
          )
      else:
        # Use REST API directly
        return query_airtable_with_expansion(
          api_key, base_id, table_id, field_name, search_value, view_id
        )
    except Exception as exc:
      emit_error(
        "Airtable query failed",
        "QUERY_ERROR",
        {"reason": str(exc)},
      )
      return []

  # Perform initial search
  matches = perform_search(value)
  used_phone_variant = False
  variant_used = None

  # If phone search with no results and starts with 972, try the variant
  if len(matches) == 0 and field == "phone":
    variant = get_israeli_phone_variant(value)
    if variant:
      # Try search with the phone variant
      matches = perform_search(variant)
      if len(matches) > 0:
        used_phone_variant = True
        variant_used = variant

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

  meta = {
    "execution_ms": int((time.time() - start_time) * 1000),
    "total_matches": len(simplified_matches),
    "expanded": len(matches) == 1
  }

  # Include phone variant info if used
  if used_phone_variant:
    meta["used_phone_variant"] = True
    meta["variant_used"] = variant_used

  emit(
    {
      "status": "ok",
      "matches": simplified_matches,
      "meta": meta,
    }
  )


if __name__ == "__main__":
  main()