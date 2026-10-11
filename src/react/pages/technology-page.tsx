import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { LAND_CATEGORIES, UNIT_CATEGORIES, type UnitCategory } from '../../domain/enums/unit-category.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import type { RosterStep } from '../../services/game-catalog/game-catalog-service.ts';
import { BackLink } from '../components/back-link.tsx';
import { Forge } from '../components/forge.tsx';
import { GameIcon } from '../components/game-icon.tsx';
import { LineChain } from '../components/line-chain.tsx';
import { PageMeta } from '../components/page-meta.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { SegmentedControl } from '../components/segmented-control.tsx';
import { describeEffect } from '../effect-description.ts';
import { iconUrl, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import { isRosterView, type RosterView } from '../roster-view.ts';
import { NotFoundPage } from './not-found-page.tsx';

const TABS = ['units', 'civs'] as const;

type TabKey = (typeof TABS)[number];

function isTabKey(value: string | null): value is TabKey {
    return TABS.includes((value ?? '') as TabKey);
}

/** Land categories first, in the order the browse screen uses, then whatever else a technology reaches. */
const CATEGORY_ORDER: readonly UnitCategory[] = [
    ...LAND_CATEGORIES,
    ...UNIT_CATEGORIES.filter((category) => !LAND_CATEGORIES.includes(category)),
];

interface EffectGroup {
    effects: string[];
    units: Unit[];
}

interface TouchedLine {
    line: string;
    category: UnitCategory;
    steps: RosterStep[][];
}

interface CategoryLines {
    category: UnitCategory;
    chains: TouchedLine[];
    standalone: RosterStep[][];
}

interface LineGroup {
    /** The change every line in the group gets, as the chips say it. */
    effects: string[];
    categories: CategoryLines[];
    /** How many units the group reaches, which is what the groups are ordered by. */
    reach: number;
}

/** Technology profile: what it costs, every unit it changes, and who gets to research it. */
export function TechnologyPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const [params, setParams] = useSearchParams();
    const { catalog, upgrades } = useServices();
    const text = useGameText();

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
    const effectsOf = useMemo(
        () =>
            new Map(
                changed.map((entry) => [entry.unit.key, entry.qualitative ? [] : describeEffect(entry.delta, t)]),
            ),
        [changed, t],
    );

    // Bloodlines reaches eighty-three units with the same twenty hit points; that is one fact, not
    // eighty-three rows, so the units are gathered under the change they share.
    const groups = useMemo(() => {
        const byEffect = new Map<string, EffectGroup>();

        for (const entry of changed) {
            const effects = effectsOf.get(entry.unit.key) ?? [];
            const key = effects.join('|');
            const group = byEffect.get(key) ?? { effects, units: [] };
            group.units.push(entry.unit);
            byEffect.set(key, group);
        }

        return [...byEffect.values()].sort((left, right) => right.units.length - left.units.length);
    }, [changed, effectsOf]);

    // The same units as the lines they belong to, gathered under the change they share the same
    // way, with the steps the technology skips faded out: a reader sees the whole Knight line
    // rather than three names that happen to be related.
    const lines = useMemo<LineGroup[]>(() => {
        const touched = new Set(changed.map((entry) => entry.unit.key));
        const byEffect = new Map<string, { effects: string[]; lines: TouchedLine[]; reach: number }>();

        for (const line of new Set(changed.map((entry) => entry.unit.line))) {
            const steps = catalog
                .upgradeSteps(line)
                .map((step) => step.map((unit) => ({ unit, available: touched.has(unit.key) })));
            const reached = steps.flat().filter((step) => step.available).map((step) => step.unit);
            // A line changed one way at one step and another way further along is filed under both.
            const effects = [...new Set(reached.flatMap((unit) => effectsOf.get(unit.key) ?? []))];
            const key = effects.join('|');
            const group = byEffect.get(key) ?? { effects, lines: [], reach: 0 };
            group.lines.push({ line, category: reached[0].category, steps });
            group.reach += reached.length;
            byEffect.set(key, group);
        }

        return [...byEffect.values()]
            .sort((left, right) => right.reach - left.reach)
            .map((group) => ({
                effects: group.effects,
                reach: group.reach,
                categories: CATEGORY_ORDER.map((category) => {
                    const members = group.lines.filter((line) => line.category === category);

                    return {
                        category,
                        chains: members.filter((line) => line.steps.length > 1),
                        standalone: members.filter((line) => line.steps.length === 1).flatMap((line) => line.steps),
                    };
                }).filter((bucket) => bucket.chains.length > 0 || bucket.standalone.length > 0),
            }));
    }, [catalog, changed, effectsOf]);

    const hasGaps = lines.some((group) =>
        group.categories.some((bucket) =>
            [...bucket.chains.flatMap((line) => line.steps), ...bucket.standalone].some((step) =>
                step.some((entry) => !entry.available),
            ),
        ),
    );

    const faster = technology ? upgrades.productionSpeed(technology.key) : 1;

    const civilizations = useMemo(
        () =>
            (technology?.civs ?? [])
                .map((civ) => ({ key: civ, name: text.civilization(civ).name }))
                .sort((left, right) => left.name.localeCompare(right.name)),
        [technology, text],
    );

    if (!technology) return <NotFoundPage />;

    const technologyText = text.technology(technology.key);
    const tab: TabKey = isTabKey(params.get('tab')) ? (params.get('tab') as TabKey) : 'units';
    const view: RosterView = isRosterView(params.get('view')) ? (params.get('view') as RosterView) : 'list';
    const missing = t('tech.notChanged', { tech: technologyText.name });

    // The first tab and the list are the defaults, so an address only says anything for the others.
    const setParam = (name: string, value: string | null) => {
        const search = new URLSearchParams(params);
        if (value === null) search.delete(name);
        else search.set(name, value);
        setParams(search, { replace: true });
    };

    const chips = (effects: string[]) =>
        effects.length === 0 ? (
            <span className="effect-chip effect-chip--muted">{t('upgrades.qualitative')}</span>
        ) : (
            effects.map((effect) => (
                <span key={effect} className="effect-chip">
                    {effect}
                </span>
            ))
        );

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
                    portrait={
                        <GameIcon
                            path={technology.icon === null ? null : `Tech/${technology.icon}.png`}
                            alt=""
                            size="lg"
                        />
                    }
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

            <div className="tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    className="tabs__item"
                    aria-selected={tab === 'units'}
                    onClick={() => { setParam('tab', null); }}
                >
                    {t('tech.changes')}
                    <span className="tabs__count">{changed.length}</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    className="tabs__item"
                    aria-selected={tab === 'civs'}
                    onClick={() => { setParam('tab', 'civs'); }}
                >
                    {t('tech.researchedBy')}
                    <span className="tabs__count">{civilizations.length}</span>
                </button>
            </div>

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
                                onChange={(next) => { setParam('view', next === 'list' ? null : next); }}
                            />
                        )}
                    </div>

                    {changed.length === 0 && faster === 1 ? <p className="prose">{t('tech.changesNoUnit')}</p> : null}

                    {faster === 1 ? null : (
                        <p className="card__hint">{t('tech.trainsFaster', { value: short((faster - 1) * 100) })}</p>
                    )}

                    {view === 'list'
                        ? groups.map((group) => (
                              <div key={group.effects.join('|')} className="roster__group">
                                  <div className="upgrade-item__effects">{chips(group.effects)}</div>
                                  <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                                      {group.units.map((unit) => (
                                          <Link key={unit.key} className="chip" to={`/unit/${unit.key}`}>
                                              <GameIcon
                                                  path={unit.icon === null ? null : `Unit/${unit.icon}.png`}
                                                  alt=""
                                                  size="sm"
                                              />
                                              {text.unit(unit.key).name}
                                          </Link>
                                      ))}
                                  </div>
                              </div>
                          ))
                        : lines.map((group) => (
                              <div key={group.effects.join('|')} className="roster__group">
                                  <div className="upgrade-item__effects">{chips(group.effects)}</div>
                                  {group.categories.map((bucket) => (
                                      <div className="tech-lines" key={bucket.category}>
                                          <div className="section-label roster__label">
                                              {t(`categories.${bucket.category}`)}
                                          </div>
                                          <div className="list">
                                              {bucket.chains.map((line) => (
                                                  <LineChain key={line.line} steps={line.steps} missing={missing} />
                                              ))}
                                              {bucket.standalone.length > 0 ? (
                                                  <LineChain steps={bucket.standalone} missing={missing} standalone />
                                              ) : null}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ))}

                    {view === 'lines' && hasGaps ? (
                        <p className="card__hint roster__hint">{t('tech.linesHint', { tech: technologyText.name })}</p>
                    ) : null}
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
