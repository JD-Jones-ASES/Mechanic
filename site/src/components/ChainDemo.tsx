/**
 * The v1 chaining demo (one page, fixed wiring — the full chaining UI is out
 * of scope): a ring-fixed planetary's output shaft IS a shaft in torsion.
 * Orchestration lives in the headless `chain-eval` engine (S21): this component
 * only resolves the shaft's material to SI values (the UI layer's job), hands
 * the two nodes + bindings to `evaluateChain`, and renders its records. The
 * bindings go through the real ChainGraph type-checker inside the engine, the
 * evaluation order comes from its planner, refusals propagate per the engine's
 * decided rule table, and every number is a verified compiled function
 * (invariant 4: no math in the widget).
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import type { Binding } from "../engines/chain";
import { evaluateChain, planTargets } from "../engines/chain-eval";
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

  const gearCfg = gear.configurations.find((c) => c.id === GEAR_CFG)!;
  const shaftCfg = shaft.configurations.find((c) => c.id === SHAFT_CFG)!;
  const shaftFree = shaftCfg.inputs.filter((s) => !BINDINGS.some((b) => b.to.port === s));

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
    // Resolve the shaft's single material slot to SI values HERE (the UI layer
    // owns MaterialRow -> VarRecord); the engine stays headless (S21 boundary).
    // The demo wires a single-material THING (one `default` binding slot);
    // multi-slot node support is deferred (S17 THINGs are excluded from chaining,
    // not supported). It does not yet honor R7 `material_defaults` either — the
    // picker lands on the qualifying list's first entry; wiring landing materials
    // through a chain is later chain-builder work.
    const mat = materials.find((m) => m.id === materialId);
    const shaftBinds = shaft.material_binding?.default ?? {};
    const materialValues: VarRecord = {};
    if (mat) {
      for (const [sym, key] of Object.entries(shaftBinds)) {
        const p = pickProperty(mat, key);
        if (p) materialValues[sym] = p.value_si;
      }
    }
    return evaluateChain(
      [
        { instanceId: gear.thing, artifact: gear, configId: GEAR_CFG, fns: fns[gear.thing]!, knobs: gearKnobs },
        { instanceId: shaft.thing, artifact: shaft, configId: SHAFT_CFG, fns: fns[shaft.thing]!, knobs: shaftKnobs, materialValues },
      ],
      BINDINGS,
    );
  }, [fns, gear, shaft, gearKnobs, shaftKnobs, materials, materialId]);

  const gearRes = result?.nodes[gear.thing]?.result;
  const shaftRes = result?.nodes[shaft.thing]?.result;
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
            targets={planTargets(gearCfg.plan)}
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
          {BINDINGS.map((b) => (
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
            binding={shaft.material_binding?.default ?? {}}
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
            targets={planTargets(shaftCfg.plan)}
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
