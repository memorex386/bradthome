# The guard's monthly cost

At list prices on 2026-11-04, before any free tier, in us-central1. The free tier would likely cover the runs and the image, but the billing account shares it with other projects, so SC-003 doesn't count on it.

- notices assumed: 72 a day, 2,232 a month. Google says notices come "multiple times per day", so this is a high estimate.
- billed time per run: 8 s, the slowest cold start seen (2 to 7 s). Warm runs took under 10 ms.
- CPU: 2,232 × 8 s × 0.1666 vCPU = 2,975 vCPU-s × $0.000024 = $0.0714
- memory: 2,232 × 8 s × 0.25 GiB = 4,464 GiB-s × $0.0000025 = $0.0112
- requests: 2,232 × $0.40 a million = $0.0009
- Pub/Sub: a few KB a month, under $0.0001
- image storage: 110 MB in `gcf-artifacts` × $0.10 a GB-month = $0.0110, with images older than a day deleted
- alert condition: $0.10 a month, Google's price from 2026-05-01
- monthly total at list prices in dollars: 0.1946

Sources, checked on 2026-11-04: [Cloud Run pricing](https://cloud.google.com/run/pricing), [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing), [Google Cloud Observability pricing](https://cloud.google.com/monitoring/pricing).
