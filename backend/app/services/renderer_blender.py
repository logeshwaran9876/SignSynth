"""
Blender-based 3D rendering for sign language videos.
Uses headless Blender to render avatar animations from pose data.
"""

import os
import json
import subprocess
import tempfile
from typing import Dict, List, Any, Optional
import structlog
from pathlib import Path

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class BlenderRenderer:
    """Blender-based 3D renderer for sign language videos."""
    
    def __init__(self):
        self.settings = get_settings()
        self.blender_path = self.settings.BLENDER_PATH
        self.ffmpeg_path = self.settings.FFMPEG_PATH
        self.render_fps = self.settings.RENDER_FPS
        
        # Verify Blender installation
        if not self._verify_blender():
            raise RuntimeError("Blender not found or not accessible")
    
    def _verify_blender(self) -> bool:
        """Verify that Blender is installed and accessible."""
        try:
            result = subprocess.run(
                [self.blender_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    async def render_video(
        self,
        pose_data: Dict[str, Any],
        output_path: str,
        avatar_path: str = None,
        quality: str = "hd",
        background_color: tuple = (1.0, 1.0, 1.0, 1.0)
    ) -> Dict[str, Any]:
        """
        Render a sign language video from pose data using Blender.
        
        Args:
            pose_data: Pose data from Gemini API
            output_path: Path for the output video file
            avatar_path: Path to the avatar .blend file
            quality: Render quality (preview, hd, 4k)
            background_color: RGBA background color
            
        Returns:
            Dictionary with render information
        """
        logger.info("Starting Blender render", output_path=output_path, quality=quality)
        
        # Create temporary directory for frames
        with tempfile.TemporaryDirectory() as temp_dir:
            frames_dir = Path(temp_dir) / "frames"
            frames_dir.mkdir()
            
            # Generate Blender script
            script_path = self._generate_blender_script(
                pose_data=pose_data,
                frames_dir=frames_dir,
                avatar_path=avatar_path or self._get_default_avatar(),
                quality=quality,
                background_color=background_color
            )
            
            # Run Blender
            render_info = await self._run_blender_script(script_path, frames_dir)
            
            # Assemble video with FFmpeg
            video_info = await self._assemble_video(frames_dir, output_path)
            
            # Combine render information
            result = {
                **render_info,
                **video_info,
                "output_path": output_path,
                "quality": quality
            }
            
            logger.info("Blender render completed", **result)
            return result
    
    def _generate_blender_script(
        self,
        pose_data: Dict[str, Any],
        frames_dir: Path,
        avatar_path: str,
        quality: str,
        background_color: tuple
    ) -> str:
        """Generate a Blender Python script for rendering."""
        
        # Quality settings
        quality_settings = {
            "preview": {"resolution": (640, 480), "samples": 32},
            "hd": {"resolution": (1920, 1080), "samples": 128},
            "4k": {"resolution": (3840, 2160), "samples": 256}
        }
        
        settings = quality_settings.get(quality, quality_settings["hd"])
        width, height = settings["resolution"]
        samples = settings["samples"]
        
        # Calculate frame range
        duration = pose_data.get("duration", 0)
        fps = pose_data.get("fps", 30)
        frame_count = int(duration * fps)
        
        script_content = f'''
import bpy
import json
import mathutils
from mathutils import Vector, Euler
import os

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Load avatar
bpy.ops.import_scene.gltf(filepath="{avatar_path}")

# Set up scene
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.render.resolution_x = {width}
scene.render.resolution_y = {height}
scene.render.fps = {fps}
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = "{frames_dir}/frame_"

# Set up camera
bpy.ops.object.camera_add(location=(0, -3, 1.5))
camera = bpy.context.object
camera.rotation_euler = (1.1, 0, 0)
scene.camera = camera

# Set up lighting
bpy.ops.object.light_add(type='SUN', location=(2, 2, 5))
sun = bpy.context.object
sun.data.energy = 3

# Add fill light
bpy.ops.object.light_add(type='AREA', location=(-2, -1, 2))
fill_light = bpy.context.object
fill_light.data.energy = 1
fill_light.data.size = 5

# Set background color
world = bpy.context.scene.world
world.use_nodes = True
bg_node = world.node_tree.nodes['Background']
bg_node.inputs[0].default_value = {background_color}

# Configure Cycles
scene.cycles.samples = {samples}
scene.cycles.use_denoising = True

# Load pose data
pose_data = {json.dumps(pose_data)}

# Find avatar armature
armature = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        armature = obj
        break

if not armature:
    print("No armature found in avatar")
    exit(1)

# Set up animation
armature.animation_data_create()
action = bpy.data.actions.new(name="SignAnimation")
armature.animation_data.action = action

# Create keyframes for each phrase
frame_number = 0
for phrase in pose_data["phrases"]:
    start_frame = int(phrase["start"] * {fps})
    end_frame = int(phrase["end"] * {fps})
    
    # Apply pose to armature
    self._apply_pose_to_armature(armature, phrase, start_frame, end_frame)

# Set frame range
scene.frame_start = 0
scene.frame_end = {frame_count}

# Render frames
bpy.ops.render.render(animation=True)

print("Rendering completed")
'''

        # Write script to temporary file
        script_path = frames_dir.parent / "render_script.py"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        return str(script_path)
    
    def _apply_pose_to_armature(self, armature, phrase, start_frame, end_frame):
        """Apply pose data to armature bones."""
        # This is a simplified version - in practice, you'd need to map
        # the pose data to specific bone names in your avatar
        script_addition = f'''
def _apply_pose_to_armature(armature, phrase, start_frame, end_frame):
    """Apply pose data to armature bones."""
    hands = phrase.get("hands", {{}})
    joints = phrase.get("joints", {{}})
    facial = phrase.get("facial", {{}})
    
    # Map pose data to bone names (this would be customized per avatar)
    bone_mappings = {{
        "head": "head",
        "neck": "neck",
        "shoulder_left": "shoulder.L",
        "shoulder_right": "shoulder.R",
        "elbow_left": "upper_arm.L",
        "elbow_right": "upper_arm.R",
        "wrist_left": "forearm.L",
        "wrist_right": "forearm.R",
        "hip_left": "thigh.L",
        "hip_right": "thigh.R",
        "knee_left": "shin.L",
        "knee_right": "shin.R",
        "ankle_left": "foot.L",
        "ankle_right": "foot.R"
    }}
    
    # Apply joint positions
    for joint_name, position in joints.items():
        bone_name = bone_mappings.get(joint_name)
        if bone_name and bone_name in armature.pose.bones:
            bone = armature.pose.bones[bone_name]
            
            # Set keyframes for bone location
            bone.location = Vector((position["x"], position["y"], position["z"]))
            bone.keyframe_insert(data_path="location", frame=start_frame)
            bone.keyframe_insert(data_path="location", frame=end_frame)
    
    # Apply facial expressions
    if facial:
        # This would be customized based on your avatar's facial rig
        pass
'''
        
        return script_addition
    
    async def _run_blender_script(self, script_path: str, frames_dir: Path) -> Dict[str, Any]:
        """Run the Blender script."""
        try:
            cmd = [
                self.blender_path,
                "--background",
                "--python", script_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error("Blender script failed", 
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Blender script failed: {result.stderr}")
            
            # Count rendered frames
            frame_files = list(frames_dir.glob("frame_*.png"))
            frame_count = len(frame_files)
            
            return {
                "frames_rendered": frame_count,
                "blender_output": result.stdout,
                "frames_dir": str(frames_dir)
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Blender script timed out")
            raise RuntimeError("Blender rendering timed out")
        except Exception as e:
            logger.error("Blender script execution failed", error=str(e))
            raise
    
    async def _assemble_video(self, frames_dir: Path, output_path: str) -> Dict[str, Any]:
        """Assemble frames into video using FFmpeg."""
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            cmd = [
                self.ffmpeg_path,
                "-y",  # Overwrite output file
                "-framerate", str(self.render_fps),
                "-i", str(frames_dir / "frame_%04d.png"),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-crf", "18",  # High quality
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            if result.returncode != 0:
                logger.error("FFmpeg assembly failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"FFmpeg assembly failed: {result.stderr}")
            
            # Get file size
            file_size = os.path.getsize(output_path)
            
            return {
                "video_assembled": True,
                "output_file": output_path,
                "file_size": file_size,
                "ffmpeg_output": result.stdout
            }
            
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg assembly timed out")
            raise RuntimeError("Video assembly timed out")
        except Exception as e:
            logger.error("FFmpeg assembly failed", error=str(e))
            raise
    
    def _get_default_avatar(self) -> str:
        """Get path to default avatar file."""
        # In a real implementation, this would point to a default avatar
        # For now, return a placeholder path
        return "/app/assets/default_avatar.blend"
    
    def get_render_capabilities(self) -> Dict[str, Any]:
        """Get information about renderer capabilities."""
        return {
            "renderer": "blender",
            "supported_formats": ["mp4", "avi", "mov"],
            "supported_qualities": ["preview", "hd", "4k"],
            "max_resolution": "4K",
            "features": [
                "3D rendering",
                "Custom lighting",
                "Facial expressions",
                "High quality output",
                "Custom avatars"
            ],
            "requirements": {
                "blender": self.blender_path,
                "ffmpeg": self.ffmpeg_path
            }
        }

