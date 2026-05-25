import secrets
import uuid

from sqlmodel import Session, func, select

from app.core.security import get_password_hash, verify_password
from app.models import ApiToken, ApiTokenCreate, ApiTokenPublic, Target


def generate_api_token() -> tuple[str, str, str]:
    plain = f"ump_{secrets.token_urlsafe(32)}"
    return plain, plain[:12], get_password_hash(plain)


def find_token_by_plain(session: Session, token: str) -> ApiToken | None:
    if len(token) < 12:
        return None
    prefix = token[:12]
    candidates = session.exec(
        select(ApiToken).where(ApiToken.token_prefix == prefix, ApiToken.enabled == True)  # noqa: E712
    ).all()
    for row in candidates:
        ok, _ = verify_password(token, row.token_hash)
        if ok:
            return row
    return None


def create_api_token(session: Session, body: ApiTokenCreate) -> tuple[ApiToken, str]:
    target = session.get(Target, body.target_id)
    if not target:
        raise ValueError("Target not found")

    plain, prefix, token_hash = generate_api_token()
    row = ApiToken(
        name=body.name,
        target_id=body.target_id,
        token_prefix=prefix,
        token_hash=token_hash,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row, plain


def token_to_public(session: Session, row: ApiToken) -> ApiTokenPublic:
    target = session.get(Target, row.target_id)
    return ApiTokenPublic(
        **row.model_dump(),
        target_name=target.name if target else None,
    )


def list_api_tokens(
    session: Session, *, skip: int = 0, limit: int = 100
) -> tuple[list[ApiTokenPublic], int]:
    count = session.exec(select(func.count()).select_from(ApiToken)).one()
    rows = session.exec(
        select(ApiToken).order_by(ApiToken.created_at.desc()).offset(skip).limit(limit)  # type: ignore[attr-defined]
    ).all()
    return [token_to_public(session, row) for row in rows], count


def delete_api_token(session: Session, token_id: uuid.UUID) -> bool:
    row = session.get(ApiToken, token_id)
    if not row:
        return False
    session.delete(row)
    session.commit()
    return True
