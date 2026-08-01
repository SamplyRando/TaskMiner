from app.database.database import SessionLocal
from app.realtime.activity_stream import ActivityStreamBroker


activity_stream_broker = ActivityStreamBroker(SessionLocal)
