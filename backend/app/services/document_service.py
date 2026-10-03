from pathlib import Path
from io import BytesIO
from zipfile import BadZipFile, ZipFile
import re

MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
SUPPORTED_DOCUMENT_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_document(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()
    content_type = SUPPORTED_DOCUMENT_TYPES.get(extension)
    if content_type is None:
        raise ValueError("Unsupported file type. Use PDF, JPG, PNG, WEBP, or DOCX.")
    if not content:
        raise ValueError("The uploaded file is empty.")
    if len(content) > MAX_DOCUMENT_BYTES:
        raise ValueError("Each file must be 20 MB or smaller.")

    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise ValueError("The file does not contain a valid PDF signature.")
    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise ValueError("The file does not contain a valid JPEG signature.")
    if extension == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("The file does not contain a valid PNG signature.")
    if extension == ".webp" and (content[:4] != b"RIFF" or content[8:12] != b"WEBP"):
        raise ValueError("The file does not contain a valid WEBP signature.")
    if extension == ".docx":
        try:
            with ZipFile(BytesIO(content)) as archive:
                if "word/document.xml" not in archive.namelist():
                    raise ValueError("The file is not a valid DOCX document.")
        except BadZipFile as error:
            raise ValueError("The file is not a valid DOCX document.") from error

    return content_type


def split_pages_into_chunks(pages: list[dict], max_chars: int = 1200, overlap: int = 160) -> list[dict]:
    if max_chars <= 0 or overlap < 0 or overlap >= max_chars:
        raise ValueError("Chunk size must be positive and larger than its overlap.")

    chunks = []
    for page in pages:
        page_number = page.get("page_number")
        text = re.sub(r"\s+", " ", page["text"]).strip()
        start = 0
        while start < len(text):
            end = min(start + max_chars, len(text))
            if end < len(text):
                boundary = text.rfind(" ", start, end)
                if boundary > start:
                    end = boundary
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({"page_number": page_number, "text": chunk_text})
            if end >= len(text):
                break
            start = max(end - overlap, start + 1)
    return chunks

DOCUMENT_TYPE_HINTS: tuple[tuple[str, str], ...] = (
    ("health_policy", r"policy\s*(?:no\.?|number|id)|sum\s+insured|room\s*rent|policy\s+period|pre[\s\-]?existing"),
    ("discharge_summary", r"discharge\s+summary|final\s+diagnosis|doctor(?:'s)?\s+signature|date\s+of\s+discharge|discharge\s+advice"),
    ("hospital_estimate", r"estimated\s+total|total\s+bill|total\s+payable|final\s+bill|net\s+payable|estimate\s+amount|hospital\s+estimate"),
    ("admission_record", r"date\s+of\s+admission|admission\s+date|admitted\s+on|ip\s+number|ipd\s+number"),
    ("identity_proof", r"aadhaar|identity\s+(?:document|proof)|\bpan\b|passport|driving\s+licen[cs]e"),
)


def classify_document(filename: str) -> str:
    name = filename.lower()
    if "policy" in name: return "health_policy"
    if "discharge" in name: return "discharge_summary"
    if "admission" in name: return "admission_record"
    if "bill" in name or "estimate" in name: return "hospital_estimate"
    if "id" in name or "aadhaar" in name or "pan" in name: return "identity_proof"
    return "unknown"


def classify_document_from_text(pages: list[dict]) -> str:
    """Identify a document from its own contents.

    Filenames are unreliable — users upload "scan1.pdf" and "final (2).pdf" —
    and the document type decides which claim facts we try to read, so we fall
    back to the page text and let the strongest set of label matches win.
    """
    text = " ".join((page.get("text") or "") for page in pages).lower()
    if not text.strip():
        return "unknown"
    best_type, best_score = "unknown", 0
    for document_type, pattern in DOCUMENT_TYPE_HINTS:
        score = len(set(re.findall(pattern, text)))
        if score > best_score:
            best_type, best_score = document_type, score
    return best_type if best_score else "unknown"


def extract_demo_facts(document_type: str) -> dict:
    return {"health_policy":{"sum_insured":500000,"room_rent_limit_per_day":5000},"hospital_estimate":{"estimated_total_amount":300000,"hospital_name":"DemoCare Hospital"},"discharge_summary":{"doctor_signature_present":False}}.get(document_type,{})
