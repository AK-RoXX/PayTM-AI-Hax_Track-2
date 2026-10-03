#README guide for backend setup

## Step 1. Create and activate virtual environment with target python version.

(For this project we will be using python 3.12)

Enter the backend directory

```bash
cd backend
```

Create the virtual environment

(For windows)

```bash
py -3.12 -m venv venv
```

(For MacOS/Linux)

```bash
python3.12 -m venv venv
```

Now activate using the following command

(For windows)

```bash
venv\Scripts\activate
```

(For MacOS/Linux)

```bash
source venv/bin/activate
```

## Step 2. Install the requirements for the backend setup

```bash
pip install -r requirements.txt
```

OR

In case of version mismatch, simply run this command

```bash
pip install -U fastapi uvicorn pydantic supabase pymupdf pgvector sarvamai cognee
```

Then run the following command to lock the actual working environment immediately

```bash
pip freeze > requirements-lock.txt
```

## Document uploads

Set these backend environment variables in `backend/.env` before using case uploads:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SARVAM_API_KEY=
GEMINI_API_KEY=
OCR_PROVIDER_ORDER=sarvam,gemini
GEMINI_STT_MODEL=gemini-3.5-transcribe
```

Apply the Supabase migrations before uploading. The service role key must remain in the backend environment and must never be exposed to the frontend. The first indexed document downloads the configured multilingual FastEmbed model. Searchable PDFs and DOCX files are extracted locally; scanned PDFs and images require at least one configured OCR provider.

OCR providers are tried in `OCR_PROVIDER_ORDER`; currently supported values are `sarvam` and `gemini`. Configure either or both API keys. Gemini Interactions are sent with storage disabled. Provider free-tier quotas are account- and region-dependent and are not guaranteed. OCR provider adapters normalize results to page text; embeddings always come from the same local model so the pgvector dimensions remain consistent.

Claim intake voice input uses the same `SARVAM_API_KEY` and `GEMINI_API_KEY`. The backend selects a provider automatically using `OCR_PROVIDER_ORDER`; users select the spoken language or leave automatic detection on. Recordings are limited to 28 seconds and 10 MB and sent to the authenticated `/api/v1/speech/transcribe` endpoint. The app does not persist audio; Gemini requires a temporary Files API upload, which the backend deletes after transcription. The transcript appears in the editable claim description and is submitted with the claim only when the user continues. Gemini transcription interactions disable storage; configure `GEMINI_STT_MODEL` to override the default.
