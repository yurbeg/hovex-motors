import { House, ListMagnifyingGlass, Phone } from "@phosphor-icons/react";
import { phoneHref } from "../shared/utils";

export function CatalogMobileActionBar({ detail = false }: { detail?: boolean }) {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 hidden min-h-[calc(67px_+_env(safe-area-inset-bottom))] grid-cols-3 gap-2 border-t border-[var(--border)] bg-[rgba(255,255,255,0.97)] px-2.5 pt-2 pb-[calc(8px_+_env(safe-area-inset-bottom))] max-[800px]:grid [&_a]:flex [&_a]:min-w-0 [&_a]:items-center [&_a]:justify-center [&_a]:gap-[5px] [&_a]:rounded-[10px] [&_a]:border [&_a]:border-[var(--border)] [&_a]:bg-white [&_a]:text-[9px] [&_a]:font-bold [&_a]:whitespace-nowrap [&_a:first-child]:border-[var(--yellow)] [&_a:first-child]:bg-[var(--yellow)] [&_a:nth-child(2)]:border-[var(--ink)] [&_a:nth-child(2)]:bg-[var(--ink)] [&_a:nth-child(2)]:text-white" aria-label="Շարժական արագ գործողություններ">
      <a href="/"><House size={19} weight="bold" aria-hidden="true" />Գլխավոր</a>
      <a href={detail ? "/catalog" : "#catalog-filters"}><ListMagnifyingGlass size={19} weight="bold" aria-hidden="true" />{detail ? "Կատալոգ" : "Ֆիլտրեր"}</a>
      <a href={`tel:${phoneHref}`}><Phone size={19} weight="fill" aria-hidden="true" />Զանգահարել</a>
    </nav>
  );
}
