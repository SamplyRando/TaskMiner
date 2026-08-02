from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.user import UserPreferenceUpdate


class UserPreferenceRepository:
    """Persistence operations for a user's settings."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_or_create(self, user: User) -> UserPreference:
        preference = user.preferences
        if preference is not None:
            return preference

        preference = UserPreference(user_id=user.id)
        self.session.add(preference)
        try:
            self.session.commit()
            self.session.refresh(preference)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return preference

    def update(
        self,
        preference: UserPreference,
        data: UserPreferenceUpdate,
    ) -> UserPreference:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(preference, field, value)
        try:
            self.session.commit()
            self.session.refresh(preference)
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return preference
