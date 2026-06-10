/**
 * The generic THING widget island. Driven entirely by the compiled artifact —
 * a THING that "needs" custom widget math indicates a missing engine
 * capability, not a license to hand-roll (invariant 4).
 *
 * Islands receive only serializable props; the generated fns module is
 * lazy-loaded by thing id via import.meta.glob.
 */
import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { RelationEngine } from "../engines/relation";
import type { CompiledThing, Fn, VarRecord } from "../engines/types";
import { KnobPanel } from "./KnobPanel";
import { MaterialPicker, pickProperty, type MaterialRow } from "./MaterialPicker";
import { Readouts } from "./Readouts";
import { ValidityBanner } from "./ValidityBanner";
import { BeamSim } from "./sims/BeamSim";
import { ColumnSim } from "./sims/ColumnSim";
import { CylinderSim } from "./sims/CylinderSim";
import { FlywheelSim } from "./sims/FlywheelSim";
import { FourbarSim } from "./sims/FourbarSim";
import { PlanetarySim } from "./sims/PlanetarySim";
import { ShaftSim } from "./sims/ShaftSim";
import { VesselSim } from "./sims/VesselSim";

const fnsModules = import.meta.glob("../generated/things/*.fns.ts");
// Sims receive the engine's refusal verdict alongside the values: `invalid`
// is the ONLY authoritative signal (a refusal can leave values omitted,
// present-as-NaN, or fully finite when a validity predicate fires) — sims
// must not draw a confident figure from a state the engine refused.
const SIMS: Record<string, (p: { values: VarRecord; invalid?: boolean }) => JSX.Element> = {
  planetary: PlanetarySim,
  "cantilever-beam": BeamSim,
  "pressure-vessel": VesselSim,
  "torsion-shaft": ShaftSim,
  "euler-column": ColumnSim,
  fourbar: FourbarSim,
  "flywheel-disk": FlywheelSim,
  "thick-walled-cylinder": CylinderSim,
};

interface Props {
  artifact: CompiledThing;
  materials: MaterialRow[];
  sim: { engine: string; config: Record<string, unknown> } | null;
}

export default function ThingWidget({ artifact, materials, sim }: Props) {
  const [fns, setFns] = useState<Record<string, Fn> | null>(null);
  useEffect(() => {
    const key = `../generated/things/${artifact.thing}.fns.ts`;
    fnsModules[key]?.().then((m) => setFns(() => (m as { fns: Record<string, Fn> }).fns));
  }, [artifact.thing]);

  const [cfgId, setCfgId] = useState(artifact.configurations[0]!.id);
  const cfg = artifact.configurations.find((c) => c.id === cfgId)!;

  const defaultsFor = (id: string): VarRecord => {
    const c = artifact.configurations.find((x) => x.id === id)!;
    return Object.fromEntries(c.inputs.map((s) => [s, artifact.variables[s]!.default]));
  };
  const [knobs, setKnobs] = useState<VarRecord>(() => defaultsFor(cfgId));
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>({});
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [branch, setBranch] = useState<string | undefined>(undefined);
  const activeBranch = cfg.branches ? (branch ?? cfg.branches.labels[0]) : undefined;

  const switchConfig = (id: string) => {
    setCfgId(id);
    setKnobs(defaultsFor(id));
    setBranch(undefined);
  };

  const materialValues = useMemo((): VarRecord => {
    if (!artifact.material_binding) return {};
    const m = materials.find((x) => x.id === materialId);
    if (!m) return {};
    const out: VarRecord = {};
    for (const [sym, key] of Object.entries(artifact.material_binding)) {
      const p = pickProperty(m, key);
      if (p) out[sym] = p.value_si;
    }
    return out;
  }, [artifact.material_binding, materials, materialId]);

  const result = useMemo(() => {
    if (!fns) return null;
    const engine = new RelationEngine(artifact, fns);
    return engine.evaluate(cfgId, { ...knobs, ...materialValues }, activeBranch);
  }, [fns, artifact, cfgId, knobs, materialValues, activeBranch]);

  const targets = cfg.plan.map((s) => s.target);
  const SimComponent = sim?.config?.draw ? SIMS[String(sim.config.draw)] : undefined;

  return (
    <section class="thing-widget" data-testid="thing-widget" data-ready={fns ? "true" : "false"}>
      {artifact.configurations.length > 1 ? (
        <label class="config-select">
          Configuration{" "}
          <select
            data-testid="config-select"
            value={cfgId}
            onInput={(e) => switchConfig(e.currentTarget.value)}
          >
            {artifact.configurations.map((c) => (
              <option value={c.id} key={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {cfg.branches ? (
        <label class="branch-select">
          {cfg.branches.selector}{" "}
          <select
            data-testid="branch-select"
            value={activeBranch}
            onInput={(e) => setBranch(e.currentTarget.value)}
          >
            {cfg.branches.labels.map((l) => (
              <option value={l} key={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {artifact.material_binding && materials.length ? (
        <MaterialPicker
          materials={materials}
          selectedId={materialId}
          binding={artifact.material_binding}
          onSelect={setMaterialId}
        />
      ) : null}

      <div class="widget-grid">
        <KnobPanel
          inputs={cfg.inputs}
          variables={artifact.variables}
          values={knobs}
          displayUnits={displayUnits}
          onChange={(sym, si) => setKnobs((k) => ({ ...k, [sym]: si }))}
          onUnitChange={(sym, u) => setDisplayUnits((d) => ({ ...d, [sym]: u }))}
        />
        <div>
          <Readouts
            targets={targets}
            variables={artifact.variables}
            values={result?.values ?? {}}
            invalid={result?.invalid ?? true}
            displayUnits={displayUnits}
            onUnitChange={(sym, u) => setDisplayUnits((d) => ({ ...d, [sym]: u }))}
          />
          <ValidityBanner messages={result?.messages ?? []} />
        </div>
      </div>

      {SimComponent && result ? (
        <SimComponent values={{ ...result.values }} invalid={result.invalid} />
      ) : null}
    </section>
  );
}
