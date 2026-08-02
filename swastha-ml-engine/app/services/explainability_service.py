"""
SwasthaParivar ML Engine - Decision Tree Explainability Service
===============================================================
Architectural Rationale:
------------------------
Per our explicit clinical mandate, Random Forest serves as our primary classification engine due to its
superior multi-variable accuracy. However, an ensemble of 100+ trees is mathematically opaque to human
doctors. To earn physician trust and satisfy medical compliance, we utilize a companion supervised 
Decision Tree strictly as an EXPLAINABILITY ENGINE.

How This Works Without SHAP or External Bloat:
----------------------------------------------
When an evaluation occurs, this service invokes Scikit-Learn's native `decision_path(X)` matrix on our
trained shallow Decision Tree (max_depth=4). It traverses from the root node down to the terminal leaf node
that triggered the classification. At each branching step, it maps the node's threshold back to the unscaled,
human-readable biological measurement (e.g., Systolic BP in mmHg, Glucose in mg/dL), outputting a crystal
clear diagnostic trail.

Why This Improves SwasthaParivar:
---------------------------------
1. Doctors receive precise medical thresholds explaining WHY an anomaly occurred.
2. Google Gemini ingests this explicit logic path to explain health findings in comforting natural prose
   without improvising or calculating its own unverified diagnostic rules.
"""

import numpy as np
from typing import List, Dict, Any
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler

class DecisionTreeExplainer:
    """
    Traverses a trained Scikit-Learn Decision Tree to export explicit Boolean reasoning paths.
    """

    @staticmethod
    def extract_decision_path(
        dt_model: DecisionTreeClassifier, 
        raw_features_dict: Dict[str, Any],
        scaled_feature_array: np.ndarray,
        feature_names: List[str],
        scaler: StandardScaler = None
    ) -> Dict[str, Any]:
        """
        Walks the active decision branches traversed by a patient's vital telemetry.
        
        Args:
            dt_model: Trained Scikit-Learn DecisionTreeClassifier instance.
            raw_features_dict: Original unscaled patient data (e.g., {'bp_systolic_mean_14d': 146.2}).
            scaled_feature_array: 2D NumPy array scaled via StandardScaler for inference math.
            feature_names: Ordered list of feature column string strings.
            scaler: Optional trained StandardScaler to inverse transform tree node splits back to physical medical units.

        Returns:
            Dictionary containing ordered Boolean decision path strings and a summarized clinical rule.
        """
        if dt_model is None or not hasattr(dt_model, "tree_"):
            # Fallback path if model has not been compiled yet during system boot validation
            return {
                "decisionPath": [
                    "Model artifacts initializing...",
                    "Defaulting clinical evaluation to Symbolic Rules Engine"
                ],
                "summaryRule": "Explainability tree initializing; please execute Phase 4 training pipeline."
            }

        tree_ = dt_model.tree_
        # Extract sparse binary matrix indicating traversed node indices for sample 0
        node_indicator = dt_model.decision_path(scaled_feature_array)
        node_indices = node_indicator.indices  # Sequence of node IDs from root to leaf

        path_steps: List[str] = []
        
        # Determine prediction class for terminal leaf labeling
        pred_class_idx = dt_model.predict(scaled_feature_array)[0]
        class_labels = {0: "LOW_RISK", 1: "MEDIUM_RISK", 2: "HIGH_RISK"}
        predicted_label = class_labels.get(pred_class_idx, "UNKNOWN_RISK")

        for node_id in node_indices:
            # Check if internal decision node (feature index != -2)
            if tree_.feature[node_id] != -2:
                feature_idx = tree_.feature[node_id]
                feature_name = feature_names[feature_idx]
                scaled_threshold = tree_.threshold[node_id]
                patient_val = raw_features_dict.get(feature_name, 0.0)

                # Convert standardized Z-score threshold back to real clinical unit (mmHg, mg/dL, years)
                if scaler and hasattr(scaler, "mean_") and hasattr(scaler, "scale_") and len(scaler.mean_) == len(feature_names):
                    mean = scaler.mean_[feature_idx]
                    scale = scaler.scale_[feature_idx]
                    unscaled_threshold = (scaled_threshold * scale) + mean
                else:
                    unscaled_threshold = scaled_threshold

                # Round numerical display for clean reading
                unscaled_threshold = round(float(unscaled_threshold), 1)
                patient_val_display = round(float(patient_val), 1) if isinstance(patient_val, (int, float)) else patient_val

                # Evaluate which branch the patient took at this specific conditional split
                if scaled_feature_array[0, feature_idx] <= scaled_threshold:
                    operator = "<="
                    condition_str = f"{feature_name} [{patient_val_display}] <= {unscaled_threshold}"
                else:
                    operator = ">"
                    condition_str = f"{feature_name} [{patient_val_display}] > {unscaled_threshold}"

                path_steps.append(condition_str)
            else:
                # Terminal leaf node reached
                path_steps.append(f"OUTCOME_CLASSIFIED: {predicted_label}")

        # Assemble summary string joining conditions with logical arrows for Gemini & Doctor PDF packets
        if len(path_steps) > 1:
            summary_rule = " ➔ ".join(path_steps[:-1]) + f" ➔ [{predicted_label}]"
        else:
            summary_rule = f"Direct algorithmic classification ➔ [{predicted_label}]"

        return {
            "decisionPath": path_steps,
            "summaryRule": summary_rule
        }
