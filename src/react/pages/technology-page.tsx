import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import type { AgeId } from '../../domain/enums/age.ts';
import { LAND_CATEGORIES, UNIT_CATEGORIES, type UnitCategory } from '../../domain/enums/unit-category.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import type { RosterLine } from '../../services/game-catalog/game-catalog-service.ts';
import { categoryLines, hasGaps, type CategoryLines } from '../category-lines.ts';
import { AgeLabel } from '../components/age-label.tsx';
import { BackLink } from '../components/back-link.tsx';
import { EffectChips } from '../components/effect-chips.tsx';
import { Forge } from '../components/forge.tsx';
import { GameIcon } from '../components/game-icon.tsx';
import { PageMeta } from '../components/page-meta.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { RosterLines } from '../components/roster-lines.tsx';
import { SegmentedControl } from '../components/segmented-control.tsx';
import { Tabs } from '../components/tabs.tsx';
import { describeEffect } from '../effect-description.ts';
import { iconUrl, short, techIconPath, unitIconPath } from '../format.ts';
import { groupBy } from '../group-by.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useSearchParam } from '../hooks/use-search-param.ts';
import { useServices } from '../hooks/use-services.ts';
import { ROSTER_VIEWS } from '../roster-view.ts';
import { NotFoundPage } from './not-found-page.tsx';

const TABS = ['units', 'civs'] as const;

/** Land categories first, in the order the browse screen uses, then whatever else a technology reaches. */
const CATEGORY_ORDER: readonly UnitCategory[] = [
    ...LAND_CATEGORIES,
    ...UNIT_CATEGORIES.filter((category) => !LAND_CATEGORIES.includes(category)),
];

/** A unit the technology changes, with the change in the words the chips show. */
interface TouchedUnit {
    unit: Unit;
    effects: string[];
}

/** An upgrade line the technology reaches somewhere along it. */
interface TouchedLine extends RosterLine {
    category: UnitCategory;
    /** Every change the technology makes along the line. */
    effects: string[];
    /** How many of the line's units it changes. */
    reach: number;
}

/** The units of one age that get the same change. */
interface AgeBucket {
    age: AgeId;
    units: Unit[];
}

interface EffectGroup {
    effects: string[];
    ages: AgeBucket[];
}

interface LineGroup {
    effects: string[];
    categories: CategoryLines[];
}

const effectKey = (effects: readonly string[]) => effects.join('|');

/** Technology profile: what it costs, every unit it changes, and who gets to research it. */
export function TechnologyPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const [tab, setTab] = useSearchParam('tab', TABS);
    const [view, setView] = useSearchParam('view', ROSTER_VIEWS);
    const { catalog, upgrades } = useServices();
    const text = useGameText();
    const { preferences } = usePreferences();

    const technology = useMemo(() => {
        if (!key) return null;

        try {
            return catalog.technology(key);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
    }, [catalog, key]);

    const changed = useMemo(() => (technology ? upgrades.unitsChangedBy(technology) : []), [upgrades, technology]);

    // What each unit gets, in the words the chips show: the same change on two units reads the same.
    const touched = useMemo<TouchedUnit[]>(
        () =>
            changed.map((entry) => ({
                unit: entry.unit,
                effects: entry.qualitative ? [] : describeEffect(entry.delta, t, (unitKey) => text.unit(unitKey).name),
            })),
        [changed, t, text],
    );

    // Bloodlines reaches eighty-three units with the same twenty hit points; that is one fact, not
    // eighty-three rows, so the units are gathered under the change they share, an age at a time.
    const groups = useMemo<EffectGroup[]>(() => {
        // Sorted by the name on screen rather than by slug: a slug order reads as random in any
        // other language, and even in English once a name is abbreviated.
        const byName = (left: Unit, right: Unit) =>
            text.unit(left.key).name.localeCompare(text.unit(right.key).name);

        return groupBy(touched, (entry) => effectKey(entry.effects))
            .sort((left, right) => right.length - left.length)
            .map((members) => {
                const units = members.map((entry) => entry.unit);
                // Filed under the age the chosen civilization reaches each unit in, as the roster lists it.
                const ageOf = (unit: Unit) => unit.ageFor(preferences.civ);
                const ages = groupBy(units, (unit) => String(ageOf(unit)))
                    .map((bucket) => ({ age: ageOf(bucket[0]), units: bucket.sort(byName) }))
                    .sort((left, right) => left.age - right.age);

                return { effects: members[0].effects, ages };
            });
    }, [touched, text, preferences.civ]);

    // The same units as the lines they belong to, gathered under the change they share the same
    // way, with the steps the technology skips faded out: a reader sees the whole Knight line
    // rather than three names that happen to be related.
    const lines = useMemo<LineGroup[]>(() => {
        const effectsOf = new Map(touched.map((entry) => [entry.unit.key, entry.effects]));
        const touchedLines = [...new Set(touched.map((entry) => entry.unit.line))].map((line): TouchedLine => {
            const steps = catalog
                .upgradeSteps(line)
                .map((step) => step.map((unit) => ({ unit, available: effectsOf.has(unit.key) })));
            const reached = steps.flat().filter((step) => step.available).map((step) => step.unit);
            // A line changed one way at one step and another way further along is filed under both.
            const effects = [...new Set(reached.flatMap((unit) => effectsOf.get(unit.key) ?? []))];

            return { line, steps, category: reached[0].category, effects, reach: reached.length };
        });
        const reachOf = (members: readonly TouchedLine[]) => members.reduce((sum, line) => sum + line.reach, 0);

        return groupBy(touchedLines, (line) => effectKey(line.effects))
            .sort((left, right) => reachOf(right) - reachOf(left))
            .map((members) => ({
                effects: members[0].effects,
                categories: CATEGORY_ORDER.map((category) =>
                    categoryLines(category, members.filter((line) => line.category === category)),
                ).filter((bucket) => bucket !== null),
            }));
    }, [catalog, touched]);

    const faster = technology ? upgrades.productionSpeed(technology.key) : 1;
    const quicker = technology ? upgrades.workSpeed(technology.key) : 1;

    const civilizations = useMemo(
        () =>
            (technology?.civs ?? [])
                .map((civ) => ({ key: civ, name: text.civilization(civ).name }))
                .sort((left, right) => left.name.localeCompare(right.name)),
        [technology, text],
    );

    if (!technology) return <NotFoundPage />;

    const technologyText = text.technology(technology.key);
    const missing = t('tech.notChanged', { tech: technologyText.name });
    const gaps = view === 'lines' && lines.some((group) => hasGaps(group.categories));

    return (
        <div className="stack">
            <PageMeta
                title={t('seo.technology.title', { name: technologyText.name })}
                description={`${technologyText.description} ${t('seo.technology.description')}`}
                name={technologyText.name}
                section="technologies"
            />
            <BackLink to="/techs" label={t('nav.technologies')} />
            <header className="card">
                <Forge
                    name={technologyText.name}
                    subtitle={t(`buildings.${technology.building}`, technology.building)}
                    age={technology.age}
                    portrait={<GameIcon path={techIconPath(technology.icon)} alt="" size="lg" />}
                    meta={
                        <span className={technology.isUnique ? 'badge badge--gold' : 'badge'}>
                            {technology.isUnique
                                ? t('tech.uniqueTo', { civ: civilizations[0]?.name ?? '' })
                                : t('tech.civCount', { count: technology.civs.length })}
                        </span>
                    }
                />

                <p className="prose">{technologyText.description}</p>
                <hr className="divider" />
                <ResourceCostRow
                    cost={technology.cost}
                    trailing={t('upgrades.researchTime', { value: short(technology.researchTime) })}
                />
            </header>

            <Tabs
                value={tab}
                options={[
                    { value: 'units', label: t('tech.changes'), count: changed.length },
                    { value: 'civs', label: t('tech.researchedBy'), count: civilizations.length },
                ]}
                onChange={setTab}
            />

            {tab === 'units' ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('tech.changes')}</h2>
                        {changed.length === 0 ? null : (
                            <SegmentedControl
                                label={t('civ.view')}
                                value={view}
                                options={[
                                    { value: 'list', label: t('civ.viewList') },
                                    { value: 'lines', label: t('civ.viewLines') },
                                ]}
                                onChange={setView}
                            />
                        )}
                    </div>

                    {changed.length === 0 && faster === 1 && quicker === 1 ? <p className="prose">{t('tech.changesNoUnit')}</p> : null}

                    {quicker === 1 ? null : (
                        <p className="card__hint">{t('tech.worksFaster', { value: short((quicker - 1) * 100) })}</p>
                    )}

                    {faster === 1 ? null : (
                        <p className="card__hint">{t('tech.trainsFaster', { value: short((faster - 1) * 100) })}</p>
                    )}

                    {gaps ? (
                        <p className="card__hint roster__hint roster__hint--top">
                            {t('tech.linesHint', { tech: technologyText.name })}
                        </p>
                    ) : null}

                    {view === 'list'
                        ? groups.map((group) => (
                              <div key={effectKey(group.effects)} className="roster__group">
                                  <div className="upgrade-item__effects">
                                      <EffectChips effects={group.effects} />
                                  </div>
                                  {group.ages.map((bucket) => (
                                      <div className="tech-ages" key={bucket.age}>
                                          <AgeLabel age={bucket.age} />
                                          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                                              {bucket.units.map((unit) => (
                                                  <Link key={unit.key} className="chip" to={`/unit/${unit.key}`}>
                                                      <GameIcon path={unitIconPath(unit.icon)} alt="" size="sm" />
                                                      {text.unit(unit.key).name}
                                                  </Link>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ))
                        : lines.map((group) => (
                              <div key={effectKey(group.effects)} className="roster__group">
                                  <div className="upgrade-item__effects">
                                      <EffectChips effects={group.effects} />
                                  </div>
                                  <div className="tech-lines">
                                      <RosterLines groups={group.categories} missing={missing} />
                                  </div>
                              </div>
                          ))}
                </section>
            ) : (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('tech.researchedBy')}</h2>
                        <span className="card__hint">{t('tech.civCount', { count: civilizations.length })}</span>
                    </div>
                    <div className="row">
                        {civilizations.map((civ) => (
                            <Link key={civ.key} className="chip" to={`/civ/${civ.key}`}>
                                <img
                                    className="picker__emblem"
                                    src={iconUrl(`Civs/${catalog.civilization(civ.key).icon}.png`)}
                                    alt=""
                                    loading="lazy"
                                />
                                {civ.name}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
