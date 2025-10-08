from prometheus_client import Counter, Histogram

rituals_total = Counter("forge_rituals_total", "Total rituals executed", ["name", "status"])
steps_total = Counter("forge_steps_total", "Total ritual steps", ["ritual", "step", "status"])
latency = Histogram("forge_ritual_latency_seconds", "Ritual execution latency", ["name"])
