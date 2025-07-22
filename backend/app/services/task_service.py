from celery import Celery
from app.core.constants import CELERY_BROKER_URL, CELERY_RESULT_BACKEND

class TaskService:
    def __init__(self):
        """
        Service for interacting with Celery tasks.
        """
        self.celery_app = Celery(
            "worker",
            broker=CELERY_BROKER_URL,
            backend=CELERY_RESULT_BACKEND
        )

    def get_task_status(self, task_id: str):
        """
        Get the status of a Celery task by its ID.
        """
        result = self.celery_app.AsyncResult(task_id)
        return {"task_id": task_id, "status": result.status, "result": result.result} 