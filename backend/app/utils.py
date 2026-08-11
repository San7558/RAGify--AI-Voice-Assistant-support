def is_website_document(doc: dict) -> bool:
    """Return True if *doc* represents a website source.

    Checks several possible fields and falls back to ``website_url``.
    """
    source_type = str(
        doc.get("source_type")
        or doc.get("content_type")
        or doc.get("document_type")
        or ""
    ).lower()
    return source_type == "website" or bool(doc.get("website_url"))
