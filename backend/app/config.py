from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Paytm Sahaayak"
    frontend_url: str = "http://localhost:3000"
    n8n_webhook_url: str = ""
    n8n_callback_secret: str = "change-me"
    demo_mode: bool = True
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    sarvam_api_key: str = ""
    gemini_api_key: str = ""
    gemini_ocr_model: str = "gemini-1.5-flash"
    ocr_provider_order: str = "sarvam,gemini"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    sarvam_job_timeout_seconds: int = 180
    cognee_url: str = ""
    cognee_api_key: str = ""
    cognee_tenant_id: str = ""
    cognee_timeout_seconds: int = 10
    use_intent_router: bool = True
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
