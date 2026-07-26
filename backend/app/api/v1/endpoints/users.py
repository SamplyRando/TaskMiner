from fastapi import APIRouter


router = APIRouter()


@router.get("")
def list_users_placeholder() -> dict[str, str]:
    return {"message": "Not implemented yet"}
