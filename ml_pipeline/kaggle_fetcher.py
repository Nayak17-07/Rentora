"""Kaggle Dataset Fetcher using local ~/.kaggle/access_token or KAGGLE_API_TOKEN."""

from __future__ import annotations

import os
import urllib.request
import zipfile


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(CURRENT_DIR, "kaggle_cache")


def get_kaggle_token() -> str:
    """Read Kaggle API token from env or ~/.kaggle/access_token (never hardcoded)."""
    env_tok = os.environ.get("KAGGLE_API_TOKEN", "").strip()
    if env_tok:
        return env_tok
    token_path = os.path.expanduser("~/.kaggle/access_token")
    if os.path.exists(token_path):
        with open(token_path, "r", encoding="utf-8") as f:
            tok = f.read().strip()
        if tok:
            return tok
    raise RuntimeError(
        "Kaggle API token not found. Set KAGGLE_API_TOKEN or save it to ~/.kaggle/access_token."
    )


def download_kaggle_dataset(dataset_ref: str, dest_subdir: str | None = None) -> str:
    """Download and unzip a Kaggle dataset into ml_pipeline/kaggle_cache/<subdir>."""
    token = get_kaggle_token()
    subdir = dest_subdir or dataset_ref.replace("/", "__")
    out_dir = os.path.join(CACHE_DIR, subdir)
    os.makedirs(out_dir, exist_ok=True)

    zip_path = os.path.join(out_dir, "dataset.zip")
    url = f"https://www.kaggle.com/api/v1/datasets/download/{dataset_ref}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    print(f"[Kaggle] Downloading {dataset_ref} -> {out_dir}")
    with urllib.request.urlopen(req, timeout=120) as resp, open(zip_path, "wb") as out_f:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out_f.write(chunk)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(out_dir)
    os.remove(zip_path)
    print(f"[Kaggle] Extracted {dataset_ref} to {out_dir}")
    return out_dir


if __name__ == "__main__":
    download_kaggle_dataset("arnabbiswas1/microsoft-azure-predictive-maintenance", "azure_pdm")
    download_kaggle_dataset("muhammadshahidazeem/customer-churn-dataset", "customer_churn")
