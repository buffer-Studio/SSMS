"""
Logging configuration for SSMS backend.
Sets up structured logging with appropriate formatters and handlers.
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logging(
    log_level: str = "INFO",
    log_file: bool = True,
    log_dir: str = "logs"
) -> None:
    """
    Configure application logging.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Whether to log to file
        log_dir: Directory for log files
    """
    
    # Create logs directory if logging to file
    if log_file:
        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    
    # File handler (rotating)
    if log_file:
        today = datetime.now().strftime('%Y-%m-%d')
        file_handler = RotatingFileHandler(
            filename=f"{log_dir}/ssms_{today}.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
        root_logger.addHandler(file_handler)
    
    # Suppress noisy loggers
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    
    root_logger.info(f"Logging initialized at {log_level} level")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
