"""
Custom exception handlers and error response models.
Provides consistent error handling across the API.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response model."""
    success: bool = False
    error: str
    detail: Optional[str] = None
    status_code: int
    path: Optional[str] = None


class SuccessResponse(BaseModel):
    """Standard success response model."""
    success: bool = True
    message: str
    data: Optional[Any] = None


class APIException(Exception):
    """Base API exception class."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class NotFoundException(APIException):
    """Resource not found exception."""
    def __init__(self, resource: str = "Resource", detail: Optional[str] = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class ConflictException(APIException):
    """Resource conflict exception."""
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class UnauthorizedException(APIException):
    """Unauthorized access exception."""
    def __init__(self, detail: Optional[str] = None):
        super().__init__(
            message="Unauthorized access",
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class ForbiddenException(APIException):
    """Forbidden access exception."""
    def __init__(self, detail: Optional[str] = None):
        super().__init__(
            message="Insufficient permissions",
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class ValidationException(APIException):
    """Data validation exception."""
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handle custom API exceptions."""
    logger.error(
        f"API Error: {exc.message} | Path: {request.url.path} | Detail: {exc.detail}",
        exc_info=True
    )
    
    error_response = ErrorResponse(
        error=exc.message,
        detail=exc.detail,
        status_code=exc.status_code,
        path=str(request.url.path)
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    logger.warning(
        f"Validation Error: {str(exc)} | Path: {request.url.path}",
        exc_info=False
    )
    
    error_response = ErrorResponse(
        error="Validation error",
        detail=str(exc),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        path=str(request.url.path)
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        f"Unexpected Error: {str(exc)} | Path: {request.url.path}",
        exc_info=True
    )
    
    error_response = ErrorResponse(
        error="Internal server error",
        detail="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        path=str(request.url.path)
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump()
    )
