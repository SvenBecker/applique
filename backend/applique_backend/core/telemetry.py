import logging
import os

from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.openai import OpenAIInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, ConsoleLogRecordExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from pydantic_ai import Agent

from applique_backend.core.settings import OTELExporter, Settings


class UvicornAccessLoggingFilter(logging.Filter):
    def __init__(self, excluded_endpoints: list[str]) -> None:
        """Logging filter to exclude certain endpoints from access logs."""
        super().__init__()
        self.excluded_endpoints = excluded_endpoints

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter out log records for excluded endpoints.

        uvicorn stores the information about the endpoint in args[2] on the record object. At the time of
        writing the record args are: client_addr, method, full_path, http_version, status_code
        (see https://github.com/Kludex/uvicorn/blob/main/uvicorn/logging.py)
        """
        if not record.args or len(record.args) < 3:  # noqa: PLR2004
            return True

        return all(endpoint not in record.args[2] for endpoint in self.excluded_endpoints)


def setup_telemetry(settings: Settings, app: FastAPI) -> None:
    """Telemetry/observability (traces, metrics, logs) initialization.

    Optimized for OpenTelemetry auto-instrumentation via environment variables.
    Standard variables like OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME etc. are respected.
    """
    if settings.otel_enabled:
        os.environ.setdefault("OTEL_SERVICE_NAME", settings.OTEL_SERVICE_NAME)
        _setup_traces(settings.OTEL_TRACES_EXPORTER)
        _setup_metrics(settings.OTEL_METRICS_EXPORTER)
        _setup_logs(settings.OTEL_LOGS_EXPORTER)

        HTTPXClientInstrumentor().instrument()
        OpenAIInstrumentor().instrument()
        FastAPIInstrumentor.instrument_app(
            app,
            excluded_urls=".*/openapi.json,.*/docs,.*/healthz,.*/readyz,.*/static/,.*/metrics",
        )
        Agent.instrument_all()


def _setup_traces(exporter_name: OTELExporter | None) -> None:
    match exporter_name:
        case OTELExporter.OTLP:
            exporter = OTLPSpanExporter()
        case OTELExporter.CONSOLE:
            exporter = ConsoleSpanExporter()
        case None | OTELExporter.NONE:
            return
        case _:
            raise ValueError(f"OTEL_TRACES_EXPORTER={exporter_name} unsupported")

    trace_provider = TracerProvider()
    trace_provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(trace_provider)


def _setup_metrics(exporter_name: OTELExporter | None) -> None:
    match exporter_name:
        case OTELExporter.OTLP:
            exporter = OTLPMetricExporter()
        case OTELExporter.CONSOLE:
            exporter = ConsoleMetricExporter()
        case None | OTELExporter.NONE:
            return
        case _:
            raise ValueError(f"OTEL_METRICS_EXPORTER={exporter_name} unsupported")

    metric_reader = PeriodicExportingMetricReader(exporter)
    meter_provider = MeterProvider(metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)


def _setup_logs(exporter_name: OTELExporter | None) -> None:
    match exporter_name:
        case OTELExporter.OTLP:
            exporter = OTLPLogExporter()
        case OTELExporter.CONSOLE:
            exporter = ConsoleLogRecordExporter()
        case None | OTELExporter.NONE:
            return
        case _:
            raise ValueError(f"OTEL_LOGS_EXPORTER={exporter_name} unsupported")

    logger_provider = LoggerProvider()
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
    set_logger_provider(logger_provider)
    handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)
