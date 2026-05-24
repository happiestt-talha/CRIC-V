"""
Service for downloading and validating videos from URLs.
Supports YouTube URLs and direct MP4/video URLs.
"""
import os
import re
import requests
import yt_dlp
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

# Maximum allowed video duration in seconds (10 minutes)
MAX_DURATION_SECONDS = 600
# Maximum file size in bytes (500MB)
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

SUPPORTED_DIRECT_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

def is_youtube_url(url: str) -> bool:
    """Check if URL is a YouTube video URL."""
    youtube_patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'(?:https?://)?(?:www\.)?youtu\.be/[\w-]+',
        r'(?:https?://)?(?:www\.)?youtube\.com/shorts/[\w-]+',
        r'(?:https?://)?(?:www\.)?youtube\.com/embed/[\w-]+',
    ]
    return any(re.match(pattern, url) for pattern in youtube_patterns)

def is_direct_video_url(url: str) -> bool:
    """Check if URL points directly to a video file."""
    try:
        parsed = url.lower().split('?')[0]  # strip query params
        return any(parsed.endswith(ext) for ext in SUPPORTED_DIRECT_EXTENSIONS)
    except Exception:
        return False

def validate_url(url: str) -> Dict:
    """
    Validate a video URL before attempting download.
    Returns: { valid: bool, type: 'youtube'|'direct'|'unsupported', 
               error: str|None, title: str|None, duration_seconds: int|None }
    """
    if not url or not url.startswith(('http://', 'https://')):
        return {
            "valid": False,
            "type": "unsupported",
            "error": "Invalid URL format. URL must start with http:// or https://",
            "title": None,
            "duration_seconds": None
        }

    if is_youtube_url(url):
        return _validate_youtube_url(url)
    elif is_direct_video_url(url):
        return _validate_direct_url(url)
    else:
        return {
            "valid": False,
            "type": "unsupported",
            "error": "Unsupported URL. Please provide a YouTube URL or a direct link to an MP4/MOV/AVI video file.",
            "title": None,
            "duration_seconds": None
        }

def _validate_youtube_url(url: str) -> Dict:
    """Validate YouTube URL — check availability and duration."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,  # Only fetch metadata
        'extract_flat': False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            duration = info.get('duration', 0)
            title = info.get('title', 'YouTube Video')

            if duration and duration > MAX_DURATION_SECONDS:
                return {
                    "valid": False,
                    "type": "youtube",
                    "error": f"Video is too long ({duration // 60} minutes). Maximum allowed is {MAX_DURATION_SECONDS // 60} minutes. Please use a shorter training clip.",
                    "title": title,
                    "duration_seconds": duration
                }

            return {
                "valid": True,
                "type": "youtube",
                "error": None,
                "title": title,
                "duration_seconds": duration,
                "thumbnail": info.get('thumbnail'),
                "uploader": info.get('uploader')
            }

    except yt_dlp.utils.DownloadError as e:
        error_str = str(e).lower()
        if 'private' in error_str:
            msg = "This video is private and cannot be accessed."
        elif 'unavailable' in error_str or 'not available' in error_str:
            msg = "This video is unavailable or has been removed."
        elif 'age' in error_str:
            msg = "This video is age-restricted and cannot be downloaded."
        elif 'copyright' in error_str:
            msg = "This video cannot be downloaded due to copyright restrictions."
        else:
            msg = f"Could not access YouTube video. Please check the URL and ensure the video is publicly available."
        return {
            "valid": False,
            "type": "youtube",
            "error": msg,
            "title": None,
            "duration_seconds": None
        }
    except Exception as e:
        logger.error(f"YouTube validation error: {e}")
        return {
            "valid": False,
            "type": "youtube",
            "error": "Failed to retrieve video information. Please try again.",
            "title": None,
            "duration_seconds": None
        }

def _validate_direct_url(url: str) -> Dict:
    """Validate direct video URL using HTTP HEAD request."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        content_type = response.headers.get('Content-Type', '')
        content_length = response.headers.get('Content-Length')

        if response.status_code == 404:
            return {"valid": False, "type": "direct", "error": "Video file not found at this URL (404).", "title": None, "duration_seconds": None}

        if response.status_code != 200:
            return {"valid": False, "type": "direct", "error": f"Could not access video URL (HTTP {response.status_code}).", "title": None, "duration_seconds": None}

        # Check content type is video
        if content_type and not any(t in content_type for t in ['video', 'octet-stream', 'mp4', 'mpeg']):
            return {"valid": False, "type": "direct", "error": f"URL does not point to a video file (Content-Type: {content_type}).", "title": None, "duration_seconds": None}

        # Check file size
        if content_length and int(content_length) > MAX_FILE_SIZE_BYTES:
            size_mb = int(content_length) / (1024 * 1024)
            return {"valid": False, "type": "direct", "error": f"File is too large ({size_mb:.0f}MB). Maximum allowed is 500MB.", "title": None, "duration_seconds": None}

        # Extract filename from URL
        filename = url.split('/')[-1].split('?')[0] or 'video.mp4'
        size_mb = int(content_length) / (1024 * 1024) if content_length else None

        return {
            "valid": True,
            "type": "direct",
            "error": None,
            "title": filename,
            "duration_seconds": None,  # Can't know without downloading
            "file_size_mb": round(size_mb, 2) if size_mb else None
        }

    except requests.Timeout:
        return {"valid": False, "type": "direct", "error": "URL request timed out. Please check the URL is accessible.", "title": None, "duration_seconds": None}
    except Exception as e:
        logger.error(f"Direct URL validation error: {e}")
        return {"valid": False, "type": "direct", "error": "Could not access the video URL. Please ensure it is publicly accessible.", "title": None, "duration_seconds": None}


def download_video(url: str, output_dir: str, filename_prefix: str = "imported",
                   progress_callback=None) -> Dict:
    """
    Download video from URL to output_dir.
    progress_callback(percent: int, stage: str) called during download.
    Returns: { success: bool, file_path: str, filename: str, 
               file_size_mb: float, title: str, error: str|None }
    """
    os.makedirs(output_dir, exist_ok=True)

    if is_youtube_url(url):
        return _download_youtube(url, output_dir, filename_prefix, progress_callback)
    else:
        return _download_direct(url, output_dir, filename_prefix, progress_callback)


def _download_youtube(url: str, output_dir: str, filename_prefix: str,
                       progress_callback=None) -> Dict:
    """Download YouTube video using yt-dlp."""
    output_template = os.path.join(output_dir, f"{filename_prefix}_%(title)s.%(ext)s")
    downloaded_file = [None]
    video_title = [None]

    def progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                percent = int((downloaded / total) * 100)
                if progress_callback:
                    progress_callback(percent, f"Downloading from YouTube... {percent}%")
        elif d['status'] == 'finished':
            downloaded_file[0] = d['filename']
            if progress_callback:
                progress_callback(95, "Download complete — preparing video...")

    ydl_opts = {
        'format': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'merge_output_format': 'mp4',
        # Limit download speed to avoid hammering (optional)
        # 'ratelimit': 5000000,  # 5MB/s
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_title[0] = info.get('title', 'YouTube Video')

            # Find the actual downloaded file
            if not downloaded_file[0]:
                # Fallback: search output dir for the most recent mp4
                files = [f for f in os.listdir(output_dir) if f.endswith('.mp4')]
                if files:
                    downloaded_file[0] = os.path.join(output_dir, max(files, key=lambda f: os.path.getctime(os.path.join(output_dir, f))))

            if not downloaded_file[0] or not os.path.exists(downloaded_file[0]):
                return {"success": False, "error": "Download completed but file not found on disk."}

            file_size = os.path.getsize(downloaded_file[0])
            file_size_mb = round(file_size / (1024 * 1024), 2)
            filename = os.path.basename(downloaded_file[0])

            if progress_callback:
                progress_callback(100, "Video ready")

            return {
                "success": True,
                "file_path": downloaded_file[0],
                "filename": filename,
                "title": video_title[0],
                "file_size_mb": file_size_mb,
                "error": None
            }

    except yt_dlp.utils.DownloadError as e:
        return {"success": False, "error": f"Download failed: {str(e)}", "file_path": None}
    except Exception as e:
        logger.error(f"YouTube download error: {e}")
        return {"success": False, "error": "An unexpected error occurred during download.", "file_path": None}


def _download_direct(url: str, output_dir: str, filename_prefix: str,
                      progress_callback=None) -> Dict:
    """Download direct video URL using requests with streaming."""
    filename = url.split('/')[-1].split('?')[0] or 'video.mp4'
    if not any(filename.endswith(ext) for ext in SUPPORTED_DIRECT_EXTENSIONS):
        filename += '.mp4'

    safe_filename = f"{filename_prefix}_{filename}"
    output_path = os.path.join(output_dir, safe_filename)

    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        total_size = int(response.headers.get('Content-Length', 0))
        downloaded = 0

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0 and progress_callback:
                        percent = int((downloaded / total_size) * 100)
                        progress_callback(percent, f"Downloading video... {percent}%")

                    # File size check during download
                    if downloaded > MAX_FILE_SIZE_BYTES:
                        f.close()
                        os.remove(output_path)
                        return {"success": False, "error": "File exceeds 500MB limit. Download cancelled.", "file_path": None}

        file_size_mb = round(os.path.getsize(output_path) / (1024 * 1024), 2)

        if progress_callback:
            progress_callback(100, "Video ready")

        return {
            "success": True,
            "file_path": output_path,
            "filename": safe_filename,
            "title": filename,
            "file_size_mb": file_size_mb,
            "error": None
        }

    except requests.HTTPError as e:
        return {"success": False, "error": f"HTTP error downloading video: {e}", "file_path": None}
    except Exception as e:
        logger.error(f"Direct download error: {e}")
        return {"success": False, "error": "Failed to download video. Please check the URL.", "file_path": None}
