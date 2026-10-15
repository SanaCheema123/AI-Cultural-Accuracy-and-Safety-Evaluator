import pytest
from pydantic import ValidationError
from app.schemas.domain import AuthRegister,ReviewCreate

def test_registration_validation():
    x=AuthRegister(email="User@Example.com",password="long-password-1",full_name="Test User")
    assert x.email=="user@example.com"
    with pytest.raises(ValidationError):AuthRegister(email="bad",password="short",full_name="X")

def test_review_decisions_are_constrained():
    ReviewCreate(decision="approve")
    with pytest.raises(ValidationError):ReviewCreate(decision="invented")
