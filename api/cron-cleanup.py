# Vercel Cron Job için Cleanup API endpoint
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from backend.app.database import db
from datetime import datetime
import asyncio

app = FastAPI()

@app.post("/")
async def cleanup_old_tasks():
    """
    Vercel Cron Job için eski görevleri temizleme
    Saatte bir çalışacak
    """
    try:
        if not db:
            raise HTTPException(status_code=503, detail="Database not available")
        
        start_time = datetime.utcnow()
        deleted_count = await db.cleanup_old_tasks()
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        result = {
            'deleted_tasks': deleted_count,
            'execution_time': execution_time,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'completed'
        }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)