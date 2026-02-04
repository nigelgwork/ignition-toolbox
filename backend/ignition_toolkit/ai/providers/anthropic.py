"""
Anthropic Provider - Claude Vision API integration

Uses Claude's vision capabilities for screenshot verification and analysis.
"""

import json
import logging
import re
from typing import Any

import httpx

from ignition_toolkit.ai.client import AIProvider, VerificationResult, VerificationStatus

logger = logging.getLogger(__name__)

# Claude API configuration
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 1024


class AnthropicProvider(AIProvider):
    """
    Anthropic Claude Vision provider for AI-powered verification.

    Uses Claude's vision capabilities to analyze screenshots and verify
    UI elements, text, layout, and other visual aspects.

    Example:
        provider = AnthropicProvider(api_key="sk-ant-...")
        result = await provider.verify_screenshot(
            screenshot_base64="...",
            prompt="Verify the login button is visible and enabled"
        )
    """

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        timeout: float = 60.0,
    ):
        """
        Initialize Anthropic provider.

        Args:
            api_key: Anthropic API key
            model: Claude model to use (default: claude-sonnet-4-20250514)
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def verify_screenshot(
        self,
        screenshot_base64: str,
        prompt: str,
        confidence_threshold: float = 0.8,
    ) -> VerificationResult:
        """
        Verify a screenshot against a prompt using Claude Vision.

        Args:
            screenshot_base64: Base64-encoded screenshot image
            prompt: Verification prompt describing what to check
            confidence_threshold: Minimum confidence to pass (0.0-1.0)

        Returns:
            VerificationResult with status, confidence, and explanation
        """
        # Build verification prompt
        system_prompt = """You are a visual verification assistant for UI testing.
Your task is to analyze screenshots and verify if specific conditions are met.

IMPORTANT: You must respond ONLY with a JSON object in the following format:
{
  "verified": true or false,
  "confidence": 0.0 to 1.0 (how confident you are in your assessment),
  "explanation": "Brief explanation of what you observed",
  "details": {
    "elements_found": ["list of relevant UI elements found"],
    "issues": ["any issues or concerns noted"]
  }
}

Be thorough but concise. Focus on the specific verification requested."""

        user_prompt = f"""Please verify the following condition in this screenshot:

{prompt}

Respond with JSON only."""

        try:
            client = await self._get_client()

            # Determine image media type from base64 header or default to PNG
            media_type = "image/png"
            if screenshot_base64.startswith("/9j/"):
                media_type = "image/jpeg"
            elif screenshot_base64.startswith("iVBOR"):
                media_type = "image/png"

            response = await client.post(
                ANTHROPIC_API_URL,
                json={
                    "model": self.model,
                    "max_tokens": MAX_TOKENS,
                    "system": system_prompt,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": screenshot_base64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": user_prompt,
                                },
                            ],
                        }
                    ],
                },
            )

            response.raise_for_status()
            data = response.json()

            # Extract text content from response
            raw_response = ""
            for content in data.get("content", []):
                if content.get("type") == "text":
                    raw_response = content.get("text", "")
                    break

            # Parse JSON response
            result_data = self._parse_json_response(raw_response)

            verified = result_data.get("verified", False)
            confidence = float(result_data.get("confidence", 0.0))
            explanation = result_data.get("explanation", "No explanation provided")
            details = result_data.get("details", {})

            # Determine status based on verification and confidence
            if verified and confidence >= confidence_threshold:
                status = VerificationStatus.PASSED
                passed = True
            elif verified and confidence < confidence_threshold:
                status = VerificationStatus.UNCERTAIN
                passed = False
            else:
                status = VerificationStatus.FAILED
                passed = False

            return VerificationResult(
                status=status,
                confidence=confidence,
                passed=passed,
                explanation=explanation,
                details=details,
                raw_response=raw_response,
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Anthropic API error: {e.response.status_code} - {e.response.text}")
            return VerificationResult(
                status=VerificationStatus.ERROR,
                confidence=0.0,
                passed=False,
                explanation=f"API error: {e.response.status_code}",
                details={"error": str(e)},
            )
        except Exception as e:
            logger.error(f"Verification error: {e}")
            return VerificationResult(
                status=VerificationStatus.ERROR,
                confidence=0.0,
                passed=False,
                explanation=f"Verification failed: {str(e)}",
                details={"error": str(e)},
            )

    async def analyze_screenshot(
        self,
        screenshot_base64: str,
        prompt: str,
    ) -> dict[str, Any]:
        """
        Analyze a screenshot with a custom prompt.

        Args:
            screenshot_base64: Base64-encoded screenshot image
            prompt: Analysis prompt

        Returns:
            Dictionary with analysis results
        """
        try:
            client = await self._get_client()

            # Determine image media type
            media_type = "image/png"
            if screenshot_base64.startswith("/9j/"):
                media_type = "image/jpeg"

            response = await client.post(
                ANTHROPIC_API_URL,
                json={
                    "model": self.model,
                    "max_tokens": MAX_TOKENS,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": screenshot_base64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": prompt,
                                },
                            ],
                        }
                    ],
                },
            )

            response.raise_for_status()
            data = response.json()

            # Extract text content
            analysis = ""
            for content in data.get("content", []):
                if content.get("type") == "text":
                    analysis = content.get("text", "")
                    break

            return {
                "success": True,
                "analysis": analysis,
                "model": self.model,
                "usage": data.get("usage", {}),
            }

        except Exception as e:
            logger.error(f"Analysis error: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def _parse_json_response(self, response: str) -> dict[str, Any]:
        """
        Parse JSON from Claude's response, handling markdown code blocks.

        Args:
            response: Raw response text from Claude

        Returns:
            Parsed JSON dictionary
        """
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to parse the entire response as JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object in the response
        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        # Return a default failed result if parsing fails
        logger.warning(f"Failed to parse JSON response: {response[:200]}")
        return {
            "verified": False,
            "confidence": 0.0,
            "explanation": "Failed to parse AI response",
            "details": {"raw_response": response},
        }
