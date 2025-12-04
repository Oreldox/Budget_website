# Fonctionnalité PIVOT : Liaison Prévisionnel ↔ Réel

## Vue d'ensemble

La fonctionnalité PIVOT permet de lier les **factures réelles** (réalisé) aux **dépenses prévisionnelles** (prévu) pour suivre précisément les écarts budgétaires.

### Exemple d'utilisation

**Scénario :**
- Vous prévoyez un audit Active Directory pour **20 000€**
- La facture arrive avec un montant de **18 500€** du fournisseur "ACME Audit"
- Vous liez la facture à la dépense prévisionnelle
- Le système affiche automatiquement : **Économie de 1 500€** 💚

## Architecture

### 1. Base de données (Prisma Schema)

```prisma
model Invoice {
  // ... champs existants
  linkedForecastExpenseId String?
  linkedForecastExpense   ForecastExpense? @relation(fields: [linkedForecastExpenseId], references: [id], onDelete: SetNull)
}

model ForecastExpense {
  // ... champs existants
  linkedInvoices Invoice[] // Relation inverse
}
```

**Relation :** Une dépense prévisionnelle peut avoir plusieurs factures liées (1:N)

### 2. API Endpoints

#### `PUT /api/invoices/[id]/link-forecast`
Lier ou délier une facture à une dépense prévisionnelle

**Request Body:**
```json
{
  "forecastExpenseId": "cmiq1tder0003fmpsssxqj3hj" // ou null pour délier
}
```

**Response:**
```json
{
  "message": "Facture liée avec succès",
  "invoice": {
    "id": "...",
    "linkedForecastExpenseId": "cmiq1tder0003fmpsssxqj3hj",
    "linkedForecastExpense": {
      "id": "cmiq1tder0003fmpsssxqj3hj",
      "label": "Audit AD prévu",
      "amount": 20000
    }
  }
}
```

#### `GET /api/forecast-expenses?year=2025`
Récupérer les dépenses prévisionnelles avec leurs factures liées

**Response:**
```json
[
  {
    "id": "cmiq1tder0003fmpsssxqj3hj",
    "label": "Audit AD prévu",
    "amount": 20000,
    "linkedInvoices": [
      {
        "id": "...",
        "number": "FAC-2025-001",
        "amount": 18500,
        "vendor": "ACME Audit"
      }
    ]
  }
]
```

## Interface Utilisateur

### 1. Page Factures - Drawer d'édition

Lorsque vous ouvrez une facture pour l'éditer, une nouvelle section apparaît :

**Section "Lien avec Budget Prévisionnel"**

#### État non lié :
```
┌─────────────────────────────────────────────────────┐
│ 🔗 Lien avec Budget Prévisionnel                   │
├─────────────────────────────────────────────────────┤
│ Liez cette facture à une dépense prévisionnelle    │
│ pour suivre les écarts prévu/réalisé                │
│                                                      │
│ [Sélectionner une dépense ▼]  [Lier]               │
└─────────────────────────────────────────────────────┘
```

#### État lié :
```
┌─────────────────────────────────────────────────────┐
│ 🔗 Lien avec Budget Prévisionnel                   │
├─────────────────────────────────────────────────────┤
│ Cette facture est liée à :                          │
│ Audit AD prévu                                      │
│                                                      │
│ Prévu: 20 000€  →  Réel: 18 500€  ↓ 1 500€        │
│                                        [Délier]      │
└─────────────────────────────────────────────────────┘
```

### 2. Page Budget Prévisionnel

#### Vue Cartes
Les dépenses prévisionnelles liées affichent l'indicateur de variance :

```
┌─────────────────────────────────────────────────────┐
│ Audit AD prévu                           20 000€    │
│ Audit Active Directory                              │
│                                                      │
│ Prévu: 20 000€ → Réel: 18 500€ ↓ 1 500€           │
│                                  (en vert)          │
└─────────────────────────────────────────────────────┘
```

#### Vue Liste
Le tableau affiche les variances directement dans la colonne "Nom" :

```
┌────────────────────────────────────────────────────────┐
│ ☐  Nom                          Ligne budgétaire      │
├────────────────────────────────────────────────────────┤
│ ☐  Audit AD prévu               Logiciels             │
│    Prévu: 20 000€ → Réel: 18 500€ ↓ 1 500€           │
└────────────────────────────────────────────────────────┘
```

## Calculs de variance

### Formule
```javascript
const totalRealized = linkedInvoices.reduce((sum, inv) => sum + inv.amount, 0)
const variance = totalRealized - forecastAmount
```

### Affichage
- **Variance négative** (économie) : Texte **vert** avec flèche **↓**
- **Variance positive** (dépassement) : Texte **rouge** avec flèche **↑**

### Exemples
| Prévu | Réel | Variance | Affichage |
|-------|------|----------|-----------|
| 20 000€ | 18 500€ | -1 500€ | 🟢 ↓ 1 500€ |
| 15 000€ | 16 200€ | +1 200€ | 🔴 ↑ 1 200€ |
| 10 000€ | 10 000€ | 0€ | - |

## Tests

### Tests automatisés

Exécuter le script de test :
```bash
npx tsx scripts/test-pivot-feature.ts
```

**Ce script teste :**
1. ✅ Schéma Prisma mis à jour
2. ✅ Relations bidirectionnelles
3. ✅ Liaison facture → dépense
4. ✅ Vérification relation inverse
5. ✅ Calcul de variance
6. ✅ Déliaison
7. ✅ Nettoyage des données

### Tests manuels

1. **Créer une dépense prévisionnelle**
   - Aller sur "Structure Budgétaire"
   - Créer une ligne budgétaire pour 2025
   - Ajouter une dépense prévisionnelle (ex: "Audit AD - 20 000€")

2. **Créer une facture**
   - Aller sur "Factures"
   - Créer une nouvelle facture (ex: "ACME Audit - 18 500€")
   - Année : 2025

3. **Lier la facture**
   - Ouvrir la facture en édition
   - Trouver la section "Lien avec Budget Prévisionnel"
   - Sélectionner la dépense prévisionnelle
   - Cliquer sur "Lier"

4. **Vérifier la variance**
   - Retourner sur "Structure Budgétaire"
   - Année : 2025
   - Trouver la dépense prévisionnelle
   - Vérifier l'affichage de la variance

5. **Délier**
   - Rouvrir la facture
   - Cliquer sur "Délier"
   - Vérifier que la variance n'apparaît plus

## Sécurité

- ✅ Vérification de l'organisation
- ✅ Rôle "viewer" ne peut pas lier/délier
- ✅ Validation des IDs (Zod)
- ✅ Audit logs pour traçabilité

## Performance

- Les `linkedInvoices` sont chargées via `include` dans l'API
- Pas de requêtes N+1
- Calculs de variance côté client (légers)

## Limitations

1. Une facture ne peut être liée qu'à **une seule** dépense prévisionnelle
2. Une dépense prévisionnelle peut avoir **plusieurs** factures liées
3. Les factures et dépenses doivent être de la **même année**
4. Seules les dépenses prévisionnelles de l'année de la facture sont proposées

## Migration

**Pour les bases de données existantes :**

1. Le champ `linkedForecastExpenseId` est **nullable**, donc pas d'impact sur les données existantes
2. Les factures existantes peuvent être liées ultérieurement
3. Aucune migration de données n'est nécessaire

## Support

Pour toute question ou bug, créer une issue sur GitHub avec le label `pivot-feature`.
