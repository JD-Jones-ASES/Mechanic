/**
 * The v1 chaining demo (one page, fixed wiring — the full chaining UI is out
 * of scope): a ring-fixed planetary's output shaft IS a shaft in torsion.
 * The bindings go through the real ChainGraph type-checker at runtime, the
 * evaluation order comes from its planner, and every number on both sides is
 * a verified compiled function (invariant 4: no math in the widget).
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import { ChainGraph, type Binding } from "../engines/chain";
import { RelationEngine } from "../engines/relation";
import type { CompiledThing, Fn, VarRecord } from "../engines/types";
import { KnobPanel } from "./KnobPanel";
import { MaterialPicker, pickProperty, type MaterialRow } from "./MaterialPicker";
import { Readouts } from "./Readouts";
import { ValidityBanner } from "./ValidityBanner";

const fnsModules = import.meta.glob("../generated/things/*.fns.ts");

const GEAR_CFG = "ring-fixed";
const SHAFT_CFG = "torque-in";
const BINDINGS: Binding[] = [
  { from: { node: "planetary-gearset", port: "T_out" }, to: { node: "torsion-shaft", port: "T" } },
  { from: { node: "planetary-gearset", port: "omega_c" }, to: { node: "torsion-shaft", port: "omega" } },
];

interface Props {
  gear: CompiledThing;
  shaft: CompiledThing;
  materials: MaterialRow[];
}

function ports(artifact: CompiledThing, cfgId: string) {
  const cfg = artifact.configurations.find((c) => c.id === cfgId)!;
  const port = (s: string) => ({
    dim: artifact.variables[s]!.dim,
    quantity_kind: artifact.variables[s]!.quantity_kind,
  });
  return {
    inputs: Object.fromEntries(cfg.inputs.map((s) => [s, port(s)])),
    outputs: Object.fromEntries(
      cfg.plan.map((p) => [p.target, port(p.target)] as const),
    ),
  };
}

export default function ChainDemo({ gear, shaft, materials }: Props) {
  const [fns, setFns] = useState<Record<string, Record<string, Fn>> | null>(null);
  useEffect(() => {
    Promise.all(
      [gear.thing, shaft.thing].map(async (id) => {
        const m = (await fnsModules[`../generated/things/${id}.fns.ts`]!()) as {
          fns: Record<string, Fn>;
        };
        return [id, m.fns] as const;
      }),
    ).then((pairs) => setFns(Object.fromEntries(pairs)));
  }, [gear.thing, shaft.thing]);

  // the real type-checker wires the demo: if an artifact ever changes shape so
  // this wiring stops being legal, the page fails loudly instead of computing
  const { order, bindings } = useMemo(() => {
    const g = new ChainGraph();
    g.addNode({ id: gear.thing, ...ports(gear, GEAR_CFG) });
    g.addNode({ id: shaft.thing, ...ports(shaft, SHAFT_CFG) });
    const results = BINDINGS.map((b) => ({ b, res: g.connect(b) }));
    const bad = results.find((r) => !r.res.ok);
    if (bad) throw new Error(`chain demo wiring rejected: ${bad.res.reason}`);
    return { order: g.evaluationOrder(), bindings: results.map((r) => r.b) };
  }, [gear, shaft]);

  const gearCfg = gear.configurations.find((c) => c.id === GEAR_CFG)!;
  const shaftCfg = shaft.configurations.find((c) => c.id === SHAFT_CFG)!;
  const shaftFree = shaftCfg.inputs.filter((s) => !bindings.some((b) => b.to.port === s));

  const [gearKnobs, setGearKnobs] = useState<VarRecord>(() =>
    Object.fromEntries(gearCfg.inputs.map((s) => [s, gear.variables[s]!.default])),
  );
  const [shaftKnobs, setShaftKnobs] = useState<VarRecord>(() =>
    Object.fromEntries(shaftFree.map((s) => [s, shaft.variables[s]!.default])),
  );
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>({});
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");

  const result = useMemo(() => {
    if (!fns) return null;
    const engines: Record<string, RelationEngine> = {
      [gear.thing]: new RelationEngine(gear, fns[gear.thing]!),
      [shaft.thing]: new RelationEngine(shaft, fns[shaft.thing]!),
    };
    const mat = materials.find((m) => m.id === materialId);
    const matVals: VarRecord = {};
    if (mat && shaft.material_binding) {
      for (const [sym, key] of Object.entries(shaft.material_binding)) {
        const p = pickProperty(mat, key);
        if (p) matVals[sym] = p.value_si;
      }
    }
    const envs: Record<string, ReturnType<RelationEngine["evaluate"]>> = {};
    for (const id of order) {
      const bound: VarRecord = {};
      for (const b of bindings) {
        if (b.to.node !== id) continue;
        const v = envs[b.from.node]?.values[b.from.port];
        if (v !== undefined) bound[b.to.port] = v;
      }
      const inputs =
        id === gear.thing ? { ...gearKnobs } : { ...shaftKnobs, ...matVals, ...bound };
      envs[id] = engines[id]!.evaluate(id === gear.thing ? GEAR_CFG : SHAFT_CFG, inputs);
    }
    return envs;
  }, [fns, order, bindings, gear, shaft, gearKnobs, shaftKnobs, materials, materialId]);

  const gearRes = result?.[gear.thing];
  const shaftRes = result?.[shaft.thing];
  const unitChange = (s: string, u: string) => setDisplayUnits((d) => ({ ...d, [s]: u }));

  return (
    <section class="chain-demo" data-testid="chain-demo" data-ready={fns ? "true" : "false"}>
      <div class="chain-grid">
        <div class="chain-node">
          <h3>
            {gear.title} <span class="chain-cfg">{gearCfg.label}</span>
          </h3>
          <KnobPanel
            inputs={gearCfg.inputs}
            variables={gear.variables}
            values={gearKnobs}
            displayUnits={displayUnits}
            onChange={(s, v) => setGearKnobs((k) => ({ ...k, [s]: v }))}
            onUnitChange={unitChange}
          />
          <Readouts
            targets={gearCfg.plan.map((p) => p.target)}
            variables={gear.variables}
            values={gearRes?.values ?? {}}
            invalid={gearRes?.invalid ?? true}
            invalidVars={gearRes?.invalidVars ?? []}
            displayUnits={displayUnits}
            onUnitChange={unitChange}
          />
          <ValidityBanner messages={gearRes?.messages ?? []} />
        </div>

        <div class="chain-wires" aria-label="Port bindings between the two widgets">
          {bindings.map((b) => (
            <p class="chain-wire" key={b.to.port}>
              <code>{b.from.port}</code> <span aria-hidden="true">→</span> <code>{b.to.port}</code>
              <span class="chain-ok">type-checked</span>
            </p>
          ))}
        </div>

        <div class="chain-node">
          <h3>
            {shaft.title} <span class="chain-cfg">{shaftCfg.label}</span>
          </h3>
          <MaterialPicker
            materials={materials}
            selectedId={materialId}
            binding={shaft.material_binding ?? {}}
            onSelect={setMaterialId}
          />
          <KnobPanel
            inputs={shaftFree}
            variables={shaft.variables}
            values={shaftKnobs}
            displayUnits={displayUnits}
            onChange={(s, v) => setShaftKnobs((k) => ({ ...k, [s]: v }))}
            onUnitChange={unitChange}
          />
          <Readouts
            targets={shaftCfg.plan.map((p) => p.target)}
            variables={shaft.variables}
            values={shaftRes?.values ?? {}}
            invalid={shaftRes?.invalid ?? true}
            invalidVars={shaftRes?.invalidVars ?? []}
            displayUnits={displayUnits}
            onUnitChange={unitChange}
          />
          <ValidityBanner messages={shaftRes?.messages ?? []} />
        </div>
      </div>
    </section>
  );
}
