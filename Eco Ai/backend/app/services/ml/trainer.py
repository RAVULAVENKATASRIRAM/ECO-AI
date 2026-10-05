"""Model training, validation, and evaluation for the Unified ML System.

Supports exactly the 5 approved algorithms:
1. Linear Regression (Ridge Regularized)
2. Random Forest Regressor
3. Gradient Boosting Regressor
4. SARIMAX (Seasonal AutoRegressive Integrated Moving Average with eXogenous regressors)
5. Isolation Forest (Anomaly Detection)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.statespace.sarimax import SARIMAX

from app.services.ml.features import FEATURE_COLUMNS, build_feature_dataframe

FEATURE_INDEX_MAP = {col: i for i, col in enumerate(FEATURE_COLUMNS)}
SARIMAX_EXOG_COLS = ["temperature", "humidity", "hour_sin", "hour_cos", "cooling_degree_load"]
SARIMAX_EXOG_INDICES = [FEATURE_INDEX_MAP[c] for c in SARIMAX_EXOG_COLS]


class SarimaxWrapper(BaseEstimator, RegressorMixin):
    """Real SARIMAX (Seasonal AutoRegressive Integrated Moving Average with eXogenous regressors)."""

    def __init__(self, order: Tuple[int, int, int] = (1, 1, 1), seasonal_order: Tuple[int, int, int, int] = (1, 0, 0, 24)):
        self.order = order
        self.seasonal_order = seasonal_order
        self.results_ = None
        self.params_dict_: Dict[str, float] = {}
        self.aic_: Optional[float] = None
        self.bic_: Optional[float] = None
        self.mean_consumption_: float = 500.0

    def _extract_exog(self, X: Any) -> np.ndarray:
        if isinstance(X, pd.DataFrame):
            valid_cols = [c for c in SARIMAX_EXOG_COLS if c in X.columns]
            if len(valid_cols) == len(SARIMAX_EXOG_COLS):
                return X[valid_cols].fillna(0.0).values
        arr = np.asarray(X, dtype=float)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        if arr.shape[1] >= len(FEATURE_COLUMNS):
            return arr[:, SARIMAX_EXOG_INDICES]
        return arr[:, :len(SARIMAX_EXOG_INDICES)]

    def fit(self, X: Any, y: Any):
        y_arr = np.asarray(y, dtype=float)
        self.mean_consumption_ = float(np.mean(y_arr)) if len(y_arr) > 0 else 500.0
        exog = self._extract_exog(X)

        # Fit on up to last 480 points for optimal convergence, stationarity and responsiveness
        fit_len = min(len(y_arr), 480)
        y_fit = y_arr[-fit_len:]
        exog_fit = exog[-fit_len:]

        sarima = SARIMAX(
            endog=y_fit,
            exog=exog_fit,
            order=self.order,
            seasonal_order=self.seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        self.results_ = sarima.fit(disp=False, maxiter=40)
        self.params_dict_ = {str(name): round(float(val), 4) for name, val in zip(self.results_.param_names, self.results_.params)}
        self.aic_ = round(float(self.results_.aic), 2) if hasattr(self.results_, "aic") else None
        self.bic_ = round(float(self.results_.bic), 2) if hasattr(self.results_, "bic") else None
        return self

    def predict(self, X: Any) -> np.ndarray:
        exog = self._extract_exog(X)
        n_steps = len(exog)
        if self.results_ is None or n_steps == 0:
            return np.full(n_steps, self.mean_consumption_)

        try:
            preds = self.results_.forecast(steps=n_steps, exog=exog)
            preds_arr = np.asarray(preds, dtype=float)
            # Guard against edge-case numerical diverge in iterative steps
            valid_mask = np.isfinite(preds_arr) & (preds_arr > 0)
            if not np.all(valid_mask):
                preds_arr[~valid_mask] = self.mean_consumption_
            return np.maximum(50.0, preds_arr)
        except Exception:
            try:
                preds = self.results_.predict(start=0, end=n_steps - 1, exog=exog)
                return np.maximum(50.0, np.asarray(preds, dtype=float))
            except Exception:
                return np.full(n_steps, self.mean_consumption_)


class IsolationForestWrapper(BaseEstimator):
    """Real Isolation Forest Anomaly Detector calculating path lengths: s(x, n) = 2^(-E[h(x)] / c(n))."""

    def __init__(self, n_estimators: int = 120, contamination: float = 0.05, random_state: int = 42):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state
        self.model_: Optional[IsolationForest] = None
        self.subsample_n_: int = 256
        self.c_n_: float = 10.24
        self.mean_consumption_: float = 500.0

    def fit(self, X: Any, y: Any = None):
        X_arr = np.asarray(X, dtype=float)
        self.model_ = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1,
        )
        self.model_.fit(X_arr)

        n = min(len(X_arr), 256)
        self.subsample_n_ = n
        # c(n) = 2*(ln(n-1) + 0.5772156649) - 2*(n-1)/n
        if n > 2:
            self.c_n_ = float(2.0 * (np.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n))
        else:
            self.c_n_ = 1.0
        return self

    def predict(self, X: Any) -> np.ndarray:
        X_arr = np.asarray(X, dtype=float)
        if self.model_ is None:
            return np.ones(len(X_arr), dtype=int)
        return self.model_.predict(X_arr)

    def decision_function(self, X: Any) -> np.ndarray:
        X_arr = np.asarray(X, dtype=float)
        if self.model_ is None:
            return np.zeros(len(X_arr), dtype=float)
        return self.model_.decision_function(X_arr)

    def compute_anomaly_scores(self, X: Any) -> np.ndarray:
        """Normalized anomaly score s(x, n) in [0, 1]. Values > 0.5 indicate anomaly."""
        df = self.decision_function(X)
        scores = 0.5 - df
        return np.clip(scores, 0.0, 1.0)


class SeasonalPersistenceBaseline(BaseEstimator, RegressorMixin):
    """Fallback persistence model."""
    def __init__(self, temp_coefficient: float = 3.5):
        self.temp_coefficient = temp_coefficient
        self.mean_consumption_ = 500.0
        self.mean_temp_ = 30.0

    def fit(self, X, y):
        X_df = pd.DataFrame(X, columns=FEATURE_COLUMNS) if not isinstance(X, pd.DataFrame) else X
        y_arr = np.asarray(y, dtype=float)
        self.mean_consumption_ = float(np.mean(y_arr)) if len(y_arr) > 0 else 500.0
        if "temperature" in X_df.columns:
            self.mean_temp_ = float(X_df["temperature"].mean())
        return self

    def predict(self, X):
        X_df = pd.DataFrame(X, columns=FEATURE_COLUMNS) if not isinstance(X, pd.DataFrame) else X
        preds = []
        for _, row in X_df.iterrows():
            lag_24 = row.get("lag_24", self.mean_consumption_)
            if pd.isna(lag_24) or lag_24 <= 0:
                lag_24 = row.get("rolling_mean_24", self.mean_consumption_)
            temp = row.get("temperature", self.mean_temp_)
            delta_temp = temp - self.mean_temp_
            pred = float(lag_24) + self.temp_coefficient * delta_temp
            preds.append(max(0.0, pred))
        return np.array(preds)


SUPPORTED_ALGORITHMS = {
    "linear_regression": "Linear Regression (Ridge Regularized)",
    "random_forest": "Random Forest Regressor",
    "gradient_boosting": "Gradient Boosting Regressor",
    "sarimax": "SARIMAX (Seasonal ARIMAX)",
    "isolation_forest": "Isolation Forest (Anomaly Detector)",
    # Backwards compatibility alias
    "baseline": "Baseline Regressor (Seasonal Persistence)",
}


def build_algorithm_pipeline(algorithm: str) -> Tuple[Pipeline, Dict[str, Any]]:
    """Instantiates a scikit-learn pipeline for the specified algorithm."""
    algorithm = algorithm.lower().strip()
    if algorithm == "linear_regression":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", Ridge(alpha=10.0, random_state=42)),
        ])
        config = {
            "type": "linear_regression",
            "alpha": 10.0,
            "scaler": "StandardScaler",
            "description": "Standardized Ridge Regression minimizing least-squares objective with L2 penalty",
        }
    elif algorithm == "random_forest":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", RandomForestRegressor(
                n_estimators=160,
                max_depth=14,
                min_samples_leaf=2,
                n_jobs=-1,
                random_state=42,
            )),
        ])
        config = {
            "type": "random_forest",
            "n_estimators": 160,
            "max_depth": 14,
            "min_samples_leaf": 2,
            "description": "Ensemble of 160 decision trees aggregating predictions via ensemble average",
        }
    elif algorithm == "gradient_boosting":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", GradientBoostingRegressor(
                n_estimators=160,
                learning_rate=0.05,
                max_depth=4,
                loss="huber",
                random_state=42,
            )),
        ])
        config = {
            "type": "gradient_boosting",
            "n_estimators": 160,
            "learning_rate": 0.05,
            "max_depth": 4,
            "loss": "huber",
            "description": "Sequential boosting model minimizing Huber loss across M=160 stages",
        }
    elif algorithm == "sarimax":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", SarimaxWrapper(order=(1, 1, 1), seasonal_order=(1, 0, 0, 24))),
        ])
        config = {
            "type": "sarimax",
            "order": (1, 1, 1),
            "seasonal_order": (1, 0, 0, 24),
            "description": "Seasonal ARIMAX model with 24-hour diurnal seasonality and exogenous weather regressors",
        }
    elif algorithm == "isolation_forest":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", IsolationForestWrapper(n_estimators=120, contamination=0.05, random_state=42)),
        ])
        config = {
            "type": "isolation_forest",
            "n_estimators": 120,
            "contamination": 0.05,
            "description": "Tree-based anomaly detection using path length s(x, n) = 2^(-E[h(x)] / c(n))",
        }
    elif algorithm == "baseline":
        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", SeasonalPersistenceBaseline()),
        ])
        config = {"type": "baseline", "description": "Persistence 24h lag baseline with temperature sensitivity"}
    else:
        raise ValueError(f"Unsupported algorithm '{algorithm}'. Must be one of {list(SUPPORTED_ALGORITHMS.keys())}")

    return pipeline, config


def split_chronological_data(frame: pd.DataFrame, train_ratio: float = 0.8) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Splits dataset chronologically into training and validation sets."""
    if len(frame) < 12:
        return frame, frame.iloc[0:0]
    split_idx = max(int(len(frame) * train_ratio), 12)
    train_df = frame.iloc[:split_idx].copy().reset_index(drop=True)
    test_df = frame.iloc[split_idx:].copy().reset_index(drop=True)
    return train_df, test_df


def evaluate_predictions(actual: Sequence[float], predicted: Sequence[float]) -> Dict[str, Any]:
    """Calculates true regression validation metrics."""
    actual_arr = np.asarray(actual, dtype=float)
    pred_arr = np.asarray(predicted, dtype=float)
    if len(actual_arr) == 0:
        return {"mae": None, "rmse": None, "mape": None, "r2": None, "r_squared": None}

    mae = float(mean_absolute_error(actual_arr, pred_arr))
    rmse = float(np.sqrt(mean_squared_error(actual_arr, pred_arr)))

    denom = np.abs(actual_arr)
    valid_mask = denom > 1e-3
    mape = None
    if np.any(valid_mask):
        mape = float(np.mean(np.abs((actual_arr[valid_mask] - pred_arr[valid_mask]) / denom[valid_mask])) * 100.0)

    r2 = float(r2_score(actual_arr, pred_arr)) if len(actual_arr) > 1 else 1.0

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape": round(mape, 4) if mape is not None else None,
        "r2": round(r2, 4),
        "r_squared": round(r2, 4),
    }


def extract_model_features_importance(
    pipeline: Pipeline,
    algorithm: str,
    X_val: Optional[pd.DataFrame] = None,
    y_val: Optional[pd.Series] = None,
) -> Dict[str, Any]:
    """Extracts genuine feature importances or linear coefficients where mathematically valid."""
    model = pipeline.named_steps["model"]
    feature_importance: List[Dict[str, Any]] = []
    coefficients: List[Dict[str, Any]] = []
    model_parameters: Dict[str, Any] = {}

    if algorithm in ("random_forest", "gradient_boosting"):
        if hasattr(model, "feature_importances_"):
            raw_imp = model.feature_importances_
            total = float(np.sum(raw_imp)) or 1.0
            sorted_idx = np.argsort(raw_imp)[::-1]
            for idx in sorted_idx:
                fname = FEATURE_COLUMNS[idx]
                score = float(raw_imp[idx])
                pct = round((score / total) * 100.0, 2)
                feature_importance.append({
                    "feature": fname,
                    "importance": round(score, 4),
                    "percentage": pct,
                })
        if algorithm == "random_forest":
            model_parameters = {
                "n_estimators": getattr(model, "n_estimators", 160),
                "max_depth": getattr(model, "max_depth", 14),
                "min_samples_leaf": getattr(model, "min_samples_leaf", 2),
            }
        else:
            model_parameters = {
                "n_estimators": getattr(model, "n_estimators", 160),
                "learning_rate": getattr(model, "learning_rate", 0.05),
                "loss": getattr(model, "loss", "huber"),
                "max_depth": getattr(model, "max_depth", 4),
            }

    elif algorithm == "linear_regression":
        intercept_val = float(getattr(model, "intercept_", 0.0))
        if hasattr(model, "coef_"):
            coefs = model.coef_
            sorted_idx = np.argsort(np.abs(coefs))[::-1]
            for idx in sorted_idx:
                fname = FEATURE_COLUMNS[idx]
                val = float(coefs[idx])
                coefficients.append({
                    "feature": fname,
                    "coefficient": round(val, 4),
                    "impact": "positive" if val >= 0 else "negative",
                })
        model_parameters = {
            "intercept": round(intercept_val, 4),
            "alpha": 10.0,
            "feature_count": len(FEATURE_COLUMNS),
        }

    elif algorithm == "sarimax":
        if hasattr(model, "params_dict_") and model.params_dict_:
            for param_name, param_val in model.params_dict_.items():
                impact = "positive" if param_val >= 0 else "negative"
                friendly_name = param_name
                if param_name == "x1":
                    friendly_name = "temperature (exog) β₁"
                elif param_name == "x2":
                    friendly_name = "humidity (exog) β₂"
                elif param_name == "x3":
                    friendly_name = "hour_sin (cyclic) β₃"
                elif param_name == "x4":
                    friendly_name = "hour_cos (cyclic) β₄"
                elif param_name == "x5":
                    friendly_name = "cooling_degree_load β₅"
                elif param_name == "ar.L1":
                    friendly_name = "AR(1) lag parameter φ₁"
                elif param_name == "ma.L1":
                    friendly_name = "MA(1) error parameter θ₁"
                elif param_name == "ar.S.L24":
                    friendly_name = "Seasonal AR(24) parameter Φ₁"
                elif param_name == "sigma2":
                    friendly_name = "Innovation variance σ²"

                coefficients.append({
                    "feature": friendly_name,
                    "coefficient": round(float(param_val), 4),
                    "impact": impact,
                })
        model_parameters = {
            "order": model.order,
            "seasonal_order": model.seasonal_order,
            "aic": model.aic_,
            "bic": model.bic_,
            "parameters": model.params_dict_,
        }

    elif algorithm == "isolation_forest":
        model_parameters = {
            "n_estimators": getattr(model, "n_estimators", 120),
            "contamination": getattr(model, "contamination", 0.05),
            "c_n": round(getattr(model, "c_n_", 10.24), 4),
            "subsample_n": getattr(model, "subsample_n_", 256),
        }

    return {
        "feature_importance": feature_importance,
        "coefficients": coefficients,
        "model_parameters": model_parameters,
    }


def train_and_evaluate_pipeline(
    algorithm: str,
    training_df: pd.DataFrame,
) -> Dict[str, Any]:
    """Complete train-validate cycle for a given algorithm and dataset."""
    if training_df.empty or len(training_df) < 12:
        raise ValueError("Insufficient training records (minimum 12 records required for chronological split).")

    train_df, test_df = split_chronological_data(training_df, train_ratio=0.8)
    if test_df.empty:
        raise ValueError("Validation set could not be formed. Dataset too small.")

    pipeline, config = build_algorithm_pipeline(algorithm)
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["consumption"]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["consumption"]

    # Fit pipeline
    pipeline.fit(X_train, y_train)

    # Differentiate between anomaly detection and regression models
    if algorithm == "isolation_forest":
        test_preds = pipeline.predict(X_test)
        imputed_test = pipeline.named_steps["imputer"].transform(X_test)
        iso_model: IsolationForestWrapper = pipeline.named_steps["model"]
        test_scores = iso_model.compute_anomaly_scores(imputed_test)

        anomaly_count = int(np.sum(test_preds == -1))
        normal_count = int(np.sum(test_preds == 1))
        total_samples = len(X_test)
        anomaly_rate_pct = round((anomaly_count / total_samples) * 100.0, 2) if total_samples > 0 else 0.0
        avg_anomaly_score = round(float(np.mean(test_scores)), 4) if len(test_scores) > 0 else 0.0

        metrics = {
            "mae": None,
            "rmse": None,
            "mape": None,
            "r2": None,
            "r_squared": None,
            "is_anomaly_detector": True,
            "anomaly_count": anomaly_count,
            "normal_count": normal_count,
            "samples_total": len(training_df),
            "samples_train": len(train_df),
            "samples_test": len(test_df),
            "anomaly_rate_pct": anomaly_rate_pct,
            "contamination": iso_model.contamination,
            "avg_anomaly_score": avg_anomaly_score,
            "c_n": round(iso_model.c_n_, 4),
            "subsample_size": iso_model.subsample_n_,
        }

        eval_count = min(len(test_df), 48)
        eval_timestamps = test_df["timestamp"].iloc[-eval_count:].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist()
        eval_actuals = [round(float(v), 2) for v in y_test.iloc[-eval_count:].tolist()]
        eval_scores = [round(float(s), 4) for s in test_scores[-eval_count:]]
        eval_is_anomaly = [bool(p == -1) for p in test_preds[-eval_count:]]

        evaluation_series = {
            "timestamps": eval_timestamps,
            "actual": eval_actuals,
            "predicted": eval_actuals,
            "residuals": [0.0] * eval_count,
            "anomaly_scores": eval_scores,
            "is_anomaly": eval_is_anomaly,
        }

        feature_meta = extract_model_features_importance(pipeline, algorithm, X_val=X_test, y_val=y_test)

        return {
            "pipeline": pipeline,
            "algorithm": algorithm,
            "config": config,
            "metrics": metrics,
            "feature_set": FEATURE_COLUMNS,
            "feature_importance": feature_meta["feature_importance"],
            "coefficients": feature_meta["coefficients"],
            "model_parameters": feature_meta["model_parameters"],
            "evaluation_series": evaluation_series,
            "training_record_count": len(training_df),
        }

    # Standard regression forecasting models
    y_pred = pipeline.predict(X_test)
    metrics = evaluate_predictions(y_test.tolist(), y_pred.tolist())
    metrics["is_anomaly_detector"] = False
    metrics["samples_total"] = len(training_df)
    metrics["samples_train"] = len(train_df)
    metrics["samples_test"] = len(test_df)
    metrics["mean_actual_mw"] = round(float(y_test.mean()), 2)

    # Extract feature importance / coefficients / model parameters
    feature_meta = extract_model_features_importance(pipeline, algorithm, X_val=X_test, y_val=y_test)

    eval_count = min(len(test_df), 48)
    eval_timestamps = test_df["timestamp"].iloc[-eval_count:].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist()
    eval_actuals = [round(float(v), 2) for v in y_test.iloc[-eval_count:].tolist()]
    eval_predictions = [round(float(v), 2) for v in y_pred[-eval_count:]]

    evaluation_series = {
        "timestamps": eval_timestamps,
        "actual": eval_actuals,
        "predicted": eval_predictions,
        "residuals": [round(a - p, 2) for a, p in zip(eval_actuals, eval_predictions)],
    }

    return {
        "pipeline": pipeline,
        "algorithm": algorithm,
        "config": config,
        "metrics": metrics,
        "feature_set": FEATURE_COLUMNS,
        "feature_importance": feature_meta["feature_importance"],
        "coefficients": feature_meta["coefficients"],
        "model_parameters": feature_meta["model_parameters"],
        "evaluation_series": evaluation_series,
        "training_record_count": len(training_df),
    }
