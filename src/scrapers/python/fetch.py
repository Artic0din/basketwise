#!/usr/bin/env python3
"""
BasketWise HTTP fetch proxy.

Bypasses PerimeterX/Incapsula bot detection by using Python's urllib
instead of Node.js fetch. Called as a subprocess by the Node.js scrapers.

Usage:
    python3 fetch.py --store woolworths --query "milk"
    python3 fetch.py --store coles --query "bread"

Output: JSON array of products to stdout.
Errors: {"error": "message"} to stdout, details to stderr. Always exits 0.

Dependencies: Python 3 stdlib only (no pip packages).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

TIMEOUT_SECONDS = 15


def fetch_woolworths(query: str) -> list[dict[str, object]]:
    """Search Woolworths using the public GET search API."""
    base_url = "https://www.woolworths.com.au/apis/ui/Search/products"
    params = urllib.parse.urlencode({"searchTerm": query})
    url = f"{base_url}?{params}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "en-AU,en;q=0.9",
        },
    )

    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    products: list[dict[str, object]] = []
    groups = data.get("Products", [])
    for group in groups:
        items = group.get("Products", [])
        for item in items:
            name = item.get("Name")
            if not name:
                continue
            products.append({
                "Name": name,
                "DisplayName": item.get("DisplayName"),
                "Brand": item.get("Brand"),
                "Description": item.get("Description"),
                "Price": item.get("Price"),
                "WasPrice": item.get("WasPrice"),
                "SavingsAmount": item.get("SavingsAmount"),
                "CupPrice": item.get("CupPrice"),
                "CupMeasure": item.get("CupMeasure"),
                "CupString": item.get("CupString"),
                "PackageSize": item.get("PackageSize"),
                "Unit": item.get("Unit"),
                "IsOnSpecial": item.get("IsOnSpecial", False),
                "IsHalfPrice": item.get("IsHalfPrice", False),
                "IsNew": item.get("IsNew", False),
                "HasMultiBuyDiscount": item.get("HasMultiBuyDiscount", False),
                "Stockcode": item.get("Stockcode"),
                "MediumImageFile": item.get("MediumImageFile"),
            })

    return products


def fetch_coles(query: str) -> list[dict[str, object]]:
    """Search Coles using the shop.coles.com.au search API."""
    encoded_query = urllib.parse.quote(query, safe="")
    base_url = (
        "https://shop.coles.com.au/search/resources/store/20601"
        f"/productview/bySearchTerm/{encoded_query}"
    )
    params = urllib.parse.urlencode({
        "orderBy": "0",
        "pageNumber": "1",
        "pageSize": "48",
    })
    url = f"{base_url}?{params}"

    headers: dict[str, str] = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "en-AU,en;q=0.9",
    }

    api_key = os.environ.get("COLES_API_KEY")
    if api_key:
        headers["Ocp-Apim-Subscription-Key"] = api_key

    req = urllib.request.Request(url, headers=headers)

    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        raw = resp.read().decode("utf-8")

    # Detect HTML bot-detection pages
    if raw.lstrip().startswith(("<!DOCTYPE", "<html")):
        raise RuntimeError("Received HTML instead of JSON (bot detection)")

    data = json.loads(raw)

    products: list[dict[str, object]] = []
    for entry in data.get("catalogEntryView", []):
        p1 = entry.get("p1", {})
        # Build image URL from the "t" (thumbnail) field
        raw_thumb: str = entry.get("t", "") or ""
        image_url: str | None = None
        if raw_thumb:
            if raw_thumb.startswith("/"):
                image_url = f"https://shop.coles.com.au{raw_thumb}"
            else:
                image_url = raw_thumb

        # Extract package size from a.O3 array
        a_field = entry.get("a", {})
        o3_value: str | None = None
        if isinstance(a_field, dict):
            o3_raw = a_field.get("O3")
            if isinstance(o3_raw, list) and len(o3_raw) > 0:
                o3_value = str(o3_raw[0])
            elif isinstance(o3_raw, str):
                o3_value = o3_raw

        products.append({
            "n": entry.get("n", ""),
            "m": entry.get("m", ""),
            "p1_o": p1.get("o"),
            "p1_l4": p1.get("l4"),
            "u2": entry.get("u2"),
            "p": entry.get("p"),
            "s": entry.get("s"),
            "packageSize": o3_value,
            "image": image_url,
        })

    return products


def main() -> None:
    parser = argparse.ArgumentParser(description="BasketWise HTTP fetch proxy")
    parser.add_argument(
        "--store",
        required=True,
        choices=["coles", "woolworths"],
        help="Store to search",
    )
    parser.add_argument(
        "--query",
        required=True,
        help="Search term",
    )
    args = parser.parse_args()

    try:
        if args.store == "woolworths":
            results = fetch_woolworths(args.query)
        else:
            results = fetch_coles(args.query)

        json.dump(results, sys.stdout, separators=(",", ":"))
        sys.stdout.write("\n")

    except Exception as exc:
        print(str(exc), file=sys.stderr)
        json.dump({"error": str(exc)}, sys.stdout, separators=(",", ":"))
        sys.stdout.write("\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
