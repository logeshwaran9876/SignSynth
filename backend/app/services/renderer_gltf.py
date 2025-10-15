"""
WebGL/Three.js-based rendering for sign language videos.
Uses headless browser to render 3D scenes with pose data.
"""

import os
import json
import asyncio
import tempfile
from typing import Dict, List, Any, Optional
import structlog
from pathlib import Path
import subprocess

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class WebGLRenderer:
    """WebGL-based 3D renderer using headless browser."""
    
    def __init__(self):
        self.settings = get_settings()
        self.render_fps = self.settings.RENDER_FPS
        
        # Verify Node.js and required packages
        if not self._verify_node_setup():
            raise RuntimeError("Node.js setup not found or incomplete")
    
    def _verify_node_setup(self) -> bool:
        """Verify Node.js and required packages are available."""
        try:
            # Check Node.js
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                return False
            
            # Check if puppeteer is available
            result = subprocess.run(
                ["node", "-e", "require('puppeteer')"],
                capture_output=True,
                text=True,
                timeout=5
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
        background_color: str = "#ffffff"
    ) -> Dict[str, Any]:
        """
        Render a sign language video using WebGL/Three.js.
        
        Args:
            pose_data: Pose data from Gemini API
            output_path: Path for the output video file
            avatar_path: Path to the avatar GLTF file
            quality: Render quality (preview, hd, 4k)
            background_color: Background color in hex format
            
        Returns:
            Dictionary with render information
        """
        logger.info("Starting WebGL render", output_path=output_path, quality=quality)
        
        # Create temporary directory for frames
        with tempfile.TemporaryDirectory() as temp_dir:
            frames_dir = Path(temp_dir) / "frames"
            frames_dir.mkdir()
            
            # Generate HTML renderer
            html_path = self._generate_html_renderer(
                pose_data=pose_data,
                frames_dir=frames_dir,
                avatar_path=avatar_path or self._get_default_avatar(),
                quality=quality,
                background_color=background_color
            )
            
            # Run headless browser
            render_info = await self._run_headless_browser(html_path, frames_dir)
            
            # Assemble video with FFmpeg
            video_info = await self._assemble_video(frames_dir, output_path)
            
            # Combine render information
            result = {
                **render_info,
                **video_info,
                "output_path": output_path,
                "quality": quality
            }
            
            logger.info("WebGL render completed", **result)
            return result
    
    def _generate_html_renderer(
        self,
        pose_data: Dict[str, Any],
        frames_dir: Path,
        avatar_path: str,
        quality: str,
        background_color: str
    ) -> str:
        """Generate HTML file with Three.js renderer."""
        
        # Quality settings
        quality_settings = {
            "preview": {"width": 640, "height": 480, "samples": 1},
            "hd": {"width": 1920, "height": 1080, "samples": 4},
            "4k": {"width": 3840, "height": 2160, "samples": 8}
        }
        
        settings = quality_settings.get(quality, quality_settings["hd"])
        width = settings["width"]
        height = settings["height"]
        samples = settings["samples"]
        
        # Calculate frame range
        duration = pose_data.get("duration", 0)
        fps = pose_data.get("fps", 30)
        frame_count = int(duration * fps)
        
        html_content = f'''
<!DOCTYPE html>
<html>
<head>
    <title>SignSynth WebGL Renderer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <canvas id="renderCanvas" width="{width}" height="{height}"></canvas>
    
    <script>
        // Configuration
        const CONFIG = {{
            width: {width},
            height: {height},
            fps: {fps},
            frameCount: {frame_count},
            samples: {samples},
            background: "{background_color}",
            avatarPath: "{avatar_path}",
            framesDir: "{frames_dir}",
            poseData: {json.dumps(pose_data)}
        }};
        
        // Global variables
        let scene, camera, renderer, avatar, mixer, clock;
        let currentFrame = 0;
        let isRendering = false;
        
        // Initialize Three.js scene
        function initScene() {{
            // Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(CONFIG.background);
            
            // Camera
            camera = new THREE.PerspectiveCamera(75, CONFIG.width / CONFIG.height, 0.1, 1000);
            camera.position.set(0, 1, 3);
            camera.lookAt(0, 1, 0);
            
            // Renderer
            const canvas = document.getElementById('renderCanvas');
            renderer = new THREE.WebGLRenderer({{ canvas: canvas, antialias: true }});
            renderer.setSize(CONFIG.width, CONFIG.height);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);
            
            // Clock for animation
            clock = new THREE.Clock();
        }}
        
        // Load avatar
        function loadAvatar() {{
            return new Promise((resolve, reject) => {{
                const loader = new THREE.GLTFLoader();
                loader.load(
                    CONFIG.avatarPath,
                    (gltf) => {{
                        avatar = gltf.scene;
                        avatar.scale.setScalar(1);
                        avatar.position.set(0, 0, 0);
                        scene.add(avatar);
                        
                        // Set up animation mixer
                        if (gltf.animations && gltf.animations.length > 0) {{
                            mixer = new THREE.AnimationMixer(avatar);
                        }}
                        
                        resolve();
                    }},
                    undefined,
                    (error) => {{
                        console.error('Error loading avatar:', error);
                        reject(error);
                    }}
                );
            }});
        }}
        
        // Apply pose to avatar
        function applyPose(poseData, frameNumber) {{
            if (!avatar) return;
            
            const time = frameNumber / CONFIG.fps;
            
            // Find the current phrase
            let currentPhrase = null;
            for (const phrase of CONFIG.poseData.phrases) {{
                if (time >= phrase.start && time <= phrase.end) {{
                    currentPhrase = phrase;
                    break;
                }}
            }}
            
            if (!currentPhrase) return;
            
            // Apply joint positions
            const joints = currentPhrase.joints;
            if (joints) {{
                // This would be customized based on your avatar's bone structure
                applyJointPositions(joints);
            }}
            
            // Apply hand positions
            const hands = currentPhrase.hands;
            if (hands) {{
                applyHandPositions(hands);
            }}
            
            // Apply facial expressions
            const facial = currentPhrase.facial;
            if (facial) {{
                applyFacialExpressions(facial);
            }}
        }}
        
        // Apply joint positions to avatar bones
        function applyJointPositions(joints) {{
            // This is a simplified version - in practice, you'd need to map
            // the pose data to specific bone names in your avatar
            avatar.traverse((child) => {{
                if (child.isBone) {{
                    const jointName = getJointNameFromBone(child.name);
                    if (jointName && joints[jointName]) {{
                        const pos = joints[jointName];
                        child.position.set(pos.x, pos.y, pos.z);
                    }}
                }}
            }});
        }}
        
        // Apply hand positions
        function applyHandPositions(hands) {{
            // Apply left hand
            if (hands.left) {{
                const leftHand = avatar.getObjectByName('hand_left');
                if (leftHand) {{
                    // Apply hand keypoints
                    hands.left.forEach((keypoint, index) => {{
                        // Apply keypoint positions to hand bones
                    }});
                }}
            }}
            
            // Apply right hand
            if (hands.right) {{
                const rightHand = avatar.getObjectByName('hand_right');
                if (rightHand) {{
                    // Apply hand keypoints
                    hands.right.forEach((keypoint, index) => {{
                        // Apply keypoint positions to hand bones
                    }});
                }}
            }}
        }}
        
        // Apply facial expressions
        function applyFacialExpressions(facial) {{
            // This would be customized based on your avatar's facial rig
            // For now, we'll just log the expressions
            console.log('Facial expressions:', facial);
        }}
        
        // Get joint name from bone name
        function getJointNameFromBone(boneName) {{
            const mappings = {{
                'head': 'head',
                'neck': 'neck',
                'shoulder_L': 'shoulder_left',
                'shoulder_R': 'shoulder_right',
                'upper_arm_L': 'elbow_left',
                'upper_arm_R': 'elbow_right',
                'forearm_L': 'wrist_left',
                'forearm_R': 'wrist_right',
                'thigh_L': 'hip_left',
                'thigh_R': 'hip_right',
                'shin_L': 'knee_left',
                'shin_R': 'knee_right',
                'foot_L': 'ankle_left',
                'foot_R': 'ankle_right'
            }};
            return mappings[boneName];
        }}
        
        // Render single frame
        function renderFrame(frameNumber) {{
            // Apply pose for this frame
            applyPose(CONFIG.poseData, frameNumber);
            
            // Update animation mixer
            if (mixer) {{
                mixer.update(clock.getDelta());
            }}
            
            // Render
            renderer.render(scene, camera);
            
            // Save frame
            const canvas = renderer.domElement;
            const dataURL = canvas.toDataURL('image/png');
            
            // Convert data URL to blob and save
            const link = document.createElement('a');
            link.download = `frame_${{frameNumber.toString().padStart(4, '0')}}.png`;
            link.href = dataURL;
            link.click();
        }}
        
        // Main rendering loop
        async function startRendering() {{
            console.log('Starting rendering...');
            isRendering = true;
            
            for (let frame = 0; frame < CONFIG.frameCount; frame++) {{
                if (!isRendering) break;
                
                renderFrame(frame);
                
                // Small delay to prevent browser freezing
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Log progress
                if (frame % 30 === 0) {{
                    console.log(`Rendered frame ${{frame}}/${{CONFIG.frameCount}}`);
                }}
            }}
            
            console.log('Rendering completed!');
            isRendering = false;
        }}
        
        // Initialize and start
        async function init() {{
            try {{
                initScene();
                await loadAvatar();
                await startRendering();
            }} catch (error) {{
                console.error('Rendering failed:', error);
            }}
        }}
        
        // Start when page loads
        window.addEventListener('load', init);
    </script>
</body>
</html>
'''
        
        # Write HTML file
        html_path = frames_dir.parent / "renderer.html"
        with open(html_path, 'w') as f:
            f.write(html_content)
        
        return str(html_path)
    
    async def _run_headless_browser(self, html_path: str, frames_dir: Path) -> Dict[str, Any]:
        """Run headless browser to render frames."""
        try:
            # Create Node.js script for headless rendering
            node_script = self._generate_node_script(html_path, frames_dir)
            
            # Run Node.js script
            result = subprocess.run(
                ["node", node_script],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error("Headless browser failed",
                           returncode=result.returncode,
                           stderr=result.stderr)
                raise RuntimeError(f"Headless browser failed: {result.stderr}")
            
            # Count rendered frames
            frame_files = list(frames_dir.glob("frame_*.png"))
            frame_count = len(frame_files)
            
            return {
                "frames_rendered": frame_count,
                "browser_output": result.stdout,
                "frames_dir": str(frames_dir)
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Headless browser timed out")
            raise RuntimeError("Headless browser rendering timed out")
        except Exception as e:
            logger.error("Headless browser execution failed", error=str(e))
            raise
    
    def _generate_node_script(self, html_path: str, frames_dir: Path) -> str:
        """Generate Node.js script for headless browser rendering."""
        script_content = f'''
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function renderFrames() {{
    const browser = await puppeteer.launch({{
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }});
    
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({{ width: 1920, height: 1080 }});
    
    // Load the HTML file
    const htmlPath = path.resolve('{html_path}');
    await page.goto(`file://${{htmlPath}}`);
    
    // Wait for rendering to complete
    await page.waitForFunction(() => {{
        return window.isRendering === false;
    }}, {{ timeout: 300000 }});
    
    // Get console logs
    const logs = await page.evaluate(() => {{
        return window.console.logs || [];
    }});
    
    console.log('Rendering completed');
    console.log('Logs:', logs);
    
    await browser.close();
}}

renderFrames().catch(console.error);
'''
        
        # Write Node.js script
        script_path = frames_dir.parent / "render_script.js"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        return str(script_path)
    
    async def _assemble_video(self, frames_dir: Path, output_path: str) -> Dict[str, Any]:
        """Assemble frames into video using FFmpeg."""
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            cmd = [
                "ffmpeg",
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
        return "/app/assets/default_avatar.gltf"
    
    def get_render_capabilities(self) -> Dict[str, Any]:
        """Get information about renderer capabilities."""
        return {
            "renderer": "webgl",
            "supported_formats": ["mp4", "webm"],
            "supported_qualities": ["preview", "hd", "4k"],
            "max_resolution": "4K",
            "features": [
                "WebGL rendering",
                "Real-time preview",
                "Cross-platform",
                "Easy deployment",
                "Custom shaders"
            ],
            "requirements": {
                "node": ">=14.0.0",
                "puppeteer": ">=5.0.0",
                "ffmpeg": "required"
            }
        }

