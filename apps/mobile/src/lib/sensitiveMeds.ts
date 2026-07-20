/**
 * Détection heuristique des médicaments « sensibles » : antibiotiques et
 * produits dangereux ou détournables (usage récréatif / drogue). Sert à
 * PRÉ-COCHER la case « original requis » à la validation — le pharmacien
 * reste seul juge et confirme (ou décoche).
 *
 * Basée sur les racines de DCI (dénominations communes internationales) les
 * plus fréquentes en officine, pas sur une liste exhaustive : c'est une aide,
 * pas une autorité.
 */

// Racines/segments d'antibiotiques (INN stems) et familles courantes.
const ANTIBIOTIC_STEMS = [
  'cillin', 'cilline',            // pénicillines : amoxicilline, ampicilline…
  'amoxicill', 'augmentin', 'clamoxyl',
  'cef', 'céf', 'ceph',           // céphalosporines : céfixime, ceftriaxone…
  'floxacin', 'floxacine',        // fluoroquinolones : cipro-, lévo-, ofloxacine
  'mycin', 'mycine',              // macrolides/aminosides : azithro-, érythro-, genta-
  'cyclin', 'cycline',            // cyclines : doxycycline, tétracycline
  'metronidazol', 'métronidazol', 'flagyl',
  'cotrimoxazol', 'bactrim', 'sulfamethoxazol', 'triméthoprim', 'trimethoprim',
  'clindamycin', 'clindamycine', 'vancomycin', 'vancomycine',
  'nitrofuranto', 'fosfomycin', 'fosfomycine', 'rifampicin', 'rifampicine',
  'chloramphenicol', 'chloramphénicol',
];

// Produits dangereux / détournables (opioïdes faibles, benzodiazépines,
// antitussifs codéinés, prégabaline, etc.) — hors stupéfiants stricts.
const DIVERTIBLE_STEMS = [
  'codein', 'codéin', 'codeine',  // codéine (antitussifs, antalgiques)
  'tramadol', 'zaldiar',
  'pregabalin', 'prégabalin', 'lyrica',
  'zolpidem', 'zopiclone', 'stilnox', 'imovane',
  'diazepam', 'diazépam', 'valium', 'bromazepam', 'bromazépam', 'lexomil',
  'alprazolam', 'xanax', 'clonazepam', 'clonazépam', 'rivotril',
  'lorazepam', 'lorazépam', 'temesta', 'ephedrin', 'éphédrin', 'pseudoephedrin',
  'dextromethorphan', 'dextrométhorphan',
];

const ALL_STEMS = [...ANTIBIOTIC_STEMS, ...DIVERTIBLE_STEMS];

/** Le nom de médicament évoque-t-il un produit sensible ? (aide au pré-cochage) */
export function isLikelySensitive(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return false;
  return ALL_STEMS.some((stem) => n.includes(stem));
}
