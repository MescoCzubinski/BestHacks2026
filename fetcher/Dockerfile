# syntax=docker/dockerfile:1

# One base for both stages, pinned by digest so a rebuild is reproducible.
ARG PYTHON_IMAGE=python:3.13-slim@sha256:70729b46c69b4f1e97c4822c1af3df53a1476cf5ddc6c087c0c10bc3a5678c2f

FROM ${PYTHON_IMAGE} AS build
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_COMPILE=1
# A venv without pip: the runtime image never needs an installer.
RUN python -m venv --without-pip /venv
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip --python /venv/bin/python install -r requirements.txt \
 && find /venv -type d \( -name __pycache__ -o -name tests \) -prune -exec rm -rf {} + \
 && find /venv -name "*.pyc" -delete

FROM ${PYTHON_IMAGE} AS runtime
LABEL org.opencontainers.image.title="besthacks-fetcher" \
      org.opencontainers.image.description="Heritage data worker: fetch, merge, tag, store"
ENV PATH="/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONFAULTHANDLER=1 \
    CACHE_DIR=/cache \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    MALLOC_ARENA_MAX=2
# Fixed non-root user, no login shell, no home; /cache is the only writable path (a volume).
RUN groupadd --system --gid 10001 fetcher \
 && useradd --system --uid 10001 --gid fetcher --no-create-home --shell /usr/sbin/nologin fetcher \
 && mkdir /cache && chown fetcher:fetcher /cache
COPY --from=build /venv /venv
WORKDIR /srv
COPY app ./app
USER fetcher
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"]
CMD ["python", "-m", "app.main"]
