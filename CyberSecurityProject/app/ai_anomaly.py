# app/ai_anomaly.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable, List, Optional
import os

import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import IsolationForest

# ✅ מודל Embeddings מ-Hugging Face (דרך sentence-transformers)
HF_MODEL_NAME = os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "app/ai_models")
os.makedirs(MODEL_DIR, exist_ok=True)

IF_PATH = os.path.join(MODEL_DIR, "isoforest.joblib")

@dataclass
class AnomalyResult:
    score: float          # higher = more anomalous
    is_anomaly: bool

class LogAnomalyDetector:
    def __init__(self):
        # יורד בפעם הראשונה אוטומטית מה-Hugging Face
        self.embedder = SentenceTransformer(HF_MODEL_NAME)
        self.model: Optional[IsolationForest] = None

    def _embed(self, texts: List[str]) -> np.ndarray:
        emb = self.embedder.encode(texts, normalize_embeddings=True)
        return np.array(emb, dtype=np.float32)

    def train(self, normal_texts: List[str], contamination: float = 0.02):
        """
        Train on "mostly normal" logs.
        contamination ~ אחוז חריגות צפוי בנתונים.
        """
        X = self._embed(normal_texts)
        self.model = IsolationForest(
            n_estimators=250,
            contamination=contamination,
            random_state=42
        )
        self.model.fit(X)
        joblib.dump(self.model, IF_PATH)

    def load(self) -> bool:
        if os.path.exists(IF_PATH):
            self.model = joblib.load(IF_PATH)
            return True
        return False

    def score_one(self, text: str, threshold: float = 0.65) -> AnomalyResult:
        """
        IsolationForest נותן decision_function: ערך גבוה = "יותר נורמלי".
        אנחנו הופכים לציון חריגות: score גבוה = "יותר חריג".
        """
        if not self.model:
            # אם אין מודל מאומן עדיין – לא מסמנים חריג
            return AnomalyResult(score=0.0, is_anomaly=False)

        X = self._embed([text])
        normality = float(self.model.decision_function(X)[0])  # higher = normal
        # map to anomaly score [0..1] (פשוט)
        score = 1.0 / (1.0 + np.exp(3.0 * normality))  # sigmoid-ish
        return AnomalyResult(score=score, is_anomaly=score >= threshold)
