"""
Configuration management for SSMS backend using Pydantic Settings.
Validates environment variables and provides type-safe configuration access.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Security Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 7
    
    # CORS Configuration
    cors_origins: str = "*"
    
    # Application Configuration
    app_name: str = "School Scheduling Management System"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(',')]


# Global settings instance
settings = Settings()
