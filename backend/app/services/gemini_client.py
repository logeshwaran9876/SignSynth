"""
Gemini API client for text-to-pose generation.
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
import google.generativeai as genai
import structlog
from datetime import datetime

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class GeminiClient:
    """Client for interacting with Google's Gemini API for pose generation."""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.GEMINI_API_KEY
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        # Prefer configured model; default to a supported model name
        configured = getattr(self.settings, 'GEMINI_MODEL', 'gemini-1.5-flash-latest')
        # Normalize: remove any accidental 'models/' prefix from older docs
        self.model_name = configured.replace('models/', '')
        # Create model lazily so we can fallback if needed
        self.model = genai.GenerativeModel(self.model_name)
        
        # Pose generation prompt template
        self.pose_prompt_template = """
You are a Sign Language Pose Generator. Your task is to convert English text into detailed sign language poses and animations.

INPUT: Plain English text
OUTPUT: JSON using the following schema:
{{
    "phrases": [
        {{
            "start": float,  // Start time in seconds
            "end": float,    // End time in seconds
            "gloss": [string], // Sign language glosses
            "hands": {{
                "left": [{{"x": float, "y": float, "z": float}}],  // Left hand keypoints
                "right": [{{"x": float, "y": float, "z": float}}]  // Right hand keypoints
            }},
            "joints": {{
                "head": {{"x": float, "y": float, "z": float}},
                "neck": {{"x": float, "y": float, "z": float}},
                "shoulder_left": {{"x": float, "y": float, "z": float}},
                "shoulder_right": {{"x": float, "y": float, "z": float}},
                "elbow_left": {{"x": float, "y": float, "z": float}},
                "elbow_right": {{"x": float, "y": float, "z": float}},
                "wrist_left": {{"x": float, "y": float, "z": float}},
                "wrist_right": {{"x": float, "y": float, "z": float}},
                "hip_left": {{"x": float, "y": float, "z": float}},
                "hip_right": {{"x": float, "y": float, "z": float}},
                "knee_left": {{"x": float, "y": float, "z": float}},
                "knee_right": {{"x": float, "y": float, "z": float}},
                "ankle_left": {{"x": float, "y": float, "z": float}},
                "ankle_right": {{"x": float, "y": float, "z": float}}
            }},
            "facial": {{
                "brow_raise": float,    // 0.0 to 1.0
                "mouth_open": float,    // 0.0 to 1.0
                "eye_blink": float,     // 0.0 to 1.0
                "smile": float,         // 0.0 to 1.0
                "frown": float          // 0.0 to 1.0
            }},
            "confidence": float  // 0.0 to 1.0
        }}
    ],
    "fps": 30,
    "duration": float,  // Total duration in seconds
    "metadata": {{
        "sign_language": string,
        "speed": string,
        "complexity": string
    }}
}}

IMPORTANT RULES:
1. Only output valid JSON. No explanations or additional text.
2. Provide realistic 3D coordinates for all keypoints.
3. Ensure smooth transitions between poses.
4. Include appropriate facial expressions for each sign.
5. Maintain proper sign language grammar and timing.
6. Provide confidence scores based on sign complexity.
7. Use standard sign language glosses.
8. Ensure all poses are physically possible and natural.

Text: "{text}"
Sign Language: {sign_language}
Speed: {speed}
Avatar Scale: 0.9
Motion Style: natural
"""
    
    async def generate_pose_data(
        self,
        text: str,
        sign_language: str = "ASL",
        speed: str = "normal",
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Generate pose data from text using Gemini API.
        
        Args:
            text: Input text to convert
            sign_language: Target sign language (ASL, BSL, ISL)
            speed: Signing speed (slow, normal, fast)
            max_retries: Maximum number of retry attempts
            
        Returns:
            Dictionary containing pose data
        """
        logger.info(
            "Generating pose data",
            text_length=len(text),
            sign_language=sign_language,
            speed=speed
        )
        
        # Format the prompt
        prompt = self.pose_prompt_template.format(
            text=text,
            sign_language=sign_language,
            speed=speed
        )
        
        for attempt in range(max_retries):
            try:
                # Generate response from Gemini
                response = await self._generate_with_retry(prompt)
                
                # Parse JSON response
                pose_data = self._parse_pose_response(response)
                
                # Validate pose data
                self._validate_pose_data(pose_data)
                
                logger.info(
                    "Pose data generated successfully",
                    duration=pose_data.get("duration", 0),
                    phrase_count=len(pose_data.get("phrases", []))
                )
                
                return pose_data
                
            except Exception as e:
                logger.warning(
                    "Pose generation attempt failed",
                    attempt=attempt + 1,
                    error=str(e)
                )
                
                if attempt == max_retries - 1:
                    logger.error("All pose generation attempts failed")
                    raise
                
                # Wait before retry
                await asyncio.sleep(2 ** attempt)
    
    async def _generate_with_retry(self, prompt: str) -> str:
        """Generate response from Gemini with retry logic."""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            
            if not response.text:
                raise ValueError("Empty response from Gemini")
            
            return response.text
            
        except Exception as e:
            # On 404 / unsupported method, try a fallback model (normalized names)
            fallback_models = [
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
            ]
            for fallback in fallback_models:
                if fallback == self.model_name:
                    continue
                try:
                    logger.warning("Retrying with fallback Gemini model", model=fallback, error=str(e))
                    loop = asyncio.get_event_loop()
                    fallback_model = genai.GenerativeModel(fallback.replace('models/', ''))
                    response = await loop.run_in_executor(
                        None,
                        lambda: fallback_model.generate_content(prompt)
                    )
                    if not response.text:
                        raise ValueError("Empty response from Gemini (fallback)")
                    # Cache the working model
                    self.model = fallback_model
                    self.model_name = fallback
                    return response.text
                except Exception as inner:
                    logger.error("Fallback Gemini model failed", model=fallback, error=str(inner))
                    continue

            # Last resort: discover available models from API and pick one that supports generateContent
            try:
                logger.warning("Attempting dynamic model discovery via list_models")
                loop = asyncio.get_event_loop()
                models = await loop.run_in_executor(None, lambda: list(genai.list_models()))
                # Prefer 1.5 flash/pro latest variants that support generateContent
                preferred_order = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                ]
                name_to_model = {m.name.replace('models/', ''): m for m in models}
                selected_name = None
                for candidate in preferred_order:
                    m = name_to_model.get(candidate)
                    if m and hasattr(m, 'supported_generation_methods') and ('generateContent' in m.supported_generation_methods or 'generate_content' in m.supported_generation_methods):
                        selected_name = candidate
                        break
                # If none of preferred matched, pick first supporting generateContent
                if not selected_name:
                    for m in models:
                        methods = getattr(m, 'supported_generation_methods', [])
                        if 'generateContent' in methods or 'generate_content' in methods:
                            selected_name = m.name.replace('models/', '')
                            break
                if selected_name:
                    discovered_model = genai.GenerativeModel(selected_name)
                    response = await loop.run_in_executor(None, lambda: discovered_model.generate_content(prompt))
                    if not response.text:
                        raise ValueError("Empty response from Gemini (discovered)")
                    self.model = discovered_model
                    self.model_name = selected_name
                    logger.info("Using discovered Gemini model", model=selected_name)
                    return response.text
            except Exception as discover_err:
                logger.error("Dynamic model discovery failed", error=str(discover_err))
            logger.error("Gemini API call failed", error=str(e))
            raise
    
    def _parse_pose_response(self, response: str) -> Dict[str, Any]:
        """Parse and clean the JSON response from Gemini."""
        try:
            # Clean the response text
            cleaned_response = self._clean_json_response(response)
            
            # Parse JSON
            pose_data = json.loads(cleaned_response)
            
            return pose_data
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON response", error=str(e), response=response[:500])
            raise ValueError(f"Invalid JSON response: {str(e)}")
    
    def _clean_json_response(self, response: str) -> str:
        """Clean and extract JSON from Gemini response."""
        # Remove markdown code blocks if present
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end != -1:
                response = response[start:end]
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end != -1:
                response = response[start:end]
        
        # Remove any leading/trailing whitespace
        response = response.strip()
        
        return response
    
    def _validate_pose_data(self, pose_data: Dict[str, Any]) -> None:
        """Validate the structure and content of pose data."""
        required_keys = ["phrases", "fps", "duration", "metadata"]
        
        for key in required_keys:
            if key not in pose_data:
                raise ValueError(f"Missing required key: {key}")
        
        # Validate phrases
        phrases = pose_data["phrases"]
        if not isinstance(phrases, list) or len(phrases) == 0:
            raise ValueError("Phrases must be a non-empty list")
        
        for i, phrase in enumerate(phrases):
            self._validate_phrase(phrase, i)
        
        # Validate metadata
        metadata = pose_data["metadata"]
        if not isinstance(metadata, dict):
            raise ValueError("Metadata must be a dictionary")
    
    def _validate_phrase(self, phrase: Dict[str, Any], index: int) -> None:
        """Validate a single phrase in the pose data."""
        required_keys = ["start", "end", "hands", "joints", "facial", "confidence"]
        
        for key in required_keys:
            if key not in phrase:
                raise ValueError(f"Phrase {index} missing required key: {key}")
        
        # Validate hands structure
        hands = phrase["hands"]
        if "left" not in hands or "right" not in hands:
            raise ValueError(f"Phrase {index} hands must have left and right keys")
        
        # Validate joints structure
        joints = phrase["joints"]
        required_joints = [
            "head", "neck", "shoulder_left", "shoulder_right",
            "elbow_left", "elbow_right", "wrist_left", "wrist_right",
            "hip_left", "hip_right", "knee_left", "knee_right",
            "ankle_left", "ankle_right"
        ]
        
        for joint in required_joints:
            if joint not in joints:
                raise ValueError(f"Phrase {index} missing joint: {joint}")
    
    async def generate_pose_variations(
        self,
        text: str,
        sign_language: str = "ASL",
        variations: int = 3
    ) -> List[Dict[str, Any]]:
        """Generate multiple pose variations for the same text."""
        tasks = []
        
        for i in range(variations):
            # Add slight variations to the prompt
            variation_prompt = self.pose_prompt_template.format(
                text=text,
                sign_language=sign_language,
                speed="normal"
            ) + f"\n\nVariation {i + 1}: Add slight stylistic differences while maintaining accuracy."
            
            task = self._generate_with_retry(variation_prompt)
            tasks.append(task)
        
        # Generate all variations concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        variations_data = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                logger.warning(f"Variation {i + 1} failed", error=str(response))
                continue
            
            try:
                pose_data = self._parse_pose_response(response)
                self._validate_pose_data(pose_data)
                variations_data.append(pose_data)
            except Exception as e:
                logger.warning(f"Variation {i + 1} validation failed", error=str(e))
                continue
        
        return variations_data
    
    def get_pose_statistics(self, pose_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get statistics about the generated pose data."""
        phrases = pose_data.get("phrases", [])
        
        if not phrases:
            return {"error": "No phrases found"}
        
        total_duration = pose_data.get("duration", 0)
        fps = pose_data.get("fps", 30)
        
        # Calculate statistics
        phrase_durations = [phrase["end"] - phrase["start"] for phrase in phrases]
        confidences = [phrase.get("confidence", 0) for phrase in phrases]
        
        return {
            "total_phrases": len(phrases),
            "total_duration": total_duration,
            "fps": fps,
            "average_phrase_duration": sum(phrase_durations) / len(phrase_durations),
            "min_phrase_duration": min(phrase_durations),
            "max_phrase_duration": max(phrase_durations),
            "average_confidence": sum(confidences) / len(confidences),
            "min_confidence": min(confidences),
            "max_confidence": max(confidences),
            "total_frames": int(total_duration * fps)
        }

