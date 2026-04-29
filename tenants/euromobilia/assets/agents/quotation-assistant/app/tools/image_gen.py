"""
Image generation tool for photorealistic kitchen environment images.

Primary provider: Google Nano Banana via OpenRouter
Fallback: Pollinations.ai (free, no API key needed)
"""

from __future__ import annotations

import base64
import concurrent.futures
import os
import time
import uuid
import urllib.parse
import traceback

import httpx
from langchain_core.tools import tool

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_BASE_URL

_user_attached_images: list[dict] = []
_immutable_reference: bool = False
_working_image: dict | None = None

IMAGE_MODEL_REGULAR = "google/gemini-2.5-flash-image-preview"
IMAGE_MODEL_HD = "google/gemini-3-pro-image-preview"
STORAGE_BUCKET = "quotation-images"

REPLICATE_API_URL = "https://api.replicate.com/v1/models/stability-ai/sdxl/predictions"
IMG2IMG_PROMPT_STRENGTH = 0.35
IMG2IMG_GUIDANCE_SCALE = 7.5
IMG2IMG_NUM_INFERENCE_STEPS = 40
IMG2IMG_WIDTH = 1344
IMG2IMG_HEIGHT = 768


def set_user_attached_images(images: list[dict]) -> None:
    global _user_attached_images, _working_image
    _user_attached_images = images
    if images and _working_image is not None:
        print("[image_gen] New attachment detected — clearing working image")
        _working_image = None


def get_user_attached_images() -> list[dict]:
    return _user_attached_images


def set_immutable_reference(value: bool) -> None:
    global _immutable_reference
    _immutable_reference = value
    print(f"[image_gen] Immutable reference mode: {value}")


def get_immutable_reference() -> bool:
    return _immutable_reference


def set_working_image(b64: str, mime: str) -> None:
    global _working_image
    _working_image = {"b64": b64, "mime": mime}
    print(f"[image_gen] Working image set ({mime}, ~{len(b64) * 3 // 4 // 1024}KB)")


def get_working_image() -> dict | None:
    return _working_image


def clear_working_image() -> None:
    global _working_image
    if _working_image is not None:
        print("[image_gen] Working image cleared")
    _working_image = None


def _get_image_quality_mode() -> str:
    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        resp = (
            sb.table("app_settings")
            .select("value")
            .eq("key", "image_quality_mode")
            .single()
            .execute()
        )
        val = (resp.data or {}).get("value", "regular")
        if val in ("regular", "always_hd", "hd_pdf_only"):
            return val
    except Exception as e:
        print(f"[image_gen] Failed to read image_quality_mode: {e}")
    return "regular"


def _pick_model(is_final_pdf: bool = False) -> str:
    mode = _get_image_quality_mode()
    if mode == "always_hd":
        return IMAGE_MODEL_HD
    elif mode == "hd_pdf_only" and is_final_pdf:
        return IMAGE_MODEL_HD
    return IMAGE_MODEL_REGULAR


def _download_reference_image(url: str) -> tuple[str, str] | None:
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        if resp.status_code != 200:
            return None
        ct = resp.headers.get("content-type", "image/png").split(";")[0]
        b64 = base64.b64encode(resp.content).decode("ascii")
        return b64, ct
    except Exception as e:
        print(f"[image_gen] Reference image download error: {e}")
        return None


def _generate_with_nano_banana(prompt: str, model: str | None = None, reference_images: list[dict] | None = None) -> tuple[bytes | None, str]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return None, ""
    selected_model = model or IMAGE_MODEL_REGULAR
    url = f"{OPENROUTER_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if reference_images:
        content = []
        for i, ref in enumerate(reference_images):
            label = ref.get("label", f"reference image {i+1}")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{ref['mime']};base64,{ref['b64']}"},
            })
            content.append({"type": "text", "text": f"[Image {i+1}: {label}]"})
        has_previous = any(r.get("label", "").startswith("PREVIOUS") for r in reference_images)
        has_attachments = any(r.get("label", "").startswith("USER") for r in reference_images)
        instruction_parts = []
        if has_previous:
            instruction_parts.append(
                "CRITICAL: The PREVIOUS KITCHEN image is the MASTER REFERENCE. "
                "You MUST reproduce this image EXACTLY — same camera angle, same perspective, "
                "same room geometry, same spatial layout, same furniture positions, same "
                "architectural elements. Do NOT change the viewpoint."
            )
        if has_attachments:
            instruction_parts.append(
                "CRITICAL: The USER ATTACHMENT image(s) are the MASTER REFERENCE. "
                "You MUST replicate the EXACT same room shown in these images. "
                "Only apply the specific modifications described in the text prompt below."
            )
        instruction = " ".join(instruction_parts)
        content.append({
            "type": "text",
            "text": (
                f"{instruction}\n\n"
                f"Apply ONLY the following changes to the reference image (keep everything else identical):\n\n"
                f"{prompt}"
            ),
        })
    else:
        content = prompt

    payload = {
        "model": selected_model,
        "messages": [{"role": "user", "content": content}],
        "modalities": ["image", "text"],
        "image_config": {"aspect_ratio": "16:9", "image_size": "2K"},
        "stream": False,
    }

    try:
        timeout_secs = 180 if selected_model == IMAGE_MODEL_HD else 120
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout_secs)
        if resp.status_code != 200:
            print(f"[image_gen] OpenRouter {selected_model} error {resp.status_code}: {resp.text[:400]}")
            return None, ""
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            return None, ""
        message = choices[0].get("message", {})
        images = message.get("images", [])
        if not images:
            return None, ""
        image_url = images[0].get("image_url", {}).get("url", "")
        if not image_url:
            return None, ""
        if image_url.startswith("data:"):
            header, b64_data = image_url.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            image_bytes = base64.b64decode(b64_data)
            return image_bytes, mime_type
        else:
            img_resp = httpx.get(image_url, timeout=30)
            if img_resp.status_code == 200:
                ct = img_resp.headers.get("content-type", "image/png")
                return img_resp.content, ct
        return None, ""
    except Exception as exc:
        print(f"[image_gen] Nano Banana exception: {exc}")
        traceback.print_exc()
        return None, ""


def _upload_to_supabase(image_bytes: bytes, mime_type: str) -> str | None:
    ext = "png" if "png" in mime_type else "jpg"
    filename = f"q-{uuid.uuid4().hex[:12]}.{ext}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": mime_type,
        "x-upsert": "true",
    }
    try:
        resp = httpx.post(upload_url, content=image_bytes, headers=headers, timeout=30)
        if resp.status_code in (200, 201):
            return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{filename}"
        else:
            print(f"[image_gen] Supabase upload error {resp.status_code}: {resp.text[:200]}")
            return None
    except Exception as exc:
        print(f"[image_gen] Supabase upload exception: {exc}")
        return None


def _pollinations_url(prompt: str, width: int = 1344, height: int = 768) -> str:
    encoded = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true&enhance=true"


@tool
def describe_reference_image() -> str:
    """Analyze the user's attached reference image and produce an EXTREMELY detailed text description."""
    images = get_user_attached_images()
    if not images:
        return (
            "[No reference image found] The user has not attached any image "
            "in this conversation. Proceed with generate_quotation_image using only a text-based visual_description."
        )

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return "[Error] No OPENROUTER_API_KEY available for vision analysis."

    img = images[0]
    data_url = f"data:{img['mime']};base64,{img['b64']}"
    vision_model = "google/gemini-2.0-flash-001"
    url = f"{OPENROUTER_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    analysis_prompt = (
        "You are an expert interior design photographer and spatial analyst. "
        "Analyze the attached kitchen image and produce an EXTREMELY detailed "
        "description of EVERY visual and spatial aspect. Your description will "
        "be used to reproduce this exact scene in a new photorealistic render, "
        "so NOTHING can be omitted.\n\n"
        "Your description MUST be at least 3000 characters long and MUST include "
        "ALL of the following in this exact order:\n\n"
        "1. CAMERA POSITION AND ANGLE (MOST CRITICAL SECTION):\n"
        "   - Exact camera height, position in room, shoot direction\n"
        "   - Lens type, perspective type, vanishing points\n\n"
        "2. ROOM GEOMETRY AND DIMENSIONS\n"
        "3. ARCHITECTURAL ELEMENTS\n"
        "4. CABINET LAYOUT\n"
        "5. COUNTERTOPS AND SURFACES\n"
        "6. APPLIANCES\n"
        "7. LIGHTING\n"
        "8. DECORATIVE ELEMENTS\n"
        "9. COLOR PALETTE\n"
        "10. LEFT/RIGHT FRAME COMPOSITION SUMMARY\n\n"
        "Write in English. Be quantitative. This is a technical specification."
    )

    payload = {
        "model": vision_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": analysis_prompt},
                ],
            }
        ],
        "max_tokens": 4000,
        "temperature": 0.1,
        "stream": False,
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=60)
        if resp.status_code != 200:
            return f"[Error] Vision analysis failed with status {resp.status_code}."
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            return "[Error] Vision LLM returned no response."
        description = choices[0].get("message", {}).get("content", "")
        if len(description) < 500:
            return f"[Warning] Description is shorter than expected ({len(description)} chars). {description}"
        return description
    except Exception as exc:
        print(f"[image_gen] Vision analysis exception: {exc}")
        traceback.print_exc()
        return f"[Error] Vision analysis failed: {exc}"


@tool
def generate_quotation_image(visual_description: str, detailed_scene_description: str = "", is_final_pdf: bool = False, previous_image_url: str = "", attachment_urls: list[str] | None = None) -> str:
    """Generate a photorealistic 16:9 image of a kitchen environment featuring all quoted products."""
    model = _pick_model(is_final_pdf=is_final_pdf)
    immutable = get_immutable_reference()
    user_images = get_user_attached_images()
    working_img = get_working_image()
    has_scene_desc = bool(detailed_scene_description and len(detailed_scene_description) > 100)

    quality_suffix = (
        "Ultra-high quality, 8K resolution, professional architectural visualization. "
        "Natural lighting, magazine-quality composition. No watermarks, no logos, no people."
    )

    composite_layout = (
        "### MANDATORY IMAGE LAYOUT — 5-VIEW COMPOSITE ###\n"
        "Create a SINGLE composite image with 5 panels arranged in 2 rows:\n\n"
        "ROW 1 (top, 3 panels of equal width):\n"
        "  Panel 1 (top-left): FLOOR PLAN (labeled 'PLANTA')\n"
        "  Panel 2 (top-center): BIRD'S EYE VIEW (labeled 'BIRD EYE')\n"
        "  Panel 3 (top-right): FRONT ELEVATION (labeled 'ELEVACIÓN FRONTAL')\n\n"
        "ROW 2 (bottom, 2 panels of equal width):\n"
        "  Panel 4 (bottom-left): ISOMETRIC 3D VIEW (labeled 'ISOMÉTRICA')\n"
        "  Panel 5 (bottom-right): PHOTOREALISTIC HERO RENDER (labeled 'RENDER FOTORREALISTA')\n\n"
        "CRITICAL RULES:\n"
        "- ALL 5 panels must show the EXACT SAME kitchen\n"
        "- Each panel MUST have its label text in a small bar at the top\n"
        "- Panels separated by thin light gray borders\n"
        "- The RENDER FOTORREALISTA panel is the most important\n"
        "- The output is ONE single image containing all 5 views\n"
    )

    if has_scene_desc:
        text_only_prompt = (
            f"{composite_layout}"
            f"### SPATIAL FIDELITY — REPRODUCE THE REFERENCE GEOMETRY ###\n"
            f"=== KITCHEN GEOMETRY ===\n{detailed_scene_description}\n\n"
            f"=== PRODUCTS AND MATERIALS TO SHOW ===\n{visual_description}\n\n{quality_suffix}"
        )
    else:
        text_only_prompt = f"{composite_layout}Kitchen design details:\n{visual_description}\n\n{quality_suffix}"

    quality_label = "HD (Nano Banana Pro)" if model == IMAGE_MODEL_HD else "Nano Banana"

    if immutable and (user_images or working_img) and has_scene_desc:
        if working_img:
            ref_b64 = working_img["b64"]
            ref_mime = working_img["mime"]
            ref_source = "working image (previous render)"
        else:
            ref_b64 = user_images[0]["b64"]
            ref_mime = user_images[0]["mime"]
            ref_source = "user attachment"

        ref_prompt = (
            f"{composite_layout}"
            f"### SPATIAL LAYOUT FROM REFERENCE IMAGE ###\n"
            f"The reference image defines the room layout. Reproduce the same kitchen in all panels.\n\n"
            f"Apply ONLY these modifications:\n{visual_description}\n\n{quality_suffix}"
        )
        ref_images_call1 = [{
            "b64": ref_b64,
            "mime": ref_mime,
            "label": (
                "MASTER REFERENCE — Reproduce this image EXACTLY: same camera angle, same room geometry, "
                "same furniture positions. Only apply the specific modifications described in the text prompt."
            ),
        }]

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_ref = executor.submit(_generate_with_nano_banana, ref_prompt, model, ref_images_call1)
            future_txt = executor.submit(_generate_with_nano_banana, text_only_prompt, model, None)
            img_a_bytes, img_a_mime = future_ref.result()
            img_b_bytes, img_b_mime = future_txt.result()

        if img_a_bytes and img_b_bytes:
            img_a_b64 = base64.b64encode(img_a_bytes).decode("ascii")
            img_b_b64 = base64.b64encode(img_b_bytes).decode("ascii")
            merge_refs = [
                {"b64": ref_b64, "mime": ref_mime, "label": "ORIGINAL PHOTO — GROUND TRUTH spatial reference."},
                {"b64": img_a_b64, "mime": img_a_mime, "label": "IMAGE A — AI render preserving original layout."},
                {"b64": img_b_b64, "mime": img_b_mime, "label": "IMAGE B — High-quality AI render from text description."},
            ]
            merge_prompt = (
                f"{composite_layout}"
                f"Merge three reference images into ONE final composite. "
                f"Use ORIGINAL PHOTO's room structure for all panels. "
                f"Keep furniture positions from IMAGE A. Apply IMAGE B's rendering quality. "
                f"Apply these product/material modifications:\n{visual_description}\n\n{quality_suffix}"
            )
            img_c_bytes, img_c_mime = _generate_with_nano_banana(merge_prompt, model=model, reference_images=merge_refs)
            if img_c_bytes:
                img_c_b64 = base64.b64encode(img_c_bytes).decode("ascii")
                set_working_image(img_c_b64, img_c_mime)
                public_url = _upload_to_supabase(img_c_bytes, img_c_mime)
                if public_url:
                    return f"![Ambiente de Cotización]({public_url})\n\nImagen fotorealista generada con pipeline de 3 pasos ({quality_label})."

        fallback_bytes = img_a_bytes or img_b_bytes
        fallback_mime = img_a_mime if img_a_bytes else img_b_mime
        if fallback_bytes:
            fb_b64 = base64.b64encode(fallback_bytes).decode("ascii")
            set_working_image(fb_b64, fallback_mime)
            public_url = _upload_to_supabase(fallback_bytes, fallback_mime)
            if public_url:
                return f"![Ambiente de Cotización]({public_url})\n\nImagen fotorealista generada con {quality_label}."
    else:
        image_bytes, mime_type = _generate_with_nano_banana(text_only_prompt, model=model, reference_images=None)
        if image_bytes:
            public_url = _upload_to_supabase(image_bytes, mime_type)
            if public_url:
                return f"![Ambiente de Cotización]({public_url})\n\nImagen fotorealista generada con {quality_label}."

    url = _pollinations_url(text_only_prompt)
    return f"![Ambiente de Cotización]({url})\n\nImagen fotorealista generada del ambiente de cocina."
