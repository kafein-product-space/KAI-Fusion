from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/test-openai-config")
async def test_openai_config(request: Request):
    data = await request.json()
    print("Gelen OpenAI config:", data)
    return {"status": "ok"}
