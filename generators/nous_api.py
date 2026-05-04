#!/usr/bin/env python3
"""
Direct Nous API + FAL API wrapper for CI environments.

In CI (GitHub Actions), we can't install the full Hermes Agent CLI.
This module provides the same functionality via direct HTTP calls:
  - chat(): text generation via Nous inference API (OpenAI-compatible)
  - generate_image(): image generation via FAL API

Usage:
    from generators.nous_api import chat, generate_image

Env vars required:
    NOUS_API_KEY    - Nous Research API key
    FAL_KEY         - FAL.ai API key (for image generation only)
"""

import json
import os
import re
import subprocess
import sys
import time

import requests

# ── Config ────────────────────────────────────────────────────────

NOUS_API_BASE = os.environ.get("NOUS_API_BASE", "https://inference-api.nousresearch.com/v1")
NOUS_API_KEY = os.environ.get("NOUS_API_KEY", "")
NOUS_MODEL = os.environ.get("NOUS_MODEL", "Hermes-4-405B")

FAL_KEY = os.environ.get("FAL_KEY", "")
FAL_MODEL = "fal-ai/flux-pro/v1.1"  # same model Hermes uses

HERMES_CLI = os.environ.get("HERMES_CLI", "hermes")

# ── Detection ─────────────────────────────────────────────────────

def is_ci():
    """Are we running in CI (GitHub Actions, etc)?"""
    return bool(os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"))


def hermes_available():
    """Check if Hermes CLI is installed and callable."""
    try:
        result = subprocess.run(
            [HERMES_CLI, "--version"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def use_direct_api():
    """Should we use direct API calls instead of Hermes CLI?"""
    if is_ci():
        return True
    if os.environ.get("USE_DIRECT_API", "").lower() in ("1", "true", "yes"):
        return True
    if not hermes_available():
        return True
    return False


# ── Chat (text generation) ────────────────────────────────────────

def chat(prompt, model=None, provider="nous", system_prompt=None, timeout=120):
    """Generate text via Nous API (OpenAI-compatible endpoint).
    
    Falls back to Hermes CLI if available and not in CI.
    """
    if not use_direct_api():
        return _chat_via_hermes(prompt, model=model, provider=provider, timeout=timeout)
    
    return _chat_via_api(prompt, model=model, system_prompt=system_prompt, timeout=timeout)


def _chat_via_api(prompt, model=None, system_prompt=None, timeout=120):
    """Direct API call to Nous inference endpoint."""
    if not NOUS_API_KEY:
        raise RuntimeError("NOUS_API_KEY not set — required for direct API calls in CI")
    
    model = model or NOUS_MODEL
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    resp = requests.post(
        f"{NOUS_API_BASE}/chat/completions",
        headers={
            "Authorization": f"Bearer {NOUS_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 2048,
            "temperature": 0.8,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _chat_via_hermes(prompt, model=None, provider="nous", timeout=120):
    """Call via Hermes CLI (local dev)."""
    model = model or NOUS_MODEL
    cmd = [
        HERMES_CLI, "chat",
        "-q", prompt,
        "--provider", provider,
        "-m", model,
        "-Q",
    ]
    result = subprocess.run(
        cmd, capture_output=True, text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(f"hermes exited {result.returncode}: {result.stderr[:500]}")
    return result.stdout.strip()


# ── Image generation ──────────────────────────────────────────────

def generate_image(prompt, aspect_ratio="landscape"):
    """Generate an image via FAL API.
    
    Falls back to Hermes CLI if available and not in CI.
    Returns the image URL.
    """
    if not use_direct_api():
        return _image_via_hermes(prompt, aspect_ratio=aspect_ratio)
    
    return _image_via_fal(prompt, aspect_ratio=aspect_ratio)


def _image_via_fal(prompt, aspect_ratio="landscape"):
    """Direct FAL API call."""
    if not FAL_KEY:
        raise RuntimeError("FAL_KEY not set — required for image generation in CI")
    
    # Map aspect ratio to dimensions
    size_map = {
        "landscape": {"width": 1365, "height": 768},
        "portrait": {"width": 768, "height": 1365},
        "square": {"width": 1024, "height": 1024},
    }
    size = size_map.get(aspect_ratio, size_map["landscape"])
    
    # Submit request
    resp = requests.post(
        f"https://queue.fal.run/{FAL_MODEL}",
        headers={
            "Authorization": f"Key {FAL_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "prompt": prompt,
            "image_size": size,
            "num_images": 1,
            "safety_tolerance": "5",
        },
        timeout=10,
    )
    resp.raise_for_status()
    queue_data = resp.json()
    
    # Poll for result
    request_id = queue_data.get("request_id")
    if not request_id:
        # Synchronous response
        images = queue_data.get("images", [])
        if images:
            return images[0]["url"]
        raise RuntimeError(f"No images in FAL response: {queue_data}")
    
    status_url = f"https://queue.fal.run/{FAL_MODEL}/requests/{request_id}/status"
    result_url = f"https://queue.fal.run/{FAL_MODEL}/requests/{request_id}"
    
    for attempt in range(60):  # 5 min max
        time.sleep(5)
        status_resp = requests.get(
            status_url,
            headers={"Authorization": f"Key {FAL_KEY}"},
            timeout=10,
        )
        status_resp.raise_for_status()
        status = status_resp.json()
        
        if status.get("status") == "COMPLETED":
            result_resp = requests.get(
                result_url,
                headers={"Authorization": f"Key {FAL_KEY}"},
                timeout=10,
            )
            result_resp.raise_for_status()
            result = result_resp.json()
            images = result.get("images", [])
            if images:
                return images[0]["url"]
            raise RuntimeError(f"No images in FAL result: {result}")
        
        if status.get("status") == "FAILED":
            raise RuntimeError(f"FAL generation failed: {status}")
    
    raise RuntimeError("FAL generation timed out after 5 minutes")


def _image_via_hermes(prompt, aspect_ratio="landscape"):
    """Use Hermes CLI to generate image (has image_generate tool)."""
    full_prompt = (
        f"{prompt}\n\n"
        f'Call image_generate with this prompt and aspect_ratio="{aspect_ratio}". '
        f"Respond with ONLY the image URL, nothing else."
    )
    cmd = [HERMES_CLI, "chat", "-q", full_prompt, "-Q"]
    result = subprocess.run(
        cmd, capture_output=True, text=True,
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(f"hermes exited {result.returncode}: {result.stderr[:500]}")
    
    raw = result.stdout.strip()
    # Extract URL from output
    for line in raw.split("\n"):
        line = line.strip()
        if line.startswith("http") and any(ext in line.lower() for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            return line
    
    raise RuntimeError(f"No image URL found in hermes output: {raw[:300]}")


# ── Utilities ─────────────────────────────────────────────────────

def clean_response(text):
    """Strip tool-call artifacts and garbage from model output."""
    for marker in ["<tool_call>", '{"name":', "memory(action="]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx].strip()
    return text.strip()
