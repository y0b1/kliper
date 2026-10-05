import { Check } from "lucide-react";
import { minutes, peso } from "@/lib/money";

export interface PriceBoardPackage {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMin: number;
}

export interface PriceBoardAddOn {
  id: string;
  name: string;
  priceCentavos: number;
  durationMin: number;
}

const radius = (factor: number) => ({ borderRadius: `calc(var(--page-radius) * ${factor})` });

/** "₱150" → the peso sign small, the number large. */
export function Price({ centavos, plus = false }: { centavos: number; plus?: boolean }) {
  const text = peso(centavos).replace("₱", "");
  return (
    <span className="numeral whitespace-nowrap">
      <span className="text-[0.7em] font-semibold">{plus ? "+₱" : "₱"}</span>
      <span className="font-bold">{text}</span>
    </span>
  );
}

/**
 * A barber's cuts and add-ons, as customers pick them on the booking page. Used by
 * the real booking flow and by the demo page's preview, so the two always match.
 */
export function PriceBoard({
  packages,
  addOns,
  packageId,
  addOnIds,
  onPick,
  onToggleAddOn,
}: {
  packages: PriceBoardPackage[];
  addOns: PriceBoardAddOn[];
  packageId: string;
  addOnIds: string[];
  onPick: (id: string) => void;
  onToggleAddOn: (id: string) => void;
}) {
  // Painted on the barber's own board color (walnut by default).
  return (
    <section aria-labelledby="cuts" className="mt-8 px-5 pb-5 pt-4" style={{ ...radius(1), background: "var(--page-ink)", color: "var(--page-on-ink)" }}>
      <h2 id="cuts" className="page-display text-[1.75rem] font-bold">
        Cuts
      </h2>
      <div role="radiogroup" aria-labelledby="cuts" className="mt-2">
        {packages.map((p) => {
          const on = p.id === packageId;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(p.id)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 px-2 py-3 text-left"
              style={{ ...radius(0.5), background: on ? "rgb(255 255 255 / 0.1)" : "transparent" }}
            >
              <span
                aria-hidden
                className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-full border-2"
                style={{ borderColor: on ? "var(--page-accent)" : "currentColor", background: on ? "var(--page-accent)" : "transparent", opacity: on ? 1 : 0.6 }}
              >
                {on && <Check size={12} strokeWidth={3.5} style={{ color: "var(--page-on-accent)" }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-[1.0625rem] font-semibold">{p.name}</span>
                  <span className="leader" />
                  <span className="text-[1.6rem] leading-none">
                    <Price centavos={p.priceCentavos} />
                  </span>
                </span>
                <span className="mt-0.5 block text-sm opacity-80">
                  {minutes(p.durationMin)}
                  {p.description && `. ${p.description}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {addOns.length > 0 && (
        <>
          <h3 className="mt-4 border-t border-current/20 pt-4 font-semibold">Add to it</h3>
          <div className="mt-1">
            {addOns.map((a) => {
              const on = addOnIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleAddOn(a.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 px-2 py-2.5 text-left"
                  style={radius(0.5)}
                >
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 translate-y-1 place-items-center rounded border-2"
                    style={{ borderColor: on ? "var(--page-accent)" : "currentColor", background: on ? "var(--page-accent)" : "transparent", opacity: on ? 1 : 0.6 }}
                  >
                    {on && <Check size={12} strokeWidth={3.5} style={{ color: "var(--page-on-accent)" }} />}
                  </span>
                  <span>{a.name}</span>
                  <span className="text-sm opacity-75">{a.durationMin > 0 ? `${a.durationMin} min` : ""}</span>
                  <span className="leader" />
                  <span className="text-xl leading-none">
                    <Price centavos={a.priceCentavos} plus />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
