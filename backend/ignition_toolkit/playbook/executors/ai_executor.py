"""
AI Executor - Step handlers for AI-powered verification

Handles perspective.verify_with_ai step type using Claude Vision API.
"""

import logging
from typing import Any

from ignition_toolkit.ai import AIClient, AnthropicProvider
from ignition_toolkit.browser import BrowserManager
from ignition_toolkit.playbook.exceptions import StepExecutionError
from ignition_toolkit.playbook.executors.base import StepHandler

logger = logging.getLogger(__name__)


class PerspectiveVerifyWithAIHandler(StepHandler):
    """
    Handler for perspective.verify_with_ai step type.

    Uses Claude Vision API to verify UI elements in screenshots.

    Parameters:
        prompt: str - Verification prompt describing what to check
        selector: str (optional) - CSS selector to screenshot specific element
        confidence_threshold: float (optional) - Minimum confidence to pass (default: 0.8)
        ai_api_key: str - Anthropic API key (usually from credential)
        ai_model: str (optional) - Claude model to use

    Example:
        - id: verify_login_form
          type: perspective.verify_with_ai
          parameters:
            prompt: "Verify the login form is visible with username and password fields"
            selector: ".login-form"
            confidence_threshold: 0.85
            ai_api_key: ${credentials.ai.api_key}
    """

    def __init__(self, browser_manager: BrowserManager):
        """
        Initialize handler with browser manager.

        Args:
            browser_manager: Browser manager for screenshot capture
        """
        self.browser_manager = browser_manager

    async def execute(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Execute AI verification step.

        Args:
            params: Step parameters including prompt and optional selector

        Returns:
            Verification result dictionary

        Raises:
            StepExecutionError: If verification fails or API error occurs
        """
        # Extract parameters
        prompt = params.get("prompt")
        if not prompt:
            raise StepExecutionError("ai", "prompt parameter is required")

        api_key = params.get("ai_api_key")
        if not api_key:
            raise StepExecutionError("ai", "ai_api_key parameter is required")

        selector = params.get("selector")
        confidence_threshold = float(params.get("confidence_threshold", 0.8))
        model = params.get("ai_model", "claude-sonnet-4-20250514")

        # Capture screenshot
        try:
            if selector:
                logger.info(f"Capturing screenshot of element: {selector}")
                screenshot_base64 = await self.browser_manager.get_element_screenshot_base64(
                    selector
                )
            else:
                logger.info("Capturing full page screenshot")
                screenshot_base64 = await self.browser_manager.get_screenshot_base64()
        except Exception as e:
            raise StepExecutionError("browser", f"Failed to capture screenshot: {e}")

        # Create AI client and verify
        provider = AnthropicProvider(api_key=api_key, model=model)
        client = AIClient(provider=provider)

        try:
            result = await client.verify_screenshot(
                screenshot_base64=screenshot_base64,
                prompt=prompt,
                confidence_threshold=confidence_threshold,
            )
        finally:
            await provider.close()

        # Check result
        output = {
            "status": result.status.value,
            "passed": result.passed,
            "confidence": result.confidence,
            "threshold": confidence_threshold,
            "explanation": result.explanation,
            "details": result.details,
        }

        if not result.passed:
            # Include more info in error for debugging
            error_msg = f"AI verification failed: {result.explanation} (confidence: {result.confidence:.2f}, threshold: {confidence_threshold:.2f})"
            raise StepExecutionError("ai", error_msg, output)

        logger.info(
            f"AI verification passed with confidence {result.confidence:.2f} (threshold: {confidence_threshold:.2f})"
        )
        return output


class AIAnalyzeHandler(StepHandler):
    """
    Handler for perspective.analyze_with_ai step type.

    Uses Claude Vision API to analyze screenshots with custom prompts.
    Unlike verify_with_ai, this doesn't fail on any specific condition.

    Parameters:
        prompt: str - Analysis prompt
        selector: str (optional) - CSS selector to screenshot specific element
        ai_api_key: str - Anthropic API key
        ai_model: str (optional) - Claude model to use

    Example:
        - id: analyze_dashboard
          type: perspective.analyze_with_ai
          parameters:
            prompt: "Describe all the charts and their current values"
            ai_api_key: ${credentials.ai.api_key}
    """

    def __init__(self, browser_manager: BrowserManager):
        """
        Initialize handler with browser manager.

        Args:
            browser_manager: Browser manager for screenshot capture
        """
        self.browser_manager = browser_manager

    async def execute(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Execute AI analysis step.

        Args:
            params: Step parameters including prompt

        Returns:
            Analysis result dictionary
        """
        prompt = params.get("prompt")
        if not prompt:
            raise StepExecutionError("ai", "prompt parameter is required")

        api_key = params.get("ai_api_key")
        if not api_key:
            raise StepExecutionError("ai", "ai_api_key parameter is required")

        selector = params.get("selector")
        model = params.get("ai_model", "claude-sonnet-4-20250514")

        # Capture screenshot
        try:
            if selector:
                screenshot_base64 = await self.browser_manager.get_element_screenshot_base64(
                    selector
                )
            else:
                screenshot_base64 = await self.browser_manager.get_screenshot_base64()
        except Exception as e:
            raise StepExecutionError("browser", f"Failed to capture screenshot: {e}")

        # Create AI client and analyze
        provider = AnthropicProvider(api_key=api_key, model=model)
        client = AIClient(provider=provider)

        try:
            result = await client.analyze_screenshot(
                screenshot_base64=screenshot_base64,
                prompt=prompt,
            )
        finally:
            await provider.close()

        return result
