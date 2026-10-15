from io import BytesIO
import uuid

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def png_bytes():
    buffer = BytesIO()
    Image.new("RGB", (256, 256), (240, 220, 180)).save(buffer, "PNG")
    return buffer.getvalue()


def register_session(client: TestClient, prefix: str = "user"):
    email = f"{prefix}.{uuid.uuid4().hex[:8]}@example.test"
    payload = {
        "email": email,
        "password": "Str0ng-Live-Password!",
        "full_name": "Live Test User",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200, response.text
    return response.json()["data"]


def test_health_and_live_evaluation():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["live_ai_configured"] is True

        session = register_session(client, "evaluation")
        headers = {"Authorization": f"Bearer {session['access_token']}"}
        response = client.post(
            "/api/v1/evaluations",
            headers=headers,
            data={
                "prompt": "مجموعة من الأشخاص في سوق تقليدي في مدينة عربية قديمة",
                "evaluation_focus": "balanced",
            },
            files={"image": ("scene.png", png_bytes(), "image/png")},
        )
        assert response.status_code == 200, response.text
        body = response.json()["data"]
        assert body["status"] == "completed"
        assert body["mode"] == "live"
        assert body["model_name"] == "test-live-vision-model"
        assert body["result"]["similarity_score"] > 0


def test_review_and_report_flow():
    with TestClient(app) as client:
        session = register_session(client, "review")
        headers = {"Authorization": f"Bearer {session['access_token']}"}
        evaluation = client.post(
            "/api/v1/evaluations",
            headers=headers,
            data={"prompt": "سوق عربي تقليدي مع عمارة محلية", "evaluation_focus": "balanced"},
            files={"image": ("scene.png", png_bytes(), "image/png")},
        )
        assert evaluation.status_code == 200, evaluation.text
        evaluation_id = evaluation.json()["data"]["id"]

        review = client.post(
            f"/api/v1/evaluations/{evaluation_id}/reviews",
            headers=headers,
            json={
                "decision": "approve",
                "comment": "Reviewed by test",
                "explanation": "Looks consistent with the controlled live-provider response",
                "annotations": [],
            },
        )
        assert review.status_code == 200, review.text

        for fmt in ("json", "csv", "pdf"):
            report = client.post(
                f"/api/v1/reports?evaluation_id={evaluation_id}&format={fmt}",
                headers=headers,
                json={},
            )
            assert report.status_code == 200, report.text
            assert report.json()["data"]["file_url"].endswith(f".{fmt}")


def test_history_filters_and_reviewer_name():
    with TestClient(app) as client:
        session = register_session(client, "history")
        headers = {"Authorization": f"Bearer {session['access_token']}"}
        evaluation = client.post(
            "/api/v1/evaluations",
            headers=headers,
            data={"prompt": "مبنى تراثي في مدينة عربية", "evaluation_focus": "cultural_accuracy"},
            files={"image": ("heritage.png", png_bytes(), "image/png")},
        )
        assert evaluation.status_code == 200, evaluation.text
        data = evaluation.json()["data"]
        evaluation_id = data["id"]
        score = data["result"]["cultural_score"]
        risk = data["result"]["bias_risk"]

        review = client.post(
            f"/api/v1/evaluations/{evaluation_id}/reviews",
            headers=headers,
            json={
                "decision": "confirm",
                "comment": "Filter test review",
                "explanation": "Controlled live-provider review",
                "annotations": [],
            },
        )
        assert review.status_code == 200, review.text

        low = max(0, score - 0.001)
        high = min(1, score + 0.001)
        response = client.get(
            f"/api/v1/evaluations?model=test-live-vision-model&days=7&min_score={low}&max_score={high}&risk={risk}",
            headers=headers,
        )
        assert response.status_code == 200, response.text
        items = response.json()["data"]["items"]
        match = next(item for item in items if item["id"] == evaluation_id)
        assert match["reviewed_by"] == "Live Test User"


def test_register_login_and_preferences():
    with TestClient(app) as client:
        email = f"new.user.{uuid.uuid4().hex[:8]}@example.test"
        payload = {
            "email": email,
            "password": "Str0ng-Live-Password!",
            "full_name": "New User",
            }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 200, response.text
        token = response.json()["data"]["access_token"]

        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200 and me.json()["data"]["email"] == payload["email"]

        preferences = client.patch(
            "/api/v1/auth/me/preferences",
            headers={"Authorization": f"Bearer {token}"},
            json={"theme": "dark", "preferred_language": "ar"},
        )
        assert preferences.status_code == 200, preferences.text
        assert preferences.json()["data"]["preferred_language"] == "ar"
