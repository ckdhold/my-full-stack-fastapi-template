from sqlmodel import Session, select

from app.models import OncallContact


def seed_oncall(session: Session) -> None:
    existing = session.exec(select(OncallContact)).first()
    if existing:
        return
    defaults = [
        {
            "name": "值班工程师 A",
            "email": "oncall-a@example.com",
            "phone": "13800000001",
            "role": "primary",
            "sort_order": 0,
        },
        {
            "name": "值班工程师 B",
            "email": "oncall-b@example.com",
            "phone": "13800000002",
            "role": "backup",
            "sort_order": 10,
        },
    ]
    for row in defaults:
        session.add(OncallContact(**row))
    session.commit()
