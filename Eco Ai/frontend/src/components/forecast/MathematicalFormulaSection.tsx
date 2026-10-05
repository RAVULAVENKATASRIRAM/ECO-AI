import React from 'react';
import { KaTeXFormula } from '../common/KaTeXFormula';
import type { MLModelRecord } from '../../types';
import {
  Calculator,
  CheckCircle2,
  Clock,
  Play,
  HelpCircle,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  Sliders,
  Check,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface MathematicalFormulaSectionProps {
  selectedAlgo: string;
  activeModel: MLModelRecord | null;
  trainingLoading: boolean;
  onTrainModel: (algoId: string) => void;
}

interface SymbolDefinition {
  symbol: string;
  name: string;
  definition: string;
  unitOrRange?: string;
}

interface AlgorithmFormulaMetadata {
  id: string;
  name: string;
  category: string;
  isAnomalyDetector: boolean;
  primaryFormula: string;
  secondaryFormulaTitle?: string;
  secondaryFormula?: string;
  tertiaryFormulaTitle?: string;
  tertiaryFormula?: string;
  formulaNote: string;
  symbols: SymbolDefinition[];
  howItWorks: string;
  electricityApplication: string;
  workedExample: {
    title: string;
    scenario: string;
    inputs: { name: string; symbol: string; value: string }[];
    steps: { step: string; math: string; explanation: string }[];
    finalResult: string;
    interpretation: string;
  };
}

const ALGORITHM_FORMULAS: Record<string, AlgorithmFormulaMetadata> = {
  linear_regression: {
    id: 'linear_regression',
    name: 'Linear Regression (Ridge Regularized)',
    category: 'Linear Models',
    isAnomalyDetector: false,
    primaryFormula: '\\hat y = \\beta_0 + \\sum_{j=1}^{p} \\beta_j x_j',
    secondaryFormulaTitle: 'Least-Squares Objective (with L2 Ridge Regularization)',
    secondaryFormula: 'J(\\beta) = \\sum_{i=1}^{n} (y_i - \\hat y_i)^2 + \\alpha \\sum_{j=1}^{p} \\beta_j^2',
    formulaNote: 'Models expected electricity consumption as a direct linear combination of ambient weather parameters, time-of-day cyclics, and autoregressive demand lags while penalizing large weights via L2 ridge regularization.',
    symbols: [
      { symbol: '\\hat y', name: 'Predicted Demand', definition: 'The estimated electricity consumption for a specific forecast timestamp.', unitOrRange: 'Megawatts (MW)' },
      { symbol: '\\beta_0', name: 'Intercept Parameter', definition: 'Baseline grid power consumption when all normalized explanatory features equal zero.', unitOrRange: 'Megawatts (MW)' },
      { symbol: '\\beta_j', name: 'Feature Coefficient', definition: 'The marginal rate of change in electricity demand for a 1-unit increase in feature j.', unitOrRange: 'MW / unit' },
      { symbol: 'x_j', name: 'Input Feature Value', definition: 'The value of the j-th predictor (ambient temperature, humidity, lag demand, or cyclic sine/cosine).', unitOrRange: 'Varies' },
      { symbol: 'p', name: 'Feature Dimensionality', definition: 'Total number of engineered features in the model (e.g. 29 features in Eco AI).', unitOrRange: 'p = 29' },
      { symbol: 'J(\\beta)', name: 'Objective Function', definition: 'Sum of squared residual errors plus ridge penalty minimized during training.', unitOrRange: 'Loss value' },
      { symbol: '\\alpha', name: 'Ridge Regularizer', definition: 'L2 shrinkage hyperparameter controlling complexity and preventing collinearity overfitting.', unitOrRange: '\\alpha = 10.0' },
    ],
    howItWorks: 'Standardized Ordinary Least Squares (OLS) solves for the optimal coefficient vector β that minimizes the squared Euclidean distance between actual grid telemetry and predicted loads. The added L2 regularization shrinkage term (Ridge) stabilizes matrix inversion against multicollinear features like consecutive hourly lags and rolling statistics.',
    electricityApplication: 'Directly quantifies thermal sensitivity in Chennai (e.g., each 1°C ambient increase above 28°C escalates citywide HVAC cooling load by ~18-25 MW). Also assigns deterministic weights to 24-hour lag demand and workday schedules.',
    workedExample: {
      title: 'Illustrative Worked Example (Thermal & Lag Demand Calculation)',
      scenario: 'Calculating peak afternoon demand at 14:00 with 34.0°C ambient temperature and 800 MW lag consumption.',
      inputs: [
        { name: 'Baseline Intercept', symbol: '\\beta_0', value: '450.0 MW' },
        { name: 'Ambient Temperature Feature', symbol: 'x_1', value: '34.0 °C' },
        { name: 'Temperature Coefficient', symbol: '\\beta_1', value: '+14.5 MW/°C' },
        { name: '24-hour Lag Consumption', symbol: 'x_2', value: '820.0 MW' },
        { name: 'Lag Consumption Coefficient', symbol: '\\beta_2', value: '+0.45' },
      ],
      steps: [
        {
          step: 'Step 1: Compute Thermal Contribution',
          math: '\\beta_1 x_1 = 14.5 \\times 34.0 = 493.0 \\text{ MW}',
          explanation: 'Cooling escalation due to ambient heat.',
        },
        {
          step: 'Step 2: Compute Historical Lag Contribution',
          math: '\\beta_2 x_2 = 0.45 \\times 820.0 = 369.0 \\text{ MW}',
          explanation: 'Autoregressive inertia carried over from the previous day.',
        },
        {
          step: 'Step 3: Combine with Intercept',
          math: '\\hat y = 450.0 + 493.0 + 369.0 = 1312.0 \\text{ MW}',
          explanation: 'Sum of intercept and weighted features yields expected power.',
        },
      ],
      finalResult: '\\hat y = 1312.0 \\text{ MW}',
      interpretation: 'With an actual observed load of 1330 MW, the squared residual error is (1330 - 1312)² = 324 MW².',
    },
  },

  random_forest: {
    id: 'random_forest',
    name: 'Random Forest Regressor',
    category: 'Tree Ensemble',
    isAnomalyDetector: false,
    primaryFormula: '\\hat y = \\frac{1}{T} \\sum_{t=1}^{T} h_t(x)',
    formulaNote: 'The regression prediction is the ensemble average of the individual tree predictions. Each decision tree is trained on a bootstrap sample of telemetry with randomized feature subsets, dramatically reducing variance without inflating bias.',
    symbols: [
      { symbol: '\\hat y', name: 'Ensemble Prediction', definition: 'Final aggregate forecast calculated as the arithmetic mean of all individual decision trees.', unitOrRange: 'Megawatts (MW)' },
      { symbol: 'T', name: 'Ensemble Size', definition: 'Total number of uncorrelated decision trees grown in the random forest forest (e.g. 160 trees).', unitOrRange: 'T = 160' },
      { symbol: 't', name: 'Tree Index', definition: 'Sequential index identifier for each individual decision tree in the ensemble.', unitOrRange: 't \\in \\{1, \\dots, T\\}' },
      { symbol: 'h_t(x)', name: 'Tree Prediction', definition: 'Output leaf value produced by tree t given the multi-dimensional feature vector x.', unitOrRange: 'Megawatts (MW)' },
      { symbol: 'x', name: 'Feature Vector', definition: 'Input observations encompassing temperature, humidity, hour, day of week, and rolling averages.', unitOrRange: 'x \\in \\mathbb{R}^{29}' },
    ],
    howItWorks: 'Draws T bootstrap subsets from the historical training dataset (bagging). At each node split, only a random subset of m features (typically √p or p/3) is considered. Because individual trees overfit in different directions due to randomization, averaging their outputs cancels out individual variance errors.',
    electricityApplication: 'Effectively captures non-linear thresholds in grid consumption, such as the sharp exponential inflection when ambient heat passes 28°C triggering residential air conditioning, combined with holiday vs. weekday schedule switches.',
    workedExample: {
      title: 'Illustrative Worked Example (Ensemble Tree Aggregation)',
      scenario: 'Ensemble voting from T = 5 representative trees evaluating 19:00 evening peak telemetry.',
      inputs: [
        { name: 'Tree 1 Output', symbol: 'h_1(x)', value: '1180.0 MW' },
        { name: 'Tree 2 Output', symbol: 'h_2(x)', value: '1210.0 MW' },
        { name: 'Tree 3 Output', symbol: 'h_3(x)', value: '1195.0 MW' },
        { name: 'Tree 4 Output', symbol: 'h_4(x)', value: '1225.0 MW' },
        { name: 'Tree 5 Output', symbol: 'h_5(x)', value: '1200.0 MW' },
      ],
      steps: [
        {
          step: 'Step 1: Sum Individual Tree Outputs',
          math: '\\sum_{t=1}^{5} h_t(x) = 1180 + 1210 + 1195 + 1225 + 1200 = 6010.0 \\text{ MW}',
          explanation: 'Sum of leaf predictions across all individual trees.',
        },
        {
          step: 'Step 2: Compute Arithmetic Mean',
          math: '\\hat y = \\frac{1}{5} (6010.0) = 1202.0 \\text{ MW}',
          explanation: 'Divide by total number of trees T = 5 to obtain final ensemble forecast.',
        },
      ],
      finalResult: '\\hat y = 1202.0 \\text{ MW}',
      interpretation: 'Individual tree estimates vary between 1180 MW and 1225 MW (range of 45 MW), but the ensemble average of 1202.0 MW dampens individual tree variance.',
    },
  },

  gradient_boosting: {
    id: 'gradient_boosting',
    name: 'Gradient Boosting Regressor',
    category: 'Boosting Ensemble',
    isAnomalyDetector: false,
    primaryFormula: 'F_M(x) = F_0(x) + \\sum_{m=1}^{M} \\eta h_m(x)',
    secondaryFormulaTitle: 'Stage Residual Target (Negative Gradient of Loss)',
    secondaryFormula: 'r_{im} = -\\left[ \\frac{\\partial L(y_i, F(x_i))}{\\partial F(x_i)} \\right]_{F(x)=F_{m-1}(x)}',
    formulaNote: 'Sequential trees iteratively improve the model by training each new tree hm(x) to fit the pseudo-residuals (negative gradients) of the previous ensemble stage, scaled by learning rate η.',
    symbols: [
      { symbol: 'F_M(x)', name: 'Final Boosted Output', definition: 'The accumulated prediction after M sequential boosting iterations.', unitOrRange: 'Megawatts (MW)' },
      { symbol: 'F_0(x)', name: 'Base Model', definition: 'Initial baseline prediction, typically the empirical mean or median of the training target.', unitOrRange: 'Megawatts (MW)' },
      { symbol: 'M', name: 'Boosting Iterations', definition: 'Total number of sequential decision trees added in the boosting process.', unitOrRange: 'M = 160' },
      { symbol: '\\eta', name: 'Learning Rate (Shrinkage)', definition: 'Step-size shrinkage factor scaling each tree contribution to prevent aggressive overfitting.', unitOrRange: '\\eta = 0.05' },
      { symbol: 'h_m(x)', name: 'Weak Learner Tree', definition: 'Shallow decision tree fitted to negative gradient residuals at stage m.', unitOrRange: 'Residual units' },
      { symbol: 'L(y, F)', name: 'Huber Loss Function', definition: 'Hybrid loss combining squared errors for small deviations with linear loss for outliers.', unitOrRange: 'Loss value' },
    ],
    howItWorks: 'Instead of growing trees independently in parallel, Gradient Boosting grows trees sequentially. Each new tree focuses exclusively on the hardest-to-predict residual errors from all prior trees. By minimizing Huber loss, it resists demand spike outliers while converging toward high precision.',
    electricityApplication: 'Highly effective at tracking acute transition boundaries—such as the rapid 08:00 morning commercial power ramp and sudden weather storm temperature drops that cause rapid cooling load drops.',
    workedExample: {
      title: 'Illustrative Worked Example (Sequential Stage Improvement)',
      scenario: 'Tracking stage progression across initial stages with base forecast F0 = 700 MW and learning rate η = 0.1.',
      inputs: [
        { name: 'Initial Baseline', symbol: 'F_0(x)', value: '700.0 MW' },
        { name: 'Learning Rate', symbol: '\\eta', value: '0.1' },
        { name: 'Stage 1 Tree Residual', symbol: 'h_1(x)', value: '+250.0 MW' },
        { name: 'Stage 2 Tree Residual', symbol: 'h_2(x)', value: '+120.0 MW' },
        { name: 'Stage 3 Tree Residual', symbol: 'h_3(x)', value: '-40.0 MW' },
      ],
      steps: [
        {
          step: 'Stage 1 Update',
          math: 'F_1(x) = 700.0 + 0.1(250.0) = 700.0 + 25.0 = 725.0 \\text{ MW}',
          explanation: 'First tree corrects major under-prediction.',
        },
        {
          step: 'Stage 2 Update',
          math: 'F_2(x) = 725.0 + 0.1(120.0) = 725.0 + 12.0 = 737.0 \\text{ MW}',
          explanation: 'Second tree refines remaining positive residual.',
        },
        {
          step: 'Stage 3 Update',
          math: 'F_3(x) = 737.0 + 0.1(-40.0) = 737.0 - 4.0 = 733.0 \\text{ MW}',
          explanation: 'Third tree corrects slight overshoot.',
        },
      ],
      finalResult: 'F_3(x) = 733.0 \\text{ MW}',
      interpretation: 'Step-by-step corrections incrementally converge toward the true demand without excessive overshoot.',
    },
  },

  sarimax: {
    id: 'sarimax',
    name: 'SARIMAX',
    category: 'Econometric / Time Series',
    isAnomalyDetector: false,
    primaryFormula: '\\phi(B)(1-B)^d y_t = \\beta^\\top x_t + \\theta(B)\\varepsilon_t',
    secondaryFormulaTitle: 'Full Seasonal Specification with Diurnal Period s = 24',
    secondaryFormula: '\\Phi_P(B^s)\\phi_p(B)(1-B)^d(1-B^s)^D y_t = \\beta^\\top x_t + \\Theta_Q(B^s)\\theta_q(B)\\varepsilon_t',
    formulaNote: 'Seasonal AutoRegressive Integrated Moving Average with eXogenous regressors. Explicitly decouples stationary autoregressive dynamics, seasonal diurnal cycles (s=24 hours), moving average error shocks, and external weather regressors.',
    symbols: [
      { symbol: 'y_t', name: 'Observed Load at Hour t', definition: 'The target electricity demand at time t.', unitOrRange: 'Megawatts (MW)' },
      { symbol: 'B', name: 'Backshift (Lag) Operator', definition: 'Lag operator shifting indices back: B^k y_t = y_{t-k}.', unitOrRange: 'Operator' },
      { symbol: 'd, D', name: 'Differencing Orders', definition: 'Degrees of standard and seasonal differencing applied to achieve stationarity.', unitOrRange: 'd = 1, D = 0' },
      { symbol: 's', name: 'Seasonal Period', definition: 'Number of time steps in a complete diurnal season (24 hours per solar day).', unitOrRange: 's = 24' },
      { symbol: '\\phi_p(B)', name: 'Non-seasonal AR Polynomial', definition: '1 - φ₁B - ... - φ_p B^p capturing consecutive hourly auto-correlation.', unitOrRange: 'p = 1' },
      { symbol: '\\Phi_P(B^s)', name: 'Seasonal AR Polynomial', definition: '1 - Φ₁B^s capturing recurring daily correlation across consecutive days.', unitOrRange: 'P = 1, s = 24' },
      { symbol: '\\theta_q(B)', name: 'Moving Average Polynomial', definition: '1 + θ₁B + ... + θ_q B^q modeling persistent shocks from white noise errors.', unitOrRange: 'q = 1' },
      { symbol: '\\beta^\\top x_t', name: 'Exogenous Regressors', definition: 'External factors including temperature, humidity, cooling degree load, and hour cyclic harmonics.', unitOrRange: 'Linear sum in MW' },
      { symbol: '\\varepsilon_t', name: 'Gaussian Innovation', definition: 'Zero-mean white noise disturbance term ε_t ~ N(0, σ²).', unitOrRange: 'Residual MW' },
    ],
    howItWorks: 'Transforms non-stationary electricity load series into a stationary process via differencing, models residual memory through autoregressive and moving-average polynomials, and directly estimates structural regression coefficients β for external weather regressors.',
    electricityApplication: 'Distinguishes structural diurnal 24-hour patterns (office openings, evening household peaks) from atmospheric temperature escalation while tracking error innovations.',
    workedExample: {
      title: 'Illustrative Worked Example (AR(1) with Exogenous Temperature)',
      scenario: 'Forecasting load y_t using AR(1) parameter φ₁ = 0.65, prior demand y_{t-1} = 900 MW, ambient temperature x_t = 33.0°C, and temperature coefficient β = 16.0 MW/°C.',
      inputs: [
        { name: 'Prior Hour Load', symbol: 'y_{t-1}', value: '900.0 MW' },
        { name: 'AR(1) Coefficient', symbol: '\\phi_1', value: '0.65' },
        { name: 'Ambient Temperature', symbol: 'x_t', value: '33.0 °C' },
        { name: 'Temperature Coefficient', symbol: '\\beta', value: '+16.0 MW/°C' },
        { name: 'Base Intercept / Error Shock', symbol: '\\varepsilon_t', value: '0.0 MW' },
      ],
      steps: [
        {
          step: 'Step 1: Autoregressive Memory Term',
          math: '\\phi_1 y_{t-1} = 0.65 \\times 900.0 = 585.0 \\text{ MW}',
          explanation: 'Autoregressive decay from the preceding hour.',
        },
        {
          step: 'Step 2: Exogenous Weather Contribution',
          math: '\\beta x_t = 16.0 \\times 33.0 = 528.0 \\text{ MW}',
          explanation: 'External cooling demand driven by ambient weather.',
        },
        {
          step: 'Step 3: Sum Components',
          math: 'y_t = 585.0 + 528.0 = 1113.0 \\text{ MW}',
          explanation: 'Combining time-series persistence with weather regressor.',
        },
      ],
      finalResult: 'y_t = 1113.0 \\text{ MW}',
      interpretation: 'The SARIMAX structure ensures physical weather dependencies and temporal continuity operate in a unified equation.',
    },
  },

  isolation_forest: {
    id: 'isolation_forest',
    name: 'Isolation Forest',
    category: 'Anomaly Detection',
    isAnomalyDetector: true,
    primaryFormula: 's(x,n) = 2^{-\\frac{\\mathbb{E}[h(x)]}{c(n)}}',
    secondaryFormulaTitle: 'Average BST Path Length Normalization Constant',
    secondaryFormula: 'c(n) = 2 \\left(\\ln(n - 1) + 0.5772156649\\right) - \\frac{2(n - 1)}{n}',
    formulaNote: 'Dedicated Anomaly Detection model (not for ordinary consumption regression). Isolates anomalies by recursively partitioning feature space; unusual observations require significantly fewer splits to isolate and thus exhibit a short path length E[h(x)] and an anomaly score s(x, n) > 0.5.',
    symbols: [
      { symbol: 's(x,n)', name: 'Anomaly Score', definition: 'Bounded score between 0 and 1. Values > 0.5 indicate anomalous observations, while values < 0.5 indicate normal telemetry.', unitOrRange: 's \\in [0, 1]' },
      { symbol: 'h(x)', name: 'Path Length', definition: 'Number of edges traversed from root to leaf node in an isolation tree to isolate observation x.', unitOrRange: 'Integer depth' },
      { symbol: '\\mathbb{E}[h(x)]', name: 'Expected Path Length', definition: 'Average path length across all isolation trees in the ensemble.', unitOrRange: 'Average depth' },
      { symbol: 'c(n)', name: 'BST Normalizing Factor', definition: 'Average path length of unsuccessful search in a Binary Search Tree constructed over n samples.', unitOrRange: 'c(256) \\approx 10.24' },
      { symbol: 'n', name: 'Subsampling Size', definition: 'Number of training samples drawn to build each isolation tree.', unitOrRange: 'n = 256' },
      { symbol: '0.5772156649', name: 'Euler-Mascheroni Constant', definition: 'Mathematical constant γ used in harmonic number approximation for BST depth.', unitOrRange: '\\gamma' },
    ],
    howItWorks: 'Instead of constructing profiles of normal points, Isolation Forest explicitly isolates anomalous instances. Because anomalies are "few and different", they lie in sparse regions of feature space and are isolated close to the root of randomized isolation trees (very short path length).',
    electricityApplication: 'Identifies grid telemetry failures, transformer substation trip events, illegal power siphoning, and severe uncharacteristic spikes that violate expected load-weather profiles.',
    workedExample: {
      title: 'Illustrative Worked Example (Anomaly Path Length Calculation)',
      scenario: 'Evaluating an extreme 2200 MW surge occurring at 03:00 AM under cool weather (n = 256 subsample).',
      inputs: [
        { name: 'Subsample Size', symbol: 'n', value: '256' },
        { name: 'BST Normalizer', symbol: 'c(256)', value: '10.24' },
        { name: 'Anomaly Path Length', symbol: '\\mathbb{E}[h(x_1)]', value: '3.2 (isolates quickly)' },
        { name: 'Normal Path Length', symbol: '\\mathbb{E}[h(x_2)]', value: '11.5 (deep in tree)' },
      ],
      steps: [
        {
          step: 'Case 1: Severe Spike Anomaly (Path Length = 3.2)',
          math: 's(x_1, 256) = 2^{-3.2 / 10.24} = 2^{-0.3125} \\approx 0.805',
          explanation: 'Score 0.805 > 0.5 → Definite Anomaly! Alarm raised for investigation.',
        },
        {
          step: 'Case 2: Normal Baseline Observation (Path Length = 11.5)',
          math: 's(x_2, 256) = 2^{-11.5 / 10.24} = 2^{-1.123} \\approx 0.459',
          explanation: 'Score 0.459 < 0.5 → Normal Telemetry. No alarm triggered.',
        },
      ],
      finalResult: 's(x_{\\text{anomaly}}) = 0.805 \\quad \\text{vs.} \\quad s(x_{\\text{normal}}) = 0.459',
      interpretation: 'The severe spike requires only ~3 random splits to separate from all other records, yielding a high anomaly score s > 0.8.',
    },
  },
};

export const MathematicalFormulaSection: React.FC<MathematicalFormulaSectionProps> = ({
  selectedAlgo,
  activeModel,
  trainingLoading,
  onTrainModel,
}) => {
  const meta = ALGORITHM_FORMULAS[selectedAlgo] || ALGORITHM_FORMULAS.random_forest;
  const isSelectedActive = activeModel?.algorithm === selectedAlgo;
  const modelMetrics = activeModel?.metrics;
  const isAnomaly = meta.isAnomalyDetector;

  // Actual genuine parameters extracted from the trained model record
  const genuineCoeffs = activeModel?.coefficients || [];
  const genuineImportances = activeModel?.feature_importance || [];
  const genuineModelParams = (activeModel as any)?.model_parameters || (activeModel?.metadata as any)?.model_parameters || {};

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl transition-all">
      {/* Header and Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Mathematical Formula Used</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {meta.category}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Formal mathematical formulation, symbol definitions, and theoretical mechanism for <strong className="text-white">{meta.name}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Execution Badge & Run Control */}
        <div className="flex items-center gap-3">
          {isSelectedActive ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Active Model Executing ({activeModel?.version_tag || 'v1'})</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Unrun Selection
              </span>
              <button
                onClick={() => onTrainModel(selectedAlgo)}
                disabled={trainingLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Train & Activate</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Model Anomaly Banner (for Isolation Forest) */}
      {isAnomaly && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Dedicated Anomaly Detection Algorithm:</strong> Isolation Forest identifies abnormal load deviations, sensor drops, and extreme surge events via path-length isolation rather than estimating continuous baseline megawatts.
          </span>
        </div>
      )}

      {/* Primary Mathematical Formula */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Core Formulation
          </span>
          <span className="text-[11px] text-slate-500 font-mono">KaTeX Rendered</span>
        </div>

        <KaTeXFormula math={meta.primaryFormula} block={true} />

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          {meta.formulaNote}
        </p>
      </div>

      {/* Secondary / Objective Formula if applicable */}
      {meta.secondaryFormula && (
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="text-xs font-semibold text-slate-300">
            {meta.secondaryFormulaTitle || 'Objective / Loss Formulation'}
          </div>
          <KaTeXFormula math={meta.secondaryFormula} block={true} />
        </div>
      )}

      {/* Grid of Symbol Definitions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            Definitions of Symbols & Variables
          </h3>
          <span className="text-[11px] text-slate-500">{meta.symbols.length} parameters defined</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meta.symbols.map((sym, idx) => (
            <div
              key={idx}
              className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700/80 transition-all"
            >
              <div className="flex items-center justify-between">
                <KaTeXFormula math={sym.symbol} />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {sym.unitOrRange || 'Parameter'}
                </span>
              </div>
              <div className="text-xs font-bold text-white">{sym.name}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {sym.definition}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Theoretical Mechanism & Grid Application Dual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Layers className="w-4 h-4" />
            <span>How the Algorithm Works</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {meta.howItWorks}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Zap className="w-4 h-4" />
            <span>Application to Electricity & Grid Dynamics</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {meta.electricityApplication}
          </p>
        </div>
      </div>

      {/* Illustrative Worked Numerical Example */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {meta.workedExample.title}
            </h3>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Illustrative Example
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic">
          {meta.workedExample.scenario}
        </p>

        {/* Inputs row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {meta.workedExample.inputs.map((inp, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center space-y-1">
              <div className="text-[10px] text-slate-400 truncate">{inp.name}</div>
              <KaTeXFormula math={inp.symbol} className="text-xs" />
              <div className="text-xs font-mono font-bold text-white">{inp.value}</div>
            </div>
          ))}
        </div>

        {/* Calculation steps */}
        <div className="space-y-2">
          {meta.workedExample.steps.map((st, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-300">{st.step}</div>
              <div className="py-1">
                <KaTeXFormula math={st.math} />
              </div>
              <p className="text-[11px] text-slate-400">{st.explanation}</p>
            </div>
          ))}
        </div>

        {/* Result summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30">
          <div>
            <span className="text-[11px] text-slate-400 block">Example Computed Outcome:</span>
            <div className="mt-0.5">
              <KaTeXFormula math={meta.workedExample.finalResult} className="text-base font-bold text-emerald-400" />
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-md">
            {meta.workedExample.interpretation}
          </p>
        </div>
      </div>

      {/* Actual Model Parameters & Real Execution Results */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Actual Execution Results & Model Parameters
            </h3>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
            isSelectedActive
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isSelectedActive ? 'Live Active Model Run' : 'Unrun Configuration'}
          </span>
        </div>

        {isSelectedActive && activeModel ? (
          <div className="space-y-4">
            {/* Real Metrics Grid */}
            {isAnomaly ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Anomalies Detected</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                    {modelMetrics?.anomaly_count != null ? modelMetrics.anomaly_count.toLocaleString() : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Unusual grid observations</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Anomaly Rate</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">
                    {modelMetrics?.anomaly_rate_pct != null ? `${modelMetrics.anomaly_rate_pct.toFixed(2)}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Test split proportion</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Normal Records</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {modelMetrics?.normal_count != null ? modelMetrics.normal_count.toLocaleString() : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Inlier observations</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">BST Normalizer c(n)</span>
                  <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                    {modelMetrics?.c_n != null ? modelMetrics.c_n.toFixed(2) : '10.24'}
                  </span>
                  <span className="text-[10px] text-slate-500">For n = 256 subsample</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Validation MAE</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {modelMetrics?.mae != null ? `${modelMetrics.mae.toFixed(2)} MW` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Mean absolute deviation</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Validation RMSE</span>
                  <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                    {modelMetrics?.rmse != null ? `${modelMetrics.rmse.toFixed(2)} MW` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Root mean squared error</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Percentage Error (MAPE)</span>
                  <span className="text-xl font-bold font-mono text-violet-400 mt-1 block">
                    {modelMetrics?.mape != null ? `${modelMetrics.mape.toFixed(2)}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Relative accuracy</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Goodness of Fit (R²)</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                    {modelMetrics?.r2 != null ? modelMetrics.r2.toFixed(4) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500">Variance explained</span>
                </div>
              </div>
            )}

            {/* Actual Trained Parameters Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Fitted Parameters & Top Feature Weights:
              </span>
              
              {genuineCoeffs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {genuineCoeffs.slice(0, 8).map((c, i) => (
                    <div key={i} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 truncate block">{c.feature}</span>
                      <span className={`font-mono font-bold ${c.coefficient >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {c.coefficient >= 0 ? `+${c.coefficient.toFixed(3)}` : c.coefficient.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {genuineImportances.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {genuineImportances.slice(0, 4).map((f, i) => (
                    <div key={i} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 truncate block">{f.feature}</span>
                      <span className="font-mono font-bold text-cyan-400">{f.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {isAnomaly && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>Ensemble: <strong>120 Isolation Trees</strong></span>
                  <span>Subsample size: <strong>n = 256</strong></span>
                  <span>Contamination threshold: <strong>5.0%</strong></span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Run this model to see actual results
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The mathematical formula and theoretical principles above are ready. Click the button below to train and activate <strong className="text-slate-200">{meta.name}</strong> on live Chennai telemetry and view its genuine parameters.
              </p>
            </div>
            <button
              onClick={() => onTrainModel(selectedAlgo)}
              disabled={trainingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Train & Activate {meta.name}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
