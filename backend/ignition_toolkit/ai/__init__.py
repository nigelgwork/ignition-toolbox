"""
AI Integration Module

Provides AI-powered visual verification using Claude Vision API.
"""

from ignition_toolkit.ai.client import AIClient, VerificationResult
from ignition_toolkit.ai.providers.anthropic import AnthropicProvider

__all__ = [
    "AIClient",
    "VerificationResult",
    "AnthropicProvider",
]
