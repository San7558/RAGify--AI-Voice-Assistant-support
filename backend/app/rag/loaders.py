import os
import tempfile
from io import BytesIO
import fitz  # pymupdf
from langchain_core.documents import Document
from langchain_community.document_loaders import Docx2txtLoader, TextLoader
from typing import List


def load_document(file_bytes: bytes, file_name: str, file_type: str) -> List[Document]:
    """Load a document from uploaded bytes.

    Supported types:
    - pdf (via PyMuPDF / fitz)
    - docx (via Docx2txtLoader)
    - txt (via TextLoader)

    Returns a list of LangChain ``Document`` objects with ``metadata`` containing
    the original ``source`` filename and, for PDFs, a ``page`` number.
    """

    file_type_lc = file_type.lower()

    # ---------- PDF handling (in-memory) ----------
    if file_type_lc == "pdf":
        pdf_bytes = BytesIO(file_bytes)
        doc = fitz.open(stream=pdf_bytes.read(), filetype="pdf")
        docs: List[Document] = []
        for page_number in range(1, doc.page_count + 1):
            page = doc.load_page(page_number - 1)
            text = page.get_text("text") or ""
            if text.strip():
                docs.append(
                    Document(
                        page_content=text,
                        metadata={"source": file_name, "page": page_number},
                    )
                )
        if not docs:
            raise ValueError(
                "No extractable text found. This appears to be an image-based/scanned PDF."
            )
        return docs

    # ---------- DOCX / TXT handling (needs temporary file) ----------
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type_lc}") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if file_type_lc == "docx":
            loader = Docx2txtLoader(tmp_path)
        elif file_type_lc == "txt":
            loader = TextLoader(tmp_path, encoding="utf-8")
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        docs = loader.load()
        for doc in docs:
            doc.metadata["source"] = file_name
            doc.metadata.pop("file_path", None)
        return docs
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
