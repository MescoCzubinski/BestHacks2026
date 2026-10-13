import threading

import numpy as np

import pytest

from app.embedding import BATCH_SIZE, BackendEmbedder


class FakeHttp:
    def __init__(self, fail_health: int = 0) -> None:
        self.fail_health = fail_health
        self.posts: list[list[str]] = []
        self.headers: dict[str, str] = {}

    def get_json(self, url, params=None, headers=None):
        assert url.endswith("/api/health")
        if self.fail_health > 0:
            self.fail_health -= 1
            raise ConnectionError("refused")
        return {"status": "ok"}

    def post_json(self, url, payload, headers=None):
        assert url.endswith("/api/embeddings")
        self.headers = dict(headers or {})
        self.posts.append(payload["texts"])
        return {"dimensions": 2, "vectors": [[float(len(t)), 1.0] for t in payload["texts"]]}


def embedder(http, stop=None, cache_path=None):
    return BackendEmbedder(http, "http://backend:8000/", stop or threading.Event(), cache_path)


def test_embeds_in_batches_keeping_order_without_credentials():
    http = FakeHttp()
    texts = ["a" * (i + 1) for i in range(BATCH_SIZE + 5)]
    out = embedder(http).embed(texts)
    assert out.shape == (len(texts), 2)
    assert [row[0] for row in out] == [float(i + 1) for i in range(len(texts))]
    assert [len(p) for p in http.posts] == [BATCH_SIZE, 5]
    assert http.headers == {}


def test_empty_text_is_replaced_so_the_backend_does_not_reject_the_batch():
    http = FakeHttp()
    embedder(http).embed([""])
    assert http.posts == [["."]]


def test_waits_for_the_backend_health_check(monkeypatch):
    monkeypatch.setattr("app.embedding.READY_POLL_S", 0.0)
    http = FakeHttp(fail_health=2)
    embedder(http).wait_until_ready()
    assert http.fail_health == 0


def test_shutdown_interrupts_the_wait():
    stop = threading.Event()
    stop.set()
    with pytest.raises(InterruptedError):
        embedder(FakeHttp(fail_health=5), stop).wait_until_ready()


def test_vectors_are_float32_to_keep_memory_small():
    out = embedder(FakeHttp()).embed(["a", "bb"])
    assert out.dtype == np.float32


def test_cached_texts_are_not_requested_again(tmp_path, monkeypatch):
    monkeypatch.setattr("app.embedding.BATCH_PAUSE_S", 0.0)
    cache = tmp_path / "embeddings.npz"
    first = FakeHttp()
    a = embedder(first, cache_path=cache).embed(["alpha", "beta"])
    second = FakeHttp()
    b = embedder(second, cache_path=cache).embed(["beta", "gamma", "alpha"])
    assert second.posts == [["gamma"]]
    assert np.array_equal(b[0], a[1]) and np.array_equal(b[2], a[0])


def test_cache_keeps_only_the_texts_of_the_latest_run(tmp_path, monkeypatch):
    monkeypatch.setattr("app.embedding.BATCH_PAUSE_S", 0.0)
    cache = tmp_path / "embeddings.npz"
    embedder(FakeHttp(), cache_path=cache).embed(["alpha", "beta"])
    embedder(FakeHttp(), cache_path=cache).embed(["beta", "gamma"])
    third = FakeHttp()
    embedder(third, cache_path=cache).embed(["alpha"])
    assert third.posts == [["alpha"]]


def test_a_damaged_cache_is_ignored(tmp_path):
    cache = tmp_path / "embeddings.npz"
    cache.write_bytes(b"not a zip")
    http = FakeHttp()
    out = embedder(http, cache_path=cache).embed(["alpha"])
    assert out.shape == (1, 2) and http.posts == [["alpha"]]
