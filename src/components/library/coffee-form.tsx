"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, inputClass } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/ui/tag-input";
import { countryOptions } from "@/lib/countries";
import { COFFEE_KINDS, PROCESS_METHODS, ROAST_LEVELS } from "@/features/library/schema";
import {
  createCoffee,
  updateCoffee,
  type LibraryActionState,
} from "@/features/library/actions";
import type { CoffeeKind, CoffeeListItem, ProcessMethod, RoastLevel } from "@/types/database";

type OriginDraft = {
  country_code: string;
  region: string;
  producer: string;
  farm: string;
  altitude_masl: string;
};

const emptyOrigin: OriginDraft = {
  country_code: "",
  region: "",
  producer: "",
  farm: "",
  altitude_masl: "",
};

function toDrafts(coffee?: CoffeeListItem): OriginDraft[] {
  const origins = coffee && Array.isArray(coffee.origins) ? coffee.origins : [];
  if (origins.length === 0) return [{ ...emptyOrigin }];
  return origins.map((origin) => ({
    country_code: origin.country_code,
    region: origin.region ?? "",
    producer: origin.producer ?? "",
    farm: origin.farm ?? "",
    altitude_masl: origin.altitude_masl != null ? String(origin.altitude_masl) : "",
  }));
}

function toExtraPairs(coffee?: CoffeeListItem): { key: string; value: string }[] {
  const extra = coffee?.extra;
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return [];
  return Object.entries(extra as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
}

export function CoffeeForm({ coffee, photoUrl }: { coffee?: CoffeeListItem; photoUrl?: string | null }) {
  const t = useTranslations("library");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const isEdit = Boolean(coffee);
  const action = isEdit ? updateCoffee : createCoffee;
  const [state, formAction, pending] = useActionState<LibraryActionState, FormData>(action, {});

  const [kind, setKind] = useState<CoffeeKind>(coffee?.kind ?? "single_origin");
  const [origins, setOrigins] = useState<OriginDraft[]>(() => toDrafts(coffee));
  const [body, setBody] = useState(coffee?.body ?? 3);
  const [acidity, setAcidity] = useState(coffee?.acidity ?? 3);
  const [notes, setNotes] = useState<string[]>(coffee?.tasting_notes ?? []);
  const [flavors, setFlavors] = useState<string[]>(coffee?.complementary_flavors ?? []);
  const [extraPairs, setExtraPairs] = useState(() => toExtraPairs(coffee));

  const countries = useMemo(() => countryOptions(locale), [locale]);

  // Un single origin es, por definición, un solo origen.
  const visibleOrigins = kind === "single_origin" ? origins.slice(0, 1) : origins;

  function updateOrigin(index: number, patch: Partial<OriginDraft>) {
    setOrigins((current) =>
      current.map((origin, i) => (i === index ? { ...origin, ...patch } : origin)),
    );
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-8">
      {isEdit && (
        <>
          <input type="hidden" name="id" value={coffee!.id} />
          <input type="hidden" name="slug" value={coffee!.slug} />
        </>
      )}

      {state.error && (
        <p role="alert" className="rounded-xl border border-terracota/40 bg-terracota/10 px-4 py-3 text-sm text-terracota">
          {state.error}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <Field label={t("fields.name")} htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={coffee?.name} required maxLength={160} />
        </Field>

        <Field label={t("fields.kind")} htmlFor="kind">
          <Select
            id="kind"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as CoffeeKind)}
          >
            {COFFEE_KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`kind.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-bosque">{t("fields.origins")}</h2>

        {visibleOrigins.map((origin, index) => (
          <div key={index} className="rounded-card flex flex-col gap-3 border border-borde bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.country")} htmlFor={`country-${index}`}>
                <Select
                  id={`country-${index}`}
                  name={`origins.${index}.country_code`}
                  value={origin.country_code}
                  onChange={(event) => updateOrigin(index, { country_code: event.target.value })}
                  required
                >
                  <option value="">—</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("fields.region")} htmlFor={`region-${index}`}>
                <Input
                  id={`region-${index}`}
                  name={`origins.${index}.region`}
                  value={origin.region}
                  onChange={(event) => updateOrigin(index, { region: event.target.value })}
                />
              </Field>

              <Field label={t("fields.producer")} htmlFor={`producer-${index}`}>
                <Input
                  id={`producer-${index}`}
                  name={`origins.${index}.producer`}
                  value={origin.producer}
                  onChange={(event) => updateOrigin(index, { producer: event.target.value })}
                />
              </Field>

              <Field label={t("fields.farm")} htmlFor={`farm-${index}`}>
                <Input
                  id={`farm-${index}`}
                  name={`origins.${index}.farm`}
                  value={origin.farm}
                  onChange={(event) => updateOrigin(index, { farm: event.target.value })}
                />
              </Field>

              <Field label={t("fields.altitude")} htmlFor={`altitude-${index}`}>
                <Input
                  id={`altitude-${index}`}
                  name={`origins.${index}.altitude_masl`}
                  type="number"
                  min={0}
                  max={4000}
                  value={origin.altitude_masl}
                  onChange={(event) => updateOrigin(index, { altitude_masl: event.target.value })}
                />
              </Field>
            </div>

            {kind === "blend" && visibleOrigins.length > 1 && (
              <button
                type="button"
                onClick={() => setOrigins((current) => current.filter((_, i) => i !== index))}
                className="self-start text-sm text-terracota underline underline-offset-4"
              >
                {t("form.removeOrigin")}
              </button>
            )}
          </div>
        ))}

        {kind === "blend" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setOrigins((current) => [...current, { ...emptyOrigin }])}
          >
            {t("form.addOrigin")}
          </Button>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.roast")} htmlFor="roast">
          <Select id="roast" name="roast" defaultValue={coffee?.roast ?? ""}>
            <option value="">{t("form.notSet")}</option>
            {ROAST_LEVELS.map((value: RoastLevel) => (
              <option key={value} value={value}>
                {t(`roast.${value}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("fields.process")} htmlFor="process">
          <Select id="process" name="process" defaultValue={coffee?.process ?? ""}>
            <option value="">{t("form.notSet")}</option>
            {PROCESS_METHODS.map((value: ProcessMethod) => (
              <option key={value} value={value}>
                {t(`process.${value}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={`${t("fields.body")} · ${body}/5`} hint={t("scale.body")}>
          <input type="hidden" name="body" value={body} />
          <Slider value={body} onValueChange={setBody} aria-label={t("fields.body")} />
        </Field>

        <Field label={`${t("fields.acidity")} · ${acidity}/5`} hint={t("scale.acidity")}>
          <input type="hidden" name="acidity" value={acidity} />
          <Slider value={acidity} onValueChange={setAcidity} aria-label={t("fields.acidity")} />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <Field label={t("fields.story")} htmlFor="story">
          <Textarea id="story" name="story" defaultValue={coffee?.story ?? ""} rows={5} />
        </Field>

        <Field label={t("fields.tastingNotes")} hint={t("form.tagsHint")}>
          <TagInput name="tasting_notes" value={notes} onChange={setNotes} />
        </Field>

        <Field label={t("fields.complementaryFlavors")} hint={t("form.tagsHint")}>
          <TagInput name="complementary_flavors" value={flavors} onChange={setFlavors} />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-bosque">{t("fields.extra")}</h2>
        <p className="text-xs text-tinta-suave">{t("form.extraHint")}</p>

        {extraPairs.map((pair, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} flex-1 basis-40`}
              name="extra.key"
              placeholder="clave"
              value={pair.key}
              onChange={(event) =>
                setExtraPairs((current) =>
                  current.map((p, i) => (i === index ? { ...p, key: event.target.value } : p)),
                )
              }
            />
            <input
              className={`${inputClass} flex-1 basis-40`}
              name="extra.value"
              placeholder="valor"
              value={pair.value}
              onChange={(event) =>
                setExtraPairs((current) =>
                  current.map((p, i) => (i === index ? { ...p, value: event.target.value } : p)),
                )
              }
            />
            <button
              type="button"
              onClick={() => setExtraPairs((current) => current.filter((_, i) => i !== index))}
              className="px-2 text-sm text-terracota underline underline-offset-4"
            >
              {t("form.removeOrigin")}
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setExtraPairs((current) => [...current, { key: "", value: "" }])}
        >
          {t("form.addExtra")}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <Field label={t("fields.photo")} htmlFor="photo" hint={t("form.photoHint")}>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="text-sm text-tinta-suave file:mr-3 file:rounded-lg file:border file:border-borde file:bg-white file:px-3 file:py-2 file:text-sm file:text-tinta"
          />
        </Field>

        {photoUrl && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="size-20 rounded-lg object-cover" />
            <label className="flex items-center gap-2 text-sm text-tinta-suave">
              <input type="checkbox" name="removePhoto" />
              {t("form.removePhoto")}
            </label>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("form.saving") : t("form.save")}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href={coffee ? `/biblioteca/${coffee.slug}` : "/biblioteca"}>
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
