"""
FFmpeg utilities for video processing and assembly.
"""

import os
import subprocess
import tempfile
from typing import Dict, List, Any, Optional, Tuple
import structlog
from pathlib import Path

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class FFmpegUtils:
    """Utility class for FFmpeg operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self.ffmpeg_path = self.settings.FFMPEG_PATH
        self.render_fps = self.settings.RENDER_FPS
        
        # Verify FFmpeg installation
        if not self._verify_ffmpeg():
            raise RuntimeError("FFmpeg not found or not accessible")
    
    def _verify_ffmpeg(self) -> bool:
        """Verify that FFmpeg is installed and accessible."""
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    async def assemble_video(
        self,
        frames_dir: Path,
        output_path: str,
        fps: int = None,
        quality: str = "high",
        codec: str = "libx264"
    ) -> Dict[str, Any]:
        """
        Assemble image frames into a video file.
        
        Args:
            frames_dir: Directory containing frame images
            output_path: Path for the output video file
            fps: Frames per second (defaults to render_fps setting)
            quality: Video quality (low, medium, high, lossless)
            codec: Video codec to use
            
        Returns:
            Dictionary with assembly information
        """
        if fps is None:
            fps = self.render_fps
        
        logger.info("Assembling video", 
                   frames_dir=str(frames_dir),
                   output_path=output_path,
                   fps=fps,
                   quality=quality)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Get quality settings
        quality_settings = self._get_quality_settings(quality)
        
        # Build FFmpeg command
        cmd = [
            self.ffmpeg_path,
            "-y",  # Overwrite output file
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%04d.png"),
            "-c:v", codec,
            "-pix_fmt", "yuv420p",
            *quality_settings,
            output_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error("FFmpeg assembly failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"FFmpeg assembly failed: {result.stderr}")
            
            # Get file information
            file_info = await self.get_video_info(output_path)
            
            logger.info("Video assembly completed", 
                       output_path=output_path,
                       file_size=file_info.get("file_size", 0))
            
            return {
                "success": True,
                "output_path": output_path,
                "file_size": file_info.get("file_size", 0),
                "duration": file_info.get("duration", 0),
                "fps": fps,
                "quality": quality,
                "codec": codec,
                "ffmpeg_output": result.stdout
            }
            
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg assembly timed out")
            raise RuntimeError("Video assembly timed out")
        except Exception as e:
            logger.error("FFmpeg assembly failed", error=str(e))
            raise
    
    def _get_quality_settings(self, quality: str) -> List[str]:
        """Get FFmpeg quality settings based on quality level."""
        quality_presets = {
            "low": ["-crf", "28", "-preset", "fast"],
            "medium": ["-crf", "23", "-preset", "medium"],
            "high": ["-crf", "18", "-preset", "slow"],
            "lossless": ["-crf", "0", "-preset", "veryslow"]
        }
        
        return quality_presets.get(quality, quality_presets["high"])
    
    async def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get information about a video file."""
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-f", "null",
                "-"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Parse FFmpeg output for video information
            info = self._parse_ffmpeg_info(result.stderr, video_path)
            
            return info
            
        except Exception as e:
            logger.error("Failed to get video info", error=str(e))
            return {"error": str(e)}
    
    def _parse_ffmpeg_info(self, ffmpeg_output: str, video_path: str) -> Dict[str, Any]:
        """Parse FFmpeg output to extract video information."""
        info = {
            "file_path": video_path,
            "file_size": 0,
            "duration": 0,
            "fps": 0,
            "width": 0,
            "height": 0,
            "bitrate": 0,
            "codec": "unknown"
        }
        
        try:
            # Get file size
            if os.path.exists(video_path):
                info["file_size"] = os.path.getsize(video_path)
            
            # Parse FFmpeg output
            lines = ffmpeg_output.split('\n')
            
            for line in lines:
                # Duration
                if "Duration:" in line:
                    duration_str = line.split("Duration:")[1].split(",")[0].strip()
                    info["duration"] = self._parse_duration(duration_str)
                
                # Video stream info
                elif "Video:" in line and "Stream" in line:
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if part == "fps":
                            try:
                                info["fps"] = float(parts[i-1])
                            except (ValueError, IndexError):
                                pass
                        elif "x" in part and part.replace("x", "").replace(".", "").isdigit():
                            try:
                                width, height = part.split("x")
                                info["width"] = int(width)
                                info["height"] = int(height)
                            except (ValueError, IndexError):
                                pass
                        elif part.startswith("(") and "kb/s" in part:
                            try:
                                bitrate_str = part.split("(")[1].split("kb/s")[0]
                                info["bitrate"] = int(bitrate_str)
                            except (ValueError, IndexError):
                                pass
                        elif part in ["h264", "h265", "vp9", "av1"]:
                            info["codec"] = part
            
        except Exception as e:
            logger.warning("Failed to parse FFmpeg info", error=str(e))
        
        return info
    
    def _parse_duration(self, duration_str: str) -> float:
        """Parse duration string (HH:MM:SS.mmm) to seconds."""
        try:
            parts = duration_str.split(":")
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        except (ValueError, IndexError):
            return 0.0
    
    async def create_thumbnail(
        self,
        video_path: str,
        output_path: str,
        timestamp: float = 1.0,
        size: Tuple[int, int] = (320, 240)
    ) -> Dict[str, Any]:
        """Create a thumbnail from a video file."""
        try:
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", video_path,
                "-ss", str(timestamp),
                "-vframes", "1",
                "-s", f"{size[0]}x{size[1]}",
                "-f", "image2",
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error("Thumbnail creation failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Thumbnail creation failed: {result.stderr}")
            
            return {
                "success": True,
                "output_path": output_path,
                "timestamp": timestamp,
                "size": size
            }
            
        except Exception as e:
            logger.error("Thumbnail creation failed", error=str(e))
            raise
    
    async def convert_video(
        self,
        input_path: str,
        output_path: str,
        output_format: str = "mp4",
        quality: str = "high"
    ) -> Dict[str, Any]:
        """Convert video to different format."""
        try:
            quality_settings = self._get_quality_settings(quality)
            
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", input_path,
                "-c:v", "libx264",
                "-c:a", "aac",
                *quality_settings,
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                logger.error("Video conversion failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Video conversion failed: {result.stderr}")
            
            return {
                "success": True,
                "input_path": input_path,
                "output_path": output_path,
                "output_format": output_format,
                "quality": quality
            }
            
        except Exception as e:
            logger.error("Video conversion failed", error=str(e))
            raise
    
    async def extract_audio(
        self,
        video_path: str,
        output_path: str,
        format: str = "mp3"
    ) -> Dict[str, Any]:
        """Extract audio from video file."""
        try:
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", format,
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                logger.error("Audio extraction failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Audio extraction failed: {result.stderr}")
            
            return {
                "success": True,
                "video_path": video_path,
                "output_path": output_path,
                "format": format
            }
            
        except Exception as e:
            logger.error("Audio extraction failed", error=str(e))
            raise
    
    async def add_audio_to_video(
        self,
        video_path: str,
        audio_path: str,
        output_path: str
    ) -> Dict[str, Any]:
        """Add audio track to video file."""
        try:
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "copy",  # Copy video without re-encoding
                "-c:a", "aac",
                "-shortest",  # Match shortest input
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                logger.error("Audio addition failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Audio addition failed: {result.stderr}")
            
            return {
                "success": True,
                "video_path": video_path,
                "audio_path": audio_path,
                "output_path": output_path
            }
            
        except Exception as e:
            logger.error("Audio addition failed", error=str(e))
            raise
    
    def get_supported_formats(self) -> Dict[str, List[str]]:
        """Get list of supported video and audio formats."""
        return {
            "video_formats": ["mp4", "avi", "mov", "mkv", "webm", "flv"],
            "audio_formats": ["mp3", "aac", "wav", "flac", "ogg"],
            "image_formats": ["png", "jpg", "jpeg", "bmp", "tiff"],
            "codecs": {
                "video": ["libx264", "libx265", "libvpx", "libvpx-vp9"],
                "audio": ["aac", "mp3", "libvorbis", "flac"]
            }
        }

