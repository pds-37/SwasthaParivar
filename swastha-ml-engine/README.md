# SwasthaParivar Machine Learning Engine (Python FastAPI Microservice)

## Architectural Role & Design Rationale
The `swastha-ml-engine` microservice is a lightweight, low-latency supervised machine learning inference engine designed to natively enrich the **SwasthaParivar Healthcare Ecosystem** without breaking existing Node/Express APIs, MongoDB collections, or frontend workflows.

### Core Architectural Mandate: Neuro-Symbolic Integration
This service adheres to a strict division of responsibilities across our healthcare decision stack:
1. **Random Forest Classifier (Primary Model)**: Consumes multi-variable patient clinical telemetry (vitals, age, BMI, sleep, adherence, chronic conditions) to output an ordinal Risk Tier (`Low Risk / 0`, `Medium Risk / 1`, `High Risk / 2`).
2. **Logistic Regression Estimator (Benchmark Validator)**: Consumes the identical feature vector independently to compute a calibrated, continuous log-odds progression probability ($0.0 \le P \le 1.0$) to benchmark against Random Forest assertions.
3. **Decision Tree Classifier (Explainability Engine)**: Consumes the identical feature vector strictly to traverse its compiled decision nodes and output explicit human-readable Boolean branching rules (e.g., `Age > 60 -> Systolic BP > 140 -> High Risk`) for family physician review.
4. **Symbolic Clinical Rules Engine (External Node Gateway)**: Remains the **absolute, final authority**. If a patient logs acute red-flag keywords (such as crushing chest pain or stroke signs), deterministic regular expression rules in Node immediately trigger emergency overrides regardless of what statistical probability this microservice computes.
5. **Google Gemini (Narrative AI)**: Strictly restricted from performing risk math or improvising diagnostic scoring. Gemini ingests our verified ML outputs via System Instructions purely to translate mathematical findings into empathetic family dialogues.

---

## Technical Justification & Trade-Offs (For Technical Interviews at Google, Microsoft, & Axtria)

### 1. Why Decoupled Python FastAPI over Embedded Node.js ML Execution?
* **Why Chosen**: Python holds the primary scientific ecosystem (`scikit-learn`, `numpy`, `pandas`, `joblib`). FastAPI on Uvicorn provides async ASGI performance with runtime Pydantic type validation.
* **Why Alternatives Rejected**: Compiling JavaScript tree decision libraries or spawning internal Python shell child-processes inside Node/Express forces CPU-intensive matrix operations onto Node's single-threaded event loop (`libuv`). This introduces thread contention, inflating API response latencies for routine user actions and chat streaming.
* **Trade-Offs**: Requires running an independent server container and introduces negligible loopback HTTP network latency ($\sim 2-5\text{ms}$).
* **Architectural Gain**: Achieves clean fault domain isolation, predictable CPU scalability, and prevents out-of-memory V8 heap crashes in our primary Express application servers.

### 2. Why Combine Random Forest + Logistic Regression + Decision Tree?
* **Why Chosen**: Every medical algorithm presents structural blind spots. Random Forest achieves superior multi-class classification accuracy across non-linear vital sign interactions, but functions as a black box with uncalibrated probabilities. Logistic Regression delivers smooth probabilistic calibration ($P$) to assess algorithmic confidence. Decision Trees provide the step-by-step structural logic splits required by doctors to understand *why* an alarm triggered.
* **Why Alternatives Rejected**: Using Random Forest alone leaves physicians blind to logical reasoning; using Decision Trees alone causes severe variance and prediction inaccuracies; using Deep Neural Networks requires massive compute overhead and resists verifiable explanation.
* **Trade-Offs**: Demands coordinating three concurrent model evaluations per inference call and synchronizing training data across three Scikit-Learn estimators.

---

## Scalability & Security Implications
* **Stateless Horizontal Scaling**: The inference router loads immutable Scikit-Learn `.joblib` serialization artifacts into RAM at startup. Zero state is held between requests, enabling instant horizontal auto-scaling without database write locks.
* **Zero-Trust Network Boundary**: The microservice is built to operate strictly within a private Virtual Private Cloud (VPC) network or local loopback interfaces. It does not persist raw Personally Identifiable Information (PII), discarding ephemeral clinical arrays immediately after calculating inference metrics.

---

## Quick Execution Guide
```bash
# 1. Install scientific requirements
pip install -r requirements.txt

# 2. Run real public dataset ingestion & model training script (Executed in Phase 4)
python scripts/train_pipeline.py

# 3. Start high-performance ASGI local production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
