from collections.abc import Generator
import os

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if TEST_DATABASE_URL is None:
    raise pytest.UsageError(
        "TEST_DATABASE_URL is required and must target a dedicated test database."
    )

database_name = make_url(TEST_DATABASE_URL).database
if database_name is None or "test" not in database_name.lower():
    raise pytest.UsageError(
        "TEST_DATABASE_URL must target a database whose name contains 'test'."
    )

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY"] = "taskminer-tests-only-secret-key-at-least-32-characters"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["TASKMINER_LOG_LEVEL"] = "WARNING"

from app.database.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from tests.factories import (  # noqa: E402
    CreatedProject,
    CreatedTask,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    UserFactory,
)


@pytest.fixture(scope="session", autouse=True)
def test_database_schema() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(
    test_database_schema: None,
) -> Generator[None, None, None]:
    del test_database_schema
    _delete_all_rows()
    yield
    _delete_all_rows()


def _delete_all_rows() -> None:
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def user_factory(client: TestClient) -> UserFactory:
    return UserFactory(client)


@pytest.fixture
def project_factory(client: TestClient) -> ProjectFactory:
    return ProjectFactory(client)


@pytest.fixture
def task_factory(client: TestClient) -> TaskFactory:
    return TaskFactory(client)


@pytest.fixture
def user(user_factory: UserFactory) -> RegisteredUser:
    return user_factory.create()


@pytest.fixture
def other_user(user_factory: UserFactory) -> RegisteredUser:
    return user_factory.create()


@pytest.fixture
def project(
    project_factory: ProjectFactory,
    user: RegisteredUser,
) -> CreatedProject:
    return project_factory.create(user)


@pytest.fixture
def task(task_factory: TaskFactory, project: CreatedProject) -> CreatedTask:
    return task_factory.create(project)


@pytest.fixture
def database_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
