from app.core.rbac import has_permission
from app.core.security import hash_password,verify_password,create_token,decode_token

def test_password_hash_roundtrip():
    h=hash_password("VerySecurePassword123!")
    assert "VerySecurePassword123!" not in h
    assert verify_password("VerySecurePassword123!",h)
    assert not verify_password("wrong",h)

def test_token_roundtrip():
    t=create_token("123","access",{"workspace_id":"456","role":"owner"})
    p=decode_token(t,"access")
    assert p["sub"]=="123" and p["workspace_id"]=="456"

def test_permission_matrix():
    assert has_permission("owner","billing:view")
    assert has_permission("reviewer","review:create")
    assert not has_permission("viewer","evaluation:create")
