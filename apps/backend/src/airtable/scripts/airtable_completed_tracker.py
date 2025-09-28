#!/usr/bin/env python3
"""Airtable completed records tracker script.

Supports two modes:
1. Bootstrap: Fetches all records from the completed view
2. Incremental: Fetches records with "Completed Timestamp" after a given timestamp

Input JSON:
{
  "mode": "bootstrap" | "incremental",
  "view_id": "viwgYjpU6K6nXq8ii",
  "after_timestamp": "2025-09-28T10:00:00Z"  # Only for incremental mode
}

Environment variables:
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- AIRTABLE_TABLE_ID
"""

import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import requests
from datetime import datetime

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


def fetch_all_from_view(
    api_key: str,
    base_id: str,
    table_id: str,
    view_id: str
) -> List[Dict[str, Any]]:
    """Fetch all records from a specific view."""

    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    all_records = []
    offset = None

    while True:
        params = {
            "view": view_id,
            "pageSize": 100,
            "returnFieldsByFieldId": False
        }

        if offset:
            params["offset"] = offset

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            records = data.get("records", [])
            all_records.extend(records)

            # Check if there are more pages
            offset = data.get("offset")
            if not offset:
                break

        except requests.exceptions.RequestException as exc:
            emit_error(
                f"Failed to fetch records from view: {str(exc)}",
                "API_ERROR",
                {"view_id": view_id, "fetched_so_far": len(all_records)}
            )
        except Exception as exc:
            emit_error(
                f"Unexpected error during fetch: {str(exc)}",
                "QUERY_ERROR",
                {"view_id": view_id, "fetched_so_far": len(all_records)}
            )

    return all_records


def fetch_recently_completed(
    api_key: str,
    base_id: str,
    table_id: str,
    view_id: str,
    after_timestamp: str
) -> List[Dict[str, Any]]:
    """Fetch records with Completed Timestamp after the given timestamp."""

    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Build formula to filter by Completed Timestamp
    # Using IS_AFTER to compare timestamps
    formula = f"IS_AFTER({{Completed Timestamp}}, '{after_timestamp}')"

    all_records = []
    offset = None

    while True:
        params = {
            "view": view_id,
            "filterByFormula": formula,
            "pageSize": 100,
            "returnFieldsByFieldId": False
        }

        if offset:
            params["offset"] = offset

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            records = data.get("records", [])
            all_records.extend(records)

            # Check if there are more pages
            offset = data.get("offset")
            if not offset:
                break

        except requests.exceptions.RequestException as exc:
            emit_error(
                f"Failed to fetch recently completed records: {str(exc)}",
                "API_ERROR",
                {"after_timestamp": after_timestamp, "fetched_so_far": len(all_records)}
            )
        except Exception as exc:
            emit_error(
                f"Unexpected error during incremental fetch: {str(exc)}",
                "QUERY_ERROR",
                {"after_timestamp": after_timestamp, "fetched_so_far": len(all_records)}
            )

    return all_records


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


def expand_application_records(
    records: List[Dict[str, Any]],
    api_key: str,
    base_id: str
) -> List[Dict[str, Any]]:
    """Expand Application linked records for all fetched records."""

    applications_table = "tbl5llU1H1vvOJV34"

    for record in records:
        fields = record.get("fields", {})
        app_ids = fields.get("Applications ↗", [])

        if app_ids and isinstance(app_ids, list):
            # Fetch linked Application records
            linked_apps = fetch_linked_records(
                api_key, base_id, applications_table, app_ids
            )

            if linked_apps:
                # Add expanded data to the record
                if "expanded" not in record:
                    record["expanded"] = {}
                record["expanded"]["Applications_expanded"] = linked_apps

    return records


def main() -> None:
    start_time = time.time()

    payload = load_payload()
    mode = payload.get("mode", "").lower()
    view_id = payload.get("view_id", "")
    after_timestamp = payload.get("after_timestamp", "")

    if not mode or mode not in ["bootstrap", "incremental"]:
        emit_error("Invalid mode. Expected 'bootstrap' or 'incremental'", "INPUT_ERROR")

    if not view_id:
        emit_error("view_id is required", "INPUT_ERROR")

    if mode == "incremental" and not after_timestamp:
        emit_error("after_timestamp is required for incremental mode", "INPUT_ERROR")

    api_key = os.getenv("AIRTABLE_API_KEY")
    base_id = os.getenv("AIRTABLE_BASE_ID")
    table_id = os.getenv("AIRTABLE_TABLE_ID")

    if not api_key or not base_id or not table_id:
        emit_error(
            "Airtable credentials not configured. Ensure AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_ID are set.",
            "CONFIGURATION_ERROR",
        )

    # Fetch records based on mode
    if mode == "bootstrap":
        # Fetch all records from the view
        records = fetch_all_from_view(api_key, base_id, table_id, view_id)
    else:  # incremental
        # Fetch records completed after the timestamp
        records = fetch_recently_completed(
            api_key, base_id, table_id, view_id, after_timestamp
        )

    # Skip expansion for bootstrap mode (too slow for 763+ records)
    # Only expand for incremental mode where we have fewer records
    if mode == "incremental":
        records = expand_application_records(records, api_key, base_id)

    # Prepare response
    meta = {
        "execution_ms": int((time.time() - start_time) * 1000),
        "mode": mode,
        "total_records": len(records),
        "view_id": view_id,
    }

    if mode == "incremental":
        meta["after_timestamp"] = after_timestamp
        # Include the newest Completed Timestamp if we have records
        if records:
            completed_timestamps = []
            for record in records:
                ct = record.get("fields", {}).get("Completed Timestamp")
                if ct:
                    completed_timestamps.append(ct)
            if completed_timestamps:
                # Sort and get the newest
                completed_timestamps.sort()
                meta["newest_completed_timestamp"] = completed_timestamps[-1]

    emit({
        "status": "ok",
        "matches": records,  # Using "matches" for compatibility
        "meta": meta,
    })


if __name__ == "__main__":
    main()