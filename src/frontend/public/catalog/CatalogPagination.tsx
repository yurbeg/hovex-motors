import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { classNames } from "../shared/utils";

interface CatalogPaginationProps {
  page: number;
  pageCount: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

function visiblePages(page: number, pageCount: number): number[] {
  const pages = new Set([1, pageCount]);
  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate >= 1 && candidate <= pageCount) pages.add(candidate);
  }
  return [...pages].sort((left, right) => left - right);
}

export function CatalogPagination({
  page,
  pageCount,
  disabled = false,
  onPageChange,
}: CatalogPaginationProps) {
  if (pageCount <= 1) return null;
  const pages = visiblePages(page, pageCount);

  return (
    <nav className="mt-9 flex flex-wrap items-center justify-center gap-2" aria-label="Կատալոգի էջեր">
      <button className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
        <CaretLeft size={17} weight="bold" aria-hidden="true" /> Նախորդ
      </button>
      <div className="flex items-center gap-1.5" role="group" aria-label={`Էջ ${page}՝ ${pageCount}-ից`}>
        {pages.map((item, index) => (
          <span className="contents" key={item}>
            {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1 text-[var(--muted)]" aria-hidden="true">…</span> : null}
            <button
              className={classNames("grid size-11 cursor-pointer place-items-center rounded-[10px] border text-xs font-bold", item === page ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ink)]")}
              type="button"
              disabled={disabled}
              aria-current={item === page ? "page" : undefined}
              aria-label={`Բացել ${item}-րդ էջը`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          </span>
        ))}
      </div>
      <button className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={disabled || page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Հաջորդ <CaretRight size={17} weight="bold" aria-hidden="true" />
      </button>
    </nav>
  );
}
