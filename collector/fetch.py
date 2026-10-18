"""Cliente HTTP educado para o ProCyclingStats.

O PCS está atrás do Cloudflare; um cliente com impressão digital TLS de browser
(curl_cffi) passa sem desafio. Pedidos são espaçados para não sobrecarregar o site.
"""
import hashlib
import os
import random
import time
from pathlib import Path

from curl_cffi import requests

BASE = "https://www.procyclingstats.com/"
PROFILES = ["safari", "firefox", "safari17_0", "firefox133"]


class FetchError(RuntimeError):
    pass


class Fetcher:
    def __init__(self, delay=None, cache_dir=None):
        self.delay = float(delay if delay is not None else os.environ.get("PCS_DELAY", "1.2"))
        cache = cache_dir or os.environ.get("PCS_CACHE")
        self.cache = Path(cache) if cache else None
        self._profile = 0
        self._session = requests.Session(impersonate=PROFILES[0])
        self._last = 0.0
        self.count = 0

    def _wait(self):
        gap = self.delay + random.uniform(0, self.delay / 2) - (time.time() - self._last)
        if gap > 0:
            time.sleep(gap)
        self._last = time.time()

    def _rotate(self):
        self._profile = (self._profile + 1) % len(PROFILES)
        self._session = requests.Session(impersonate=PROFILES[self._profile])

    def get(self, path, use_cache=True):
        """Devolve o HTML de `path` (relativo a procyclingstats.com)."""
        url = path if path.startswith("http") else BASE + path.lstrip("/")
        key = None
        if self.cache and use_cache:
            key = self.cache / (hashlib.sha1(url.encode()).hexdigest() + ".html")
            if key.exists():
                return key.read_text()
        last_err = None
        for attempt in range(4):
            self._wait()
            try:
                r = self._session.get(url, timeout=40)
            except Exception as e:  # rede
                last_err = e
                time.sleep(2 ** attempt)
                continue
            self.count += 1
            if r.status_code == 200 and "Just a moment" not in r.text[:3000]:
                if key:
                    self.cache.mkdir(parents=True, exist_ok=True)
                    key.write_text(r.text)
                return r.text
            if r.status_code == 404:
                raise FetchError(f"404 {url}")
            last_err = f"HTTP {r.status_code}"
            self._rotate()
            time.sleep(2 ** attempt)
        raise FetchError(f"{url}: {last_err}")

    def get_bytes(self, url, referer=None, delay=True):
        """Descarrega um ficheiro binário (imagens). O PCS só serve imagens com Referer do próprio site."""
        headers = {"Accept": "image/avif,image/webp,image/*,*/*;q=0.8"}
        if referer:
            headers["Referer"] = referer
        last_err = None
        for attempt in range(3):
            if delay:
                self._wait()
            try:
                r = self._session.get(url, timeout=40, headers=headers)
            except Exception as e:
                last_err = e
                time.sleep(2 ** attempt)
                continue
            self.count += 1
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/"):
                return r.content
            if r.status_code == 404:
                raise FetchError(f"404 {url}")
            last_err = f"HTTP {r.status_code}"
            self._rotate()
            time.sleep(2 ** attempt)
        raise FetchError(f"{url}: {last_err}")
