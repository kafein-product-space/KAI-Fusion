# Vercel Cron Job için Health Check API endpoint
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
async def health_check():
    """
    Vercel Cron Job için sistem health check görevi
    Her 5 dakikada bir çalışacak
    """
    try:
        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'unknown',
            'status': 'healthy'
        }
        
        # Veritabanı bağlantısını test et
        if db:
            try:
                # Basit bir veritabanı sağlık kontrolü
                stats = await db.get_stats()
                health_status['database'] = 'healthy' if stats else 'error'
            except Exception as e:
                health_status['database'] = 'error'
                health_status['database_error'] = str(e)
        else:
            health_status['database'] = 'unavailable'
        
        return JSONResponse(content=health_status)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)