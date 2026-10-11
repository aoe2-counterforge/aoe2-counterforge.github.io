import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { Tabs } from '../components/tabs.tsx';
import { UnitForge } from '../components/unit-forge.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { UnitCountersPanel } from '../components/unit-counters-panel.tsx';
import { UnitEconomyPanel } from '../components/unit-economy-panel.tsx';
import { UnitOverviewPanel } from '../components/unit-overview-panel.tsx';
import { UnitUpgradesPanel } from '../components/unit-upgrades-panel.tsx';
import { buildingNames } from '../building-names.ts';
import { short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useSearchParam } from '../hooks/use-search-param.ts';
import { useUnit } from '../hooks/use-unit.ts';
import { useUnitUpgrades } from '../hooks/use-unit-upgrades.ts';
import { NotFoundPage } from './not-found-page.tsx';
import { BackLink } from '../components/back-link.tsx';
import { PageMeta } from '../components/page-meta.tsx';

const TABS = ['overview', 'counters', 'upgrades', 'economy'] as const;

/** Detail page of a single unit, split into overview, counters, upgrades and economy. */
export function UnitPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const [tab, setTab] = useSearchParam('tab', TABS);
    const unit = useUnit(key);
    const text = useGameText();
    const { preferences } = usePreferences();
    const upgrades = useUnitUpgrades(unit);

    if (!unit || !upgrades) return <NotFoundPage />;

    const unitText = text.unit(unit.key);
    const civName = preferences.civ ? text.civilization(preferences.civ).name : '';
    const unavailable = preferences.civ !== null && !unit.availableTo(preferences.civ);

    return (
        <div className="stack">
            <PageMeta
                title={t('seo.unit.title', { name: unitText.name })}
                description={
                    [unitText.role, unitText.strongVs, unitText.weakVs].filter(Boolean).join(' ') ||
                    t('seo.unit.description', { name: unitText.name })
                }
                name={unitText.name}
                section="units"
            />
            <div className="page-nav">
                <BackLink to="/units" label={t('nav.units')} />
                <Link className="cta" to={`/compare?units=${unit.key}`}>
                    <Icon name="compare" />
                    {t('compare.addToCompare')}
                </Link>
            </div>
            <header className="card">
                <UnitForge
                    unit={unit}
                    name={unitText.name}
                    subtitle={`${t(`categories.${unit.category}`)} · ${buildingNames(unit.buildings, t)}`}
                    meta={
                        <>
                            <span className="badge">{t(`ages.${unit.ageFor(preferences.civ)}`)}</span>
                            {unit.uniqueTo ? (
                                <span className="badge badge--gold">
                                    {t('unit.uniqueTo', { civ: text.civilization(unit.uniqueTo).name })}
                                </span>
                            ) : (
                                <span className="badge">{t('unit.availableIn', { count: unit.civs.length })}</span>
                            )}
                        </>
                    }
                />

                <ResourceCostRow
                    cost={unit.cost}
                    trailing={`${t('unit.trainTime')}: ${t('common.seconds', { value: short(unit.trainTime) })}`}
                />

                {unavailable ? (
                    <p className="verdict verdict--bad" style={{ marginTop: 'var(--space-3)' }}>
                        {t('unit.notAvailable', { civ: civName })}
                    </p>
                ) : null}
            </header>

            <Tabs
                value={tab}
                options={TABS.map((entry) => ({ value: entry, label: t(`unit.tabs.${entry}`) }))}
                onChange={setTab}
            />

            {tab === 'overview' ? <UnitOverviewPanel unit={unit} upgradedStats={upgrades.upgradedStats} /> : null}
            {tab === 'counters' ? <UnitCountersPanel key={unit.key} unit={unit} /> : null}
            {tab === 'upgrades' ? <UnitUpgradesPanel unit={unit} /> : null}
            {tab === 'economy' ? <UnitEconomyPanel unit={unit} /> : null}
        </div>
    );
}
