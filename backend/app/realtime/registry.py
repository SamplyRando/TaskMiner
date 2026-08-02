from app.database.database import SessionLocal
from app.realtime.activity_stream import ActivityStreamBroker
from app.realtime.audit_stream import AuditStreamBroker


activity_stream_broker = ActivityStreamBroker(SessionLocal)
audit_stream_broker = AuditStreamBroker(SessionLocal)
