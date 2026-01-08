import os
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from applique_backend.app import build_app
from applique_backend.core.settings import Settings


@pytest.fixture(scope="session")
def settings() -> Generator[Settings]:
    with patch.dict(os.environ, {}, clear=True):
        yield Settings()


@pytest.fixture(scope="session")
def client(settings: Settings) -> Generator[TestClient]:
    """Returns a test client for endpoint checks."""
    app = build_app(settings=settings)
    with TestClient(app) as client:
        yield client
