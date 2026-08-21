"use client";

import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate, type Translated } from "@/db/schema/i18n";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import {
  createTaxonomyItemAction,
  moveTaxonomyItemAction,
  setTaxonomyActiveAction,
  updateTaxonomyItemAction,
} from "@/lib/taxonomy/actions";
import { METRIC_KINDS, type MetricKind, type TaxonomyDef } from "@/lib/taxonomy/config";
import { slugify } from "@/lib/taxonomy/slug";
import { TAXONOMY_IDLE, type TaxonomyErrorCopy } from "@/lib/taxonomy/types";
import { cn } from "@/lib/utils";

export type EditorItem = {
  id: string;
  slug: string;
  name: Translated;
  isActive: boolean;
  parentId: string | null;
  metrics: MetricKind[];
};

export type TaxonomyEditorCopy = {
  add: string;
  addTitle: string;
  editTitle: string;
  search: string;
  filterAll: string;
  filterActive: string;
  filterRetired: string;
  empty: string;
  emptyFiltered: string;
  nameLabel: string;
  nameHint: string;
  slug: string;
  slugHint: string;
  slugLocked: string;
  parent: string;
  parentNone: string;
  metrics: string;
  metricsHint: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  retire: string;
  restore: string;
  moveUp: string;
  moveDown: string;
  retired: string;
  reorderOff: string;
};

type Filter = "all" | "active" | "retired";

/** One rendered line: the item plus where it sits among its siblings. */
type Row = {
  item: EditorItem;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
};

export function TaxonomyEditor({
  taxonomy,
  items,
  lang,
  copy,
  errors,
  metricLabels,
}: {
  taxonomy: TaxonomyDef;
  items: EditorItem[];
  lang: Locale;
  copy: TaxonomyEditorCopy;
  errors: TaxonomyErrorCopy;
  metricLabels: Record<MetricKind, string>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return items.filter((item) => {
      if (filter === "active" && !item.isActive) return false;
      if (filter === "retired" && item.isActive) return false;
      if (!term) return true;

      const haystack = [item.slug, ...Object.values(item.name)].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [items, filter, term]);

  // Reordering a list you are looking at through a filter moves rows you cannot
  // see, so the arrows switch off while anything is filtered.
  const reorderable = !term && filter === "all";

  const rows = useMemo(
    () => (taxonomy.hasParent && reorderable ? tree(matches) : flat(matches)),
    [matches, taxonomy.hasParent, reorderable],
  );


  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            aria-label={copy.search}
            className={cn(fieldControl, "h-11 pl-10 text-[14px]")}
          />
        </div>

        <div className="flex rounded-control border border-white/10 bg-white/4 p-1">
          {(
            [
              ["all", copy.filterAll],
              ["active", copy.filterActive],
              ["retired", copy.filterRetired],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors",
                filter === value
                  ? "bg-brand-500/18 text-brand-100"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingId(null);
            setCreating((open) => !open);
          }}
        >
          <Plus className="size-4" />
          {copy.add}
        </Button>
      </div>

      {creating ? (
        <ItemForm
          taxonomy={taxonomy}
          item={null}
          all={items}
          lang={lang}
          copy={copy}
          errors={errors}
          metricLabels={metricLabels}
          onDone={() => setCreating(false)}
        />
      ) : null}

      {!reorderable ? (
        <p className="text-[12px] text-ink-500">{copy.reorderOff}</p>
      ) : null}

      <Surface tone="bare" className="divide-y divide-white/6">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-ink-400">
            {items.length === 0 ? copy.empty : copy.emptyFiltered}
          </p>
        ) : (
          rows.map((row) =>
            editingId === row.item.id ? (
              <div key={row.item.id} className="p-3">
                <ItemForm
                  taxonomy={taxonomy}
                  item={row.item}
                  all={items}
                  lang={lang}
                  copy={copy}
                  errors={errors}
                  metricLabels={metricLabels}
                  onDone={() => setEditingId(null)}
                />
              </div>
            ) : (
              <ItemRow
                key={row.item.id}
                row={row}
                taxonomy={taxonomy}
                lang={lang}
                copy={copy}
                metricLabels={metricLabels}
                reorderable={reorderable}
                onEdit={() => {
                  setCreating(false);
                  setEditingId(row.item.id);
                }}
              />
            ),
          )
        )}
      </Surface>
    </div>
  );
}

/* --------------------------------------------------------------------- row */

function ItemRow({
  row,
  taxonomy,
  lang,
  copy,
  metricLabels,
  reorderable,
  onEdit,
}: {
  row: Row;
  taxonomy: TaxonomyDef;
  lang: Locale;
  copy: TaxonomyEditorCopy;
  metricLabels: Record<MetricKind, string>;
  reorderable: boolean;
  onEdit: () => void;
}) {
  const { item, depth, isFirst, isLast } = row;
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveTaxonomyItemAction(taxonomy.key, item.id, direction);
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await setTaxonomyActiveAction(taxonomy.key, item.id, !item.isActive);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-opacity sm:px-5",
        pending && "opacity-50",
        !item.isActive && "bg-white/2",
      )}
      style={depth ? { paddingInlineStart: "2.25rem" } : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {depth ? (
          <CornerDownRight className="size-3.5 shrink-0 text-ink-500" aria-hidden />
        ) : null}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "truncate text-[14px] font-medium",
                item.isActive ? "text-ink-100" : "text-ink-400 line-through",
              )}
            >
              {translate(item.name, lang)}
            </span>

            {!item.isActive ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {copy.retired}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[11px] text-ink-400">
              {item.slug}
            </code>

            {taxonomy.hasMetrics && item.metrics.length
              ? item.metrics.map((metric) => (
                  <span
                    key={metric}
                    className="rounded-full border border-glow/20 bg-glow/8 px-2 py-0.5 text-[10px] font-medium text-glow"
                  >
                    {metricLabels[metric]}
                  </span>
                ))
              : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          label={copy.moveUp}
          disabled={!reorderable || isFirst || pending}
          onClick={() => move("up")}
        >
          <ChevronUp className="size-4" />
        </IconButton>
        <IconButton
          label={copy.moveDown}
          disabled={!reorderable || isLast || pending}
          onClick={() => move("down")}
        >
          <ChevronDown className="size-4" />
        </IconButton>

        <IconButton
          label={item.isActive ? copy.retire : copy.restore}
          disabled={pending}
          onClick={toggleActive}
          className={item.isActive ? undefined : "text-success hover:text-success"}
        >
          {item.isActive ? <X className="size-4" /> : <RotateCcw className="size-4" />}
        </IconButton>

        <IconButton label={copy.edit} disabled={pending} onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  className,
  children,
  ...props
}: {
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-control text-ink-400",
        "transition-colors hover:bg-white/8 hover:text-ink-100",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- form */

function ItemForm({
  taxonomy,
  item,
  all,
  lang,
  copy,
  errors,
  metricLabels,
  onDone,
}: {
  taxonomy: TaxonomyDef;
  item: EditorItem | null;
  /** Every item in this vocabulary — needed to offer and constrain parents. */
  all: EditorItem[];
  lang: Locale;
  copy: TaxonomyEditorCopy;
  errors: TaxonomyErrorCopy;
  metricLabels: Record<MetricKind, string>;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    item ? updateTaxonomyItemAction : createTaxonomyItemAction,
    TAXONOMY_IDLE,
  );

  // Slug is only proposed while creating; once saved it is frozen, because
  // URLs, seeds and saved filters all point at it.
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  // An item that already has children cannot itself be nested — the tree stays
  // one level deep, so the picker is locked rather than silently rejected.
  const hasChildren = Boolean(item) && all.some((other) => other.parentId === item?.id);
  const parentOptions = all.filter(
    (other) => !other.parentId && other.id !== item?.id,
  );

  return (
    <Surface tone="strong" edge className="p-4 sm:p-5">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="taxonomy" value={taxonomy.key} />
        {item ? <input type="hidden" name="id" value={item.id} /> : null}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ink-50">
            {item ? copy.editTitle : copy.addTitle}
          </h3>
          <button
            type="button"
            onClick={onDone}
            aria-label={copy.cancel}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`name_${locale}`}
              label={`${copy.nameLabel} · ${localeNames[locale]}`}
              defaultValue={item?.name[locale] ?? ""}
              required={locale === "sr"}
              maxLength={80}
              autoComplete="off"
              hint={locale === "sr" ? copy.nameHint : undefined}
              onChange={
                locale === "sr" && !item && !slugTouched
                  ? (event) => setSlug(slugify(event.target.value))
                  : undefined
              }
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {item ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-300">{copy.slug}</span>
              <div className="flex h-12 items-center rounded-control border border-white/8 bg-white/2 px-4">
                <code className="truncate font-mono text-[13px] text-ink-400">
                  {item.slug}
                </code>
              </div>
              <p className="text-[12px] text-ink-500">{copy.slugLocked}</p>
            </div>
          ) : (
            <Field
              name="slug"
              label={copy.slug}
              hint={copy.slugHint}
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          )}

          {taxonomy.hasParent ? (
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-300">{copy.parent}</span>
              <select
                name="parentId"
                defaultValue={item?.parentId ?? ""}
                disabled={hasChildren}
                className={cn(fieldControl, "appearance-none")}
              >
                <option value="">{copy.parentNone}</option>
                {parentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {translate(parent.name, lang)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {taxonomy.hasMetrics ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[13px] font-medium text-ink-300">
              {copy.metrics}
            </legend>
            <p className="text-[12px] text-ink-500">{copy.metricsHint}</p>

            <div className="mt-1 flex flex-wrap gap-2">
              {METRIC_KINDS.map((metric) => (
                <label
                  key={metric}
                  className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-2 text-[13px] text-ink-300 transition-colors hover:border-white/20 has-checked:border-brand-500/40 has-checked:bg-brand-500/14 has-checked:text-brand-100"
                >
                  <input
                    type="checkbox"
                    name="metrics"
                    value={metric}
                    defaultChecked={item?.metrics.includes(metric) ?? false}
                    className="size-4 accent-brand-500"
                  />
                  {metricLabels[metric]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {state.status === "error" && state.code ? (
          <p
            role="alert"
            className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
          >
            {errors[state.code]}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {copy.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    </Surface>
  );
}

/* ------------------------------------------------------------------ layout */

function flat(items: EditorItem[]): Row[] {
  return items.map((item, index) => ({
    item,
    depth: 0,
    isFirst: index === 0,
    isLast: index === items.length - 1,
  }));
}

/**
 * Parents in order, each followed by its own children. First/last is computed
 * per sibling list so an arrow never moves a child out of its branch.
 */
function tree(items: EditorItem[]): Row[] {
  const roots = items.filter((item) => !item.parentId);
  const rows: Row[] = [];

  roots.forEach((root, index) => {
    rows.push({
      item: root,
      depth: 0,
      isFirst: index === 0,
      isLast: index === roots.length - 1,
    });

    const children = items.filter((item) => item.parentId === root.id);
    children.forEach((child, childIndex) => {
      rows.push({
        item: child,
        depth: 1,
        isFirst: childIndex === 0,
        isLast: childIndex === children.length - 1,
      });
    });
  });

  return rows;
}
